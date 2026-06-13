// 단순 비밀번호 게이트용 헬퍼.
// 비밀번호 자체는 쿠키에 저장하지 않고, SHA-256 해시 토큰만 저장/비교한다.

export const AUTH_COOKIE = "sd_auth";

// 30일 유지
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30;

// Web Crypto 기반 SHA-256 (Edge 미들웨어 / Node 런타임 모두 동작)
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`sd::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
