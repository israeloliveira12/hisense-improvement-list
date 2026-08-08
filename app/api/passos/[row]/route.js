import { NextResponse } from "next/server";
import { updatePassoField, deletePasso } from "../../../../lib/googleSheets";

export async function PATCH(request, { params }) {
  const { row } = params;
  try {
    const { field, value } = await request.json();
    await updatePassoField(row, field, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { row } = params;
  try {
    await deletePasso(row);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 400 });
  }
}
