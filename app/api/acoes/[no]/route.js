import { NextResponse } from "next/server";
import { updateAcaoField } from "../../../../lib/googleSheets";

const CAMPOS_PERMITIDOS = new Set(["item", "dept", "person", "deadline"]);

export async function PATCH(request, { params }) {
  const { no } = params;
  const { field, value } = await request.json();

  if (!CAMPOS_PERMITIDOS.has(field)) {
    return NextResponse.json({ error: `Campo não editável: ${field}` }, { status: 400 });
  }

  try {
    await updateAcaoField(no, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
