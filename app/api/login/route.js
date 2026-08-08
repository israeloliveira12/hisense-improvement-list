import { NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "hisense_session";

export async function POST(request) {
  let password;
  try {
    ({ password } = await request.json());
  } catch (e) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  const expected = process.env.SITE_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "SITE_PASSWORD não configurada no servidor." },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = crypto.createHash("sha256").update(expected).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
