// OAuth2 "de verdade" (como usuário, nao service account) -- so pro Drive.
// Motivo: service accounts nao tem cota de armazenamento propria, e a
// brecha antiga (compartilhar uma pasta normal como Editor) parou de
// funcionar de forma confiavel em contas pessoais do Google (nao-Workspace)
// -- ver erro real "Service Accounts do not have storage quota" recebido
// em producao. A unica solucao pra conta pessoal e o upload acontecer
// autenticado como o proprio usuario (cota dele), via OAuth2 padrao.
// O Sheets continua usando a service account normalmente (lib/googleSheets.js)
// -- essa cota de armazenamento so afeta CRIACAO de arquivo no Drive.
import { google } from "googleapis";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI não configuradas."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // necessario pra ganhar um refresh_token
    prompt: "consent", // forca mostrar consentimento de novo, senao o Google as vezes nao manda refresh_token numa 2a autorizacao
    scope: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function exchangeCodeForTokens(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function getAuthorizedDriveClient() {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_REFRESH_TOKEN não configurada -- acesse /api/auth/google/start uma vez pra autorizar."
    );
  }
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: client });
}
