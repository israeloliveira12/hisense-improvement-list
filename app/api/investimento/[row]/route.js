import { NextResponse } from "next/server";
import { updateInvestmentItemField } from "../../../../lib/googleSheets";

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
