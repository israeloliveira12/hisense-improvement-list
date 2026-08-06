import { NextResponse } from "next/server";
import { getAcoes } from "../../../lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const acoes = await getAcoes();
    return NextResponse.json({ acoes, geradoEm: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
