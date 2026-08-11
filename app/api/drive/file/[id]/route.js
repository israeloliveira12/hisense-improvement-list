import { getFileStream, getFileMeta } from "../../../../../lib/googleDrive";

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const [meta, stream] = await Promise.all([getFileMeta(id), getFileStream(id)]);
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });
    return new Response(webStream, {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        // Cache FOREVER, de proposito: o ID do arquivo no Drive e imutavel --
        // uma foto nunca e sobrescrita, so trocada por um ID novo (upload) ou
        // removida da lista da acao (delete). Ou seja, um ID sempre aponta pro
        // MESMO conteudo pra sempre; nao ha risco de servir bytes desatualizados
        // pra um ID que ja foi visto antes. O bug antigo que motivou o "no-store"
        // (foto apagada "continuando a aparecer") era resolvido pela propria
        // lista de fotos da acao parar de referenciar o ID no delete -- o cache
        // do navegador nunca foi a causa disso. "private" (nao "public"): so o
        // navegador de quem esta logado guarda, nada de cache compartilhado —
        // continua atras do gate de senha do site.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
