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
        // "no-store" de proposito -- ja tivemos foto apagada no Drive continuando
        // a aparecer no site por causa de cache do navegador. Ferramenta interna,
        // baixo trafego -- corretude vale mais que economizar uma chamada de API.
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
