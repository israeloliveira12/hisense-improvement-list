import { NextResponse } from "next/server";
import { getAcoes, createAcao } from "../../../lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const acoes = await getAcoes();
    return NextResponse.json({ acoes, geradoEm: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const dados = await request.json();
    const no = await createAcao(dados);
    return NextResponse.json({ ok: true, no });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 400 });
  }
}
