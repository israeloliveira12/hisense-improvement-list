import { NextResponse } from "next/server";
import { addInvestimentoItem } from "../../../lib/googleSheets";

export async function POST(request) {
  try {
    const { no, ...campos } = await request.json();
    if (!no) return NextResponse.json({ error: "no é obrigatório." }, { status: 400 });
    const row = await addInvestimentoItem(no, campos);
    return NextResponse.json({ ok: true, row });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 400 });
  }
}
