import { NextResponse } from "next/server";
import { setPptDetalhesField } from "../../../../lib/googleSheets";

const CAMPO_PARA_COLUNA = {
  description: "Description",
  expectation: "Expectation",
  abrangency: "Abrangency",
  factory: "Factory Comment",
  hisense: "Hisense Comment",
};

export async function PATCH(request, { params }) {
  const { no } = params;
  const { field, value } = await request.json();
  const coluna = CAMPO_PARA_COLUNA[field];

  if (!coluna) {
    return NextResponse.json({ error: `Campo não editável: ${field}` }, { status: 400 });
  }

  try {
    await setPptDetalhesField(no, coluna, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
