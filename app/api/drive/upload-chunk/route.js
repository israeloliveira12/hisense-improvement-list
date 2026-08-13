import { NextResponse } from "next/server";
import { enviarPedacoResumavel } from "../../../../lib/googleDrive";

// Recebe UM pedaco do arquivo (corpo binario cru, sempre pequeno -- quem
// decide o tamanho do pedaco e o cliente, ver PresentationClient.js) e
// repassa pro Drive server-a-servidor. Ver o comentario em
// lib/googleDrive.js (criarSessaoUploadResumavel) pro motivo de existir
// esse relay em vez do navegador falar direto com o Drive.
export async function POST(request) {
  try {
    const uploadUrl = request.headers.get("x-upload-url");
    const inicio = Number(request.headers.get("x-chunk-start"));
    const total = Number(request.headers.get("x-total-bytes"));
    if (!uploadUrl || Number.isNaN(inicio) || Number.isNaN(total)) {
      return NextResponse.json({ error: "Cabeçalhos de upload inválidos." }, { status: 400 });
    }
    const buffer = Buffer.from(await request.arrayBuffer());
    const resultado = await enviarPedacoResumavel(uploadUrl, buffer, inicio, total);
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
