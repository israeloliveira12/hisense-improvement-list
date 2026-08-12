import { NextResponse } from "next/server";
import { criarSessaoUploadResumavel } from "../../../../lib/googleDrive";

// Corpo pequeno (so metadados, nunca o arquivo em si) -- devolve a URL de
// upload direto pro Drive. Ver o comentario em lib/googleDrive.js
// (criarSessaoUploadResumavel) pro motivo de existir essa rota separada.
export async function POST(request) {
  try {
    const { filename, mimeType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "filename é obrigatório." }, { status: 400 });
    }
    const uploadUrl = await criarSessaoUploadResumavel(filename, mimeType);
    return NextResponse.json({ uploadUrl });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
