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

// Cria uma sessao de upload "resumavel" do Drive e devolve so a URL --
// quem manda os bytes do arquivo pra essa URL e o PROPRIO NAVEGADOR do
// usuario, direto pro Google, sem passar pela nossa funcao serverless.
// Motivo: toda funcao serverless da Vercel tem um teto de ~4.5MB de CORPO
// DE REQUISICAO (mesmo teto documentado em lib/pptBuilder.js pro lado da
// resposta) -- imposto pela propria plataforma, antes do nosso codigo
// rodar, sem jeito de contornar de dentro da funcao. Foto continua indo
// pelo upload antigo (uploadFile, acima) porque e redimensionada no
// navegador antes de enviar e quase sempre fica bem abaixo do teto; video
// e documento nao tem como ser "redimensionados" da mesma forma, entao
// usam esse caminho direto. A URL devolvida ja vem com um token de sessao
// embutido -- o navegador NUNCA precisa (nem pode) ver nossas credenciais
// OAuth de verdade.
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
    throw new Error(`Falha ao iniciar upload resumável no Drive: HTTP ${res.status}`);
  }
  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    throw new Error("O Drive não devolveu a URL de upload.");
  }
  return uploadUrl;
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
