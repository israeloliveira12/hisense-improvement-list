// Modulo SERVIDOR -- upload/leitura de foto de evidencia no Google Drive.
// Os arquivos ficam PRIVADOS (so a service account tem acesso) -- o site
// serve o conteudo atraves de /api/drive/file/[id], que so responde pra
// quem ja passou pelo gate de senha (protegido pelo middleware.js, ja que
// a rota nao comeca com /login nem /api/login).
import { google } from "googleapis";
import { Readable } from "stream";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

let _client = null;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não configuradas."
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDrive() {
  if (!_client) {
    _client = google.drive({ version: "v3", auth: getAuth() });
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
