// Modulo SERVIDOR -- upload/leitura de foto de evidencia no Google Drive.
// Usa OAuth2 como o proprio usuario (nao a service account) -- ver
// lib/googleOAuth.js pro motivo (service account nao tem cota de
// armazenamento em conta pessoal). Os arquivos ficam PRIVADOS na conta do
// usuario -- o site serve o conteudo atraves de /api/drive/file/[id], que
// so responde pra quem ja passou pelo gate de senha (protegido pelo
// middleware.js, ja que a rota nao comeca com /login nem /api/login).
import { google } from "googleapis";
import { Readable } from "stream";
import { getAuthorizedDriveClient, getAuthorizedOAuthClient } from "./googleOAuth";
import { getServiceAccountAuth } from "./googleAuth";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

let _client = null;

// Cliente OAuth (como o PROPRIO USUARIO). Obrigatorio pra ESCRITA: service
// account nao tem cota de armazenamento em conta pessoal, entao criar
// arquivo so funciona autenticado como o dono da conta.
function getDrive() {
  if (!_client) {
    _client = getAuthorizedDriveClient();
  }
  return _client;
}

let _authLeitura = null;
let _driveLeitura = null;

// Cliente de LEITURA, pela service account (a mesma que ja le a planilha).
//
// Por que separado do de cima: ler nao consome cota nenhuma, entao nao ha
// motivo pra leitura depender do OAuth -- e essa dependencia era um ponto
// de falha recorrente. O refresh token do OAuth expira (apps em modo
// "Testing" do Google perdem o token a cada 7 dias, e ja aconteceu mais de
// uma vez aqui), e quando isso acontecia TODA foto do site sumia de uma
// vez, enquanto a planilha continuava funcionando normalmente -- porque o
// Sheets sempre usou a service account. Passando a leitura pra ca, ver
// foto deixa de depender de um token que expira: a credencial da service
// account e uma chave privada que assina cada chamada na hora.
//
// Requisito: a pasta do Drive precisa estar compartilhada com o e-mail da
// service account (ao menos como Leitor) -- ja esta, e e o que permite
// isso funcionar.
function getAuthLeitura() {
  if (!_authLeitura) {
    _authLeitura = getServiceAccountAuth(["https://www.googleapis.com/auth/drive.readonly"]);
  }
  return _authLeitura;
}

function getDriveLeitura() {
  if (!_driveLeitura) {
    _driveLeitura = google.drive({ version: "v3", auth: getAuthLeitura() });
  }
  return _driveLeitura;
}

// Token de leitura: service account (principal) ou OAuth (reserva).
async function tokenLeitura(usarReserva) {
  if (usarReserva) {
    const { token } = await getAuthorizedOAuthClient().getAccessToken();
    return token;
  }
  const { token } = await getAuthLeitura().getAccessToken();
  return token;
}

// Busca o conteudo do arquivo e devolve a RESPOSTA CRUA do Google, pra
// rota repassar corpo e cabecalhos (Content-Type, Content-Length,
// Accept-Ranges...) exatamente como vieram. Repassar em vez de remontar
// elimina qualquer chance de o tamanho declarado divergir dos bytes
// enviados -- divergencia que faria o navegador recusar a imagem.
// `range`, quando vem, e encaminhado: e o que permite arrastar a linha do
// tempo de um video sem baixar o arquivo inteiro antes.
//
// Tenta DUAS credenciais independentes, nessa ordem: service account (nao
// expira) e, se ela falhar, o OAuth do usuario. E o que garante que
// NENHUMA credencial sozinha derruba as fotos -- foi exatamente isso que
// aconteceu quando servir dependia so do OAuth e o token dele venceu.
// Pra sumir de novo, as duas teriam que falhar ao mesmo tempo.
//
// Atencao ao 404: o Drive responde 404 (nao 403) pra arquivo que existe
// mas que a credencial nao enxerga. Ou seja, se a pasta deixar de estar
// compartilhada com a service account, o sintoma e 404 -- por isso o 404
// tambem aciona a reserva, em vez de ser tratado como "arquivo sumiu".
export async function baixarArquivoDrive(fileId, range) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  let resposta = null;
  for (const usarReserva of [false, true]) {
    let token;
    try {
      token = await tokenLeitura(usarReserva);
    } catch (e) {
      continue; // credencial nem configurada/valida -- tenta a proxima
    }
    const headers = { Authorization: `Bearer ${token}` };
    if (range) headers.Range = range;
    try {
      resposta = await fetch(url, { headers });
    } catch (e) {
      continue; // falha de rede -- tenta a proxima credencial
    }
    if (resposta.ok) return resposta;
    // So vale insistir com a outra credencial se o problema for de
    // acesso. 429/5xx e passageiro e quem cuida disso e a retentativa da
    // propria rota.
    if (![401, 403, 404].includes(resposta.status)) return resposta;
    if (!usarReserva) {
      console.error(`[drive] service account falhou em ${fileId} (HTTP ${resposta.status}); tentando OAuth`);
    }
  }
  return resposta;
}

export async function uploadFile(buffer, filename, mimeType) {
  if (!FOLDER_ID) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID não configurada.");
  }
  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: { name: filename, parents: [FOLDER_ID] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });
  return res.data.id;
}

// Cria uma sessao de upload "resumavel" do Drive e devolve so a URL.
// Motivo de existir: toda funcao serverless da Vercel tem um teto de
// ~4.5MB de CORPO DE REQUISICAO (mesmo teto documentado em
// lib/pptBuilder.js pro lado da resposta) -- imposto pela propria
// plataforma, antes do nosso codigo rodar. Quem decide qual caminho usar
// e o TAMANHO do arquivo, nao o tipo (ver uploadFoto em
// components/PresentationClient.js): ate ~4MB tudo passa pelo caminho
// simples de uma requisicao so (uploadFile, acima), que e o mesmo das
// fotos e o mais testado do projeto; acima disso, entra este aqui.
//
// TENTATIVA 1 (revertida): deixar o proprio NAVEGADOR mandar os bytes
// direto pra essa URL. Falhou com "Failed to fetch" -- bem provavelmente
// a sessao (criada pelo NOSSO SERVIDOR, sem nenhum header de CORS na
// requisicao original) nao fica autorizada a aceitar PUT vindo de outra
// origem depois; a API do Drive nao documenta CORS pra upload resumavel
// do mesmo jeito que o Google Cloud Storage documenta, entao nao dava pra
// confiar nisso. TENTATIVA 2 (esta): o navegador manda o arquivo em
// PEDACOS pequenos (bem abaixo do teto de 4.5MB) pra uma rota NOSSA
// (mesma origem, nunca esbarra em CORS), e o SERVIDOR repassa cada pedaco
// pro Drive via chamada servidor-a-servidor (sem restricao de CORS
// nenhuma, e sem o teto de tamanho de requisicao ENTRADA que so vale pra
// requisicao que chega de fora) -- ver enviarPedacoResumavel.
export async function criarSessaoUploadResumavel(filename, mimeType) {
  if (!FOLDER_ID) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID não configurada.");
  }
  const oauthClient = getAuthorizedOAuthClient();
  const { token } = await oauthClient.getAccessToken();
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType || "application/octet-stream",
    },
    body: JSON.stringify({ name: filename, parents: [FOLDER_ID] }),
  });
  if (!res.ok) {
    // Corpo da resposta junto: o Google explica o motivo real ali
    // (escopo, cota, pasta inexistente...). So o status deixava o erro
    // indecifravel do lado do usuario.
    const detalhe = await res.text().catch(() => "");
    throw new Error(`Falha ao iniciar upload resumável no Drive (HTTP ${res.status}): ${detalhe.slice(0, 300)}`);
  }
  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    throw new Error("O Drive não devolveu a URL de upload.");
  }
  return uploadUrl;
}

// Manda UM pedaco do arquivo pra sessao de upload resumavel (protocolo
// padrao do Drive/GCS: cabecalho Content-Range dizendo qual faixa de
// bytes esse pedaco cobre e o total). O Drive responde 308 (Resume
// Incomplete) enquanto ainda faltam pedacos, e 200/201 com o recurso do
// arquivo (inclui "id") quando o ultimo pedaco fecha o total declarado.
// Chamada servidor-a-servidor -- sem CORS, sem o teto de corpo de
// requisicao de ENTRADA da Vercel (esse teto e so pra requisicao que
// chega de fora pra dentro da funcao).
export async function enviarPedacoResumavel(uploadUrl, buffer, inicio, totalBytes) {
  const fim = inicio + buffer.length - 1;
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      // NAO mandar "Content-Length" na mao: no fetch do Node (undici) ele
      // e um cabecalho PROIBIDO -- dependendo da versao ele e descartado
      // em silencio ou faz a chamada estourar. O proprio fetch ja calcula
      // e envia o tamanho certo a partir do corpo.
      "Content-Range": `bytes ${inicio}-${fim}/${totalBytes}`,
    },
    body: buffer,
  });
  if (res.status === 308) {
    // 308 = "Resume Incomplete". O Google diz no cabecalho Range quanto
    // ele REALMENTE gravou ("bytes=0-N"), que pode ser menos do que
    // mandamos. Devolver esse ponto e deixar o cliente continuar dali
    // evita o arquivo sair corrompido (antes o cliente sempre avancava o
    // pedaco inteiro, assumindo que tudo tinha sido aceito).
    const range = res.headers.get("range");
    const gravadoAte = range ? Number(range.split("-").pop()) : fim;
    return { completo: false, proximoInicio: Number.isFinite(gravadoAte) ? gravadoAte + 1 : fim + 1 };
  }
  if (res.ok) {
    const data = await res.json();
    return { completo: true, fileId: data.id };
  }
  const detalhe = await res.text().catch(() => "");
  throw new Error(`Falha ao enviar pedaço pro Drive (HTTP ${res.status}): ${detalhe.slice(0, 300)}`);
}

export async function deleteFile(fileId) {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

// "size" entra aqui pra rota de servir poder mandar Content-Length -- sem
// ele o navegador nao tem como saber se recebeu o arquivo inteiro, e uma
// resposta truncada no meio do caminho e guardada no cache como se
// estivesse completa (ver o comentario em app/api/drive/file/[id]).
// Arquivo nativo do Google (Docs/Sheets) nao tem "size"; aqui so entra
// binario enviado pelo site, mas quem usa trata a ausencia mesmo assim.
export async function getFileMeta(fileId) {
  return comReserva((drive) =>
    drive.files.get({ fileId, fields: "mimeType, name, size" }).then((r) => r.data)
  );
}

// Leitura (service account, igual getFileMeta). Usado pelo gerador de
// .pptx de UMA acao, que roda no servidor -- ver lib/pptBuilder.js. Quem
// serve foto pro navegador nao passa por aqui: usa baixarArquivoDrive,
// que repassa a resposta do Google direto.
export async function getFileStream(fileId) {
  return comReserva((drive) =>
    drive.files
      .get({ fileId, alt: "media" }, { responseType: "stream" })
      .then((r) => r.data) // Node Readable stream
  );
}

// Roda `fn` com o cliente de leitura (service account) e, se der erro de
// acesso, repete com o cliente OAuth. Mesma logica de redundancia de
// baixarArquivoDrive -- ver o comentario la pro motivo do 404 entrar na
// lista. Mantem as duas leituras do SDK (metadado e stream) tao
// resistentes quanto a rota que serve foto pro navegador.
async function comReserva(fn) {
  try {
    return await fn(getDriveLeitura());
  } catch (e) {
    const status = e?.code || e?.response?.status;
    if (![401, 403, 404].includes(Number(status))) throw e;
    console.error(`[drive] leitura pela service account falhou (HTTP ${status}); tentando OAuth`);
    return fn(getDrive());
  }
}
