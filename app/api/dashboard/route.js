import { NextResponse } from "next/server";
import { getDashboardStats } from "../../../lib/googleSheets";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const dept = searchParams.get("dept") || "";
    const stats = await getDashboardStats({ status, dept });
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
