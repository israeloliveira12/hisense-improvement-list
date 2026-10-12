import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getServiceAccountAuth } from "../../../lib/googleAuth";
import { getAuthorizedOAuthClient } from "../../../lib/googleOAuth";

// Diagnostico das credenciais que o site usa. Existe por um motivo
// concreto: quando o acesso ao Drive caiu, as fotos sumiram do site em
// silencio e so foram notadas DIAS depois -- nada no site avisava, e o
// erro (404 na imagem) nao dizia que a causa era credencial.
//
// Abrir /api/saude responde em segundos qual credencial esta de pe e qual
// nao esta, sem precisar vasculhar log da Vercel. Fica atras do gate de
// senha, como todo o resto (ver middleware.js).
export const dynamic = "force-dynamic";

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

async function verificar(nome, critico, fn) {
  const inicio = Date.now();
  try {
    const detalhe = await fn();
    return { nome, critico, ok: true, detalhe, ms: Date.now() - inicio };
  } catch (e) {
    return { nome, critico, ok: false, detalhe: String(e?.message || e).slice(0, 300), ms: Date.now() - inicio };
  }
}

// Baixa so o primeiro byte do arquivo: prova que a credencial consegue ler
// CONTEUDO (nao so metadado) sem custo de transferir a foto inteira.
async function lePrimeiroByte(token, fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}`, Range: "bytes=0-0" } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await res.arrayBuffer();
  return "leitura de conteúdo OK";
}

export async function GET() {
  const authSA = getServiceAccountAuth([
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ]);

  // Um arquivo real da pasta serve de cobaia pros testes de leitura.
  let amostra = null;
  const checks = [];

  checks.push(
    await verificar("Planilha (service account)", true, async () => {
      const sheets = google.sheets({ version: "v4", auth: authSA });
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "Improvement List!D4:D5",
      });
      return `leu ${(r.data.values || []).length} linha(s)`;
    })
  );

  checks.push(
    await verificar("Pasta do Drive (service account)", true, async () => {
      const drive = google.drive({ version: "v3", auth: authSA });
      const r = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed=false`,
        fields: "files(id,name)",
        pageSize: 1,
      });
      const f = (r.data.files || [])[0];
      if (!f) throw new Error("pasta vazia ou invisível para a service account");
      amostra = f.id;
      return `pasta visível (ex.: ${f.name})`;
    })
  );

  checks.push(
    await verificar("Ver foto — service account (principal)", true, async () => {
      if (!amostra) throw new Error("sem arquivo de amostra (passo anterior falhou)");
      const { token } = await authSA.getAccessToken();
      return lePrimeiroByte(token, amostra);
    })
  );

  // OAuth nao e critico pra VER foto (so entra como reserva), mas e
  // obrigatorio pra ENVIAR arquivo novo -- service account nao tem cota de
  // armazenamento. Se so este falhar, o site continua mostrando tudo e o
  // que quebra e o upload.
  checks.push(
    await verificar("Enviar arquivo / reserva de leitura (OAuth)", false, async () => {
      if (!amostra) throw new Error("sem arquivo de amostra (passo anterior falhou)");
      const { token } = await getAuthorizedOAuthClient().getAccessToken();
      if (!token) throw new Error("não foi possível obter token");
      return lePrimeiroByte(token, amostra);
    })
  );

  const criticosOk = checks.filter((c) => c.critico).every((c) => c.ok);
  const tudoOk = checks.every((c) => c.ok);
  const oauthRuim = checks.some((c) => !c.critico && !c.ok);

  return NextResponse.json(
    {
      ok: criticosOk,
      resumo: tudoOk
        ? "Tudo certo."
        : criticosOk && oauthRuim
          ? "As fotos continuam aparecendo normalmente, mas ENVIAR arquivo novo vai falhar: " +
            "o token do OAuth venceu. Para renovar, acesse /api/auth/google/start, " +
            "faça login com a conta dona da pasta e atualize GOOGLE_OAUTH_REFRESH_TOKEN na Vercel."
          : "Falha no acesso usado para MOSTRAR as fotos -- veja qual verificação falhou abaixo.",
      verificacoes: checks,
      geradoEm: new Date().toISOString(),
    },
    { status: criticosOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
