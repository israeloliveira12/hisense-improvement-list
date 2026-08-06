import { NextResponse } from "next/server";
import { getDashboardStats } from "../../../lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
