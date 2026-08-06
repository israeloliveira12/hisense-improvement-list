import { exchangeCodeForTokens } from "../../../../../lib/googleOAuth";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");

  if (err) {
    return new Response(`Autorização cancelada ou negada: ${err}`, { status: 400 });
  }
  if (!code) {
    return new Response("Código de autorização não recebido.", { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return new Response(
        "Recebi um token, mas SEM refresh_token -- isso acontece quando você já autorizou antes.\n\n" +
          "Revogue o acesso em https://myaccount.google.com/permissions (ache o app na lista e remova o acesso), " +
          "depois acesse /api/auth/google/start de novo.",
        { status: 400 }
      );
    }
    return new Response(
      "Autorizado com sucesso!\n\n" +
        "Copie o valor abaixo para a variável GOOGLE_OAUTH_REFRESH_TOKEN na Vercel, depois faça um Redeploy.\n" +
        "NÃO compartilhe esse valor com mais ninguém (equivale a uma senha).\n\n" +
        "----------------------------------------\n" +
        tokens.refresh_token +
        "\n----------------------------------------\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  } catch (e) {
    return new Response(`Erro trocando o código por token: ${e.message}`, { status: 500 });
  }
}
