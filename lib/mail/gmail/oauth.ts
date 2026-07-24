// Supabase Google OAuth — Gmail compose 스코프 로그인 + provider_token 취득/상태.
// PRD §4.6: signInWithOAuth({provider:'google', scopes:'…/gmail.compose'}) →
// 콜백 후 세션의 provider_token 을 Gmail API(drafts.create) Bearer 로 사용한다.
// provider_token 은 자동 갱신되지 않으므로 만료 시 재로그인으로 처리한다(내부 도구).
//
// SupabaseClient 를 인자로 받아 순수하게 유지하고, 상태 계산(deriveTokenState)은
// 세션 객체만 받는 순수 함수로 분리해 단위 테스트가 가능하게 둔다.

import type { Session, SupabaseClient } from "@supabase/supabase-js";

// Gmail 초안 작성에 필요한 최소 스코프(초안 생성/수정만, 발송 스코프 아님).
export const GMAIL_COMPOSE_SCOPE =
  "https://www.googleapis.com/auth/gmail.compose";

// Google OAuth 로그인 시작(리디렉션). 동의화면은 Internal 전제.
export async function signInWithGoogle(
  supabase: SupabaseClient,
  redirectTo?: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: GMAIL_COMPOSE_SCOPE,
      redirectTo,
      // refresh 토큰 확보 + 매 로그인 시 스코프 재동의(provider_token 재발급).
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export async function signOutGoogle(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// provider_token 상태. isLoggedIn = 유효 토큰 보유, isExpired = 토큰은 있으나 만료.
export interface GmailTokenState {
  token: string | null;
  expiresAt: number | null; // epoch seconds (세션 만료 근사치)
  isLoggedIn: boolean;
  isExpired: boolean;
}

export const LOGGED_OUT_STATE: GmailTokenState = {
  token: null,
  expiresAt: null,
  isLoggedIn: false,
  isExpired: false,
};

// 세션 → 토큰 상태(순수). provider_token 자체의 만료 시각은 세션에 노출되지 않으므로
// 세션 expires_at 을 근사치로 사용하고, 실제 만료는 drafts 호출의 401 로 확정한다.
export function deriveTokenState(
  session: Session | null,
  now: number = Date.now()
): GmailTokenState {
  const token = session?.provider_token ?? null;
  if (!token) return LOGGED_OUT_STATE;
  const expiresAt = session?.expires_at ?? null;
  const isExpired = expiresAt !== null ? expiresAt * 1000 <= now : false;
  return {
    token,
    expiresAt,
    isLoggedIn: !isExpired,
    isExpired,
  };
}

// 현재 세션에서 provider_token 상태를 읽는다.
export async function getGmailTokenState(
  supabase: SupabaseClient
): Promise<GmailTokenState> {
  const { data } = await supabase.auth.getSession();
  return deriveTokenState(data.session);
}
