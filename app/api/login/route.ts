import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, authToken } from "@/lib/auth";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { ok: false, error: "서버에 비밀번호(APP_PASSWORD)가 설정되어 있지 않아요." },
      { status: 500 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if ((body.password || "") !== password) {
    return NextResponse.json(
      { ok: false, error: "비밀번호가 올바르지 않아요." },
      { status: 401 }
    );
  }

  const token = await authToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
