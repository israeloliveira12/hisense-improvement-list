// Modulo SERVIDOR -- upload/leitura de foto de evidencia no Google Drive.
// Usa OAuth2 como o proprio usuario (nao a service account) -- ver
// lib/googleOAuth.js pro motivo (service account nao tem cota de
// armazenamento em conta pessoal). Os arquivos ficam PRIVADOS na conta do
// usuario -- o site serve o conteudo atraves de /api/drive/file/[id], que
// so responde pra quem ja passou pelo gate de senha (protegido pelo
// middleware.js, ja que a rota nao comeca com /login nem /api/login).
import { Readable } from "stream";
import { getAuthorizedDriveClient } from "./googleOAuth";

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
