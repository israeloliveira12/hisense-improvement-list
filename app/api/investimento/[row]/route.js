import { NextResponse } from "next/server";
import { updateInvestmentItemField, deleteInvestimentoItem } from "../../../../lib/googleSheets";

export async function PATCH(request, { params }) {
  const { row } = params;

  try {
    const { field, value } = await request.json();
    await updateInvestmentItemField(row, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// Apagar item de investimento. Pode devolver o campo "Investment" da acao
// pra "No" quando era o ultimo item -- ver deleteInvestimentoItem.
export async function DELETE(request, { params }) {
  const { row } = params;
  try {
    await deleteInvestimentoItem(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 400 });
  }
}
