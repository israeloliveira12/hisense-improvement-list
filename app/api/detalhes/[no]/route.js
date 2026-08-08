import { NextResponse } from "next/server";
import { setPptDetalhesField, formatAjuste } from "../../../../lib/googleSheets";

const CAMPOS_AJUSTE = new Set(["fotoBeforeAjuste", "fotoImprovementAjuste"]);

const CAMPO_PARA_COLUNA = {
  description: "Description",
  expectation: "Expectation",
  abrangency: "Abrangency",
  factory: "Factory Comment",
  hisense: "Hisense Comment",
  fotoBeforeAjuste: "Foto Before Ajuste",
  fotoImprovementAjuste: "Foto Improvement Ajuste",
  // reordenar fotos (arrastar/mover) -- o cliente manda a lista inteira ja
  // na ordem nova, separada por virgula, e isso so regrava a mesma coluna
  // (os 2 primeiros IDs viram as fotos "principais", o resto miniatura).
  fotoBeforeOrdem: "Foto Before",
  fotoImprovementOrdem: "Foto Improvement",
};

export async function PATCH(request, { params }) {
  const { no } = params;

  try {
    const { field, value } = await request.json();
    const coluna = CAMPO_PARA_COLUNA[field];

    if (!coluna) {
      return NextResponse.json({ error: `Campo não editável: ${field}` }, { status: 400 });
    }

    const valorFinal = CAMPOS_AJUSTE.has(field) ? formatAjuste(value) : value;
    await setPptDetalhesField(no, coluna, valorFinal);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
