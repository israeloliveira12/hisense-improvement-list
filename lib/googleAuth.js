// Compartilhado por googleSheets.js e googleDrive.js -- monta a credencial
// JWT da service account a partir das variaveis de ambiente, normalizando
// a chave privada de forma tolerante a erros comuns de copiar/colar no
// painel da Vercel (aspas do JSON coladas junto, \n literal em vez de
// quebra de linha de verdade, espaco sobrando nas pontas).
import { google } from "googleapis";

function normalizePrivateKey(raw) {
  let key = (raw || "").trim();
  // se colou o valor com as aspas do JSON incluidas ("-----BEGIN...\n...")
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  // \n literal (2 caracteres) -> quebra de linha de verdade
  key = key.replace(/\\n/g, "\n");
  return key;
}

export function getServiceAccountAuth(scopes) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);

  if (!email || !key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não configuradas."
    );
  }
  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não parece um PEM válido " +
        "(não contém 'BEGIN PRIVATE KEY') -- confira se colou o valor certo, " +
        "sem aspas extras, do campo private_key do JSON da service account."
    );
  }

  return new google.auth.JWT({ email, key, scopes });
}
