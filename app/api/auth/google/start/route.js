import { NextResponse } from "next/server";
import { getAuthUrl } from "../../../../../lib/googleOAuth";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (e) {
    return new Response(String(e.message || e), { status: 500 });
  }
}
