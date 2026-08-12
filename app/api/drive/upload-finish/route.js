import { NextResponse } from "next/server";
import { appendPptDetalhesFoto } from "../../../../lib/googleSheets";

// Chamada DEPOIS que o navegador ja mandou os bytes do arquivo direto pro
// Drive (ver /api/drive/upload-session) -- aqui so registra a referencia
// (fileId) na planilha, corpo sempre pequeno.
export async function POST(request) {
  try {
    const { no, slot, fileId } = await request.json();
    if (!no || !slot || !fileId) {
      return NextResponse.json({ error: "Parâmetros faltando (no, slot, fileId)." }, { status: 400 });
    }
    if (!["before", "improvement"].includes(slot)) {
      return NextResponse.json({ error: "slot inválido." }, { status: 400 });
    }
    const campo = slot === "before" ? "Foto Before" : "Foto Improvement";
    await appendPptDetalhesFoto(no, campo, fileId);
    return NextResponse.json({ ok: true, fileId });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
