// Modulo SERVIDOR -- upload/leitura de foto de evidencia no Google Drive.
// Usa OAuth2 como o proprio usuario (nao a service account) -- ver
// lib/googleOAuth.js pro motivo (service account nao tem cota de
// armazenamento em conta pessoal). Os arquivos ficam PRIVADOS na conta do
// usuario -- o site serve o conteudo atraves de /api/drive/file/[id], que
// so responde pra quem ja passou pelo gate de senha (protegido pelo
// middleware.js, ja que a rota nao comeca com /login nem /api/login).
import { Readable } from "stream";
import { getAuthorizedDriveClient, getAuthorizedOAuthClient } from "./googleOAuth";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

let _client = null;

function getDrive() {
  if (!_client) {
    _client = getAuthorizedDriveClient();
  }
  return _client;
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

export async function getFileMeta(fileId) {
  const drive = getDrive();
  const res = await drive.files.get({ fileId, fields: "mimeType, name" });
  return res.data;
}

export async function getFileStream(fileId) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return res.data; // Node Readable stream
}
