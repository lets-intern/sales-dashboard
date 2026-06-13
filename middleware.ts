import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

// 비밀번호 게이트를 거치지 않아도 되는 경로
const PUBLIC_PATHS = ["/login", "/api/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isPublic) {
    const password = process.env.APP_PASSWORD || "";
    const expected = password ? await authToken(password) : "";
    const cookie = request.cookies.get(AUTH_COOKIE)?.value;
    if (!password || cookie !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
