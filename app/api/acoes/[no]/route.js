import { NextResponse } from "next/server";
import { updateAcaoField, renameAcaoId, deleteAcao } from "../../../../lib/googleSheets";

const CAMPOS_PERMITIDOS = new Set([
  "item", "dept", "person", "deadline",
  "audit", "process", "occur", "deadlineOriginal", "status", "delayReason",
]);

export async function PATCH(request, { params }) {
  const { no } = params;

  try {
    const { field, value } = await request.json();
    if (field === "no") {
      const novo = await renameAcaoId(no, value);
      return NextResponse.json({ ok: true, no: novo });
    }
    if (!CAMPOS_PERMITIDOS.has(field)) {
      return NextResponse.json({ error: `Campo não editável: ${field}` }, { status: 400 });
    }
    await updateAcaoField(no, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { no } = params;
  try {
    await deleteAcao(no);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
