import { baixarArquivoDrive } from "../../../../../lib/googleDrive";

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Serve foto/video/documento do Drive pro navegador.
//
// Autenticado pela SERVICE ACCOUNT, nao pelo OAuth do usuario (ver
// baixarArquivoDrive em lib/googleDrive.js). Isso e o que conserta o
// problema recorrente de "as fotos pararam de aparecer": o refresh token
// do OAuth expira sozinho de tempos em tempos e, quando expirava, TODA
// foto sumia do site enquanto a planilha seguia normal -- porque o Sheets
// sempre usou a service account. Ler nao consome cota de armazenamento,
// entao nao havia motivo pra essa dependencia existir. Upload continua no
// OAuth, que e onde a cota realmente importa.
//
// A resposta do Google e repassada como veio (corpo + Content-Type +
// Content-Length + suporte a Range). Repassar em vez de remontar evita o
// risco de o tamanho declarado nao bater com os bytes enviados.
export async function GET(request, { params }) {
  const { id } = params;
  const range = request.headers.get("range") || undefined;

  let upstream = null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      upstream = await baixarArquivoDrive(id, range);
    } catch (e) {
      upstream = null; // falha de rede -- tenta de novo abaixo
    }
    if (upstream && upstream.ok) break;
    // 404/403 e definitivo (arquivo nao existe / sem permissao): insistir
    // so atrasaria a resposta. O resto (429, 5xx, queda de rede) costuma
    // ser passageiro e vale uma nova tentativa.
    if (upstream && (upstream.status === 404 || upstream.status === 403)) break;
    if (tentativa < 2) await esperar(250 * (tentativa + 1));
  }

  if (!upstream || !upstream.ok) {
    // "no-store": falha nao pode ficar guardada no navegador, senao a foto
    // continuaria quebrada mesmo depois do Drive voltar ao normal.
    return new Response("Not found", {
      status: upstream?.status === 403 ? 403 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers();
  const copiar = ["content-type", "content-length", "content-range", "accept-ranges"];
  copiar.forEach((h) => {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  });
  if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
  // Cache longo de proposito: o ID do arquivo no Drive e imutavel -- uma
  // foto nunca e sobrescrita, so trocada por um ID novo (upload) ou
  // removida da lista da acao (delete). "private" (nao "public"): so o
  // navegador de quem esta logado guarda, nada de cache compartilhado --
  // continua atras do gate de senha do site.
  headers.set("Cache-Control", "private, max-age=31536000, immutable");

  return new Response(upstream.body, { status: upstream.status, headers });
}
