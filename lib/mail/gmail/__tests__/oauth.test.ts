import { describe, it, expect, vi } from "vitest";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  GMAIL_COMPOSE_SCOPE,
  deriveTokenState,
  getGmailTokenState,
  signInWithGoogle,
  LOGGED_OUT_STATE,
} from "../oauth";

// 필요한 필드만 갖춘 세션 목.
function mockSession(partial: Partial<Session>): Session {
  return { provider_token: null, expires_at: undefined, ...partial } as Session;
}

describe("GMAIL_COMPOSE_SCOPE", () => {
  it("gmail.compose 스코프(발송 스코프 아님)", () => {
    expect(GMAIL_COMPOSE_SCOPE).toBe(
      "https://www.googleapis.com/auth/gmail.compose"
    );
    expect(GMAIL_COMPOSE_SCOPE).not.toContain("send");
  });
});

describe("deriveTokenState — 순수 상태 전이", () => {
  it("세션이 없으면 로그아웃 상태", () => {
    expect(deriveTokenState(null)).toEqual(LOGGED_OUT_STATE);
  });

  it("provider_token 이 없으면 로그아웃 상태", () => {
    expect(deriveTokenState(mockSession({ provider_token: null }))).toEqual(
      LOGGED_OUT_STATE
    );
  });

  it("유효 토큰 + 미만료 → isLoggedIn", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const state = deriveTokenState(
      mockSession({ provider_token: "tok-abc", expires_at: future }),
      Date.now()
    );
    expect(state.token).toBe("tok-abc");
    expect(state.isLoggedIn).toBe(true);
    expect(state.isExpired).toBe(false);
  });

  it("토큰은 있으나 만료 시각 지남 → isExpired", () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    const state = deriveTokenState(
      mockSession({ provider_token: "tok-old", expires_at: past }),
      Date.now()
    );
    expect(state.token).toBe("tok-old");
    expect(state.isLoggedIn).toBe(false);
    expect(state.isExpired).toBe(true);
  });

  it("expires_at 미제공이면 만료로 보지 않는다", () => {
    const state = deriveTokenState(
      mockSession({ provider_token: "tok", expires_at: undefined })
    );
    expect(state.isLoggedIn).toBe(true);
    expect(state.isExpired).toBe(false);
  });
});

describe("signInWithGoogle", () => {
  it("google provider + gmail.compose 스코프로 signInWithOAuth 를 호출한다", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const supabase = { auth: { signInWithOAuth } } as unknown as SupabaseClient;
    await signInWithGoogle(supabase, "http://localhost:3000/mail");
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    expect(arg.options.scopes).toBe(GMAIL_COMPOSE_SCOPE);
    expect(arg.options.redirectTo).toBe("http://localhost:3000/mail");
  });

  it("에러 시 throw", async () => {
    const supabase = {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({ error: new Error("nope") }),
      },
    } as unknown as SupabaseClient;
    await expect(signInWithGoogle(supabase)).rejects.toThrow("nope");
  });
});

describe("getGmailTokenState", () => {
  it("세션에서 provider_token 상태를 읽는다", async () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: mockSession({ provider_token: "tok", expires_at: future }),
          },
        }),
      },
    } as unknown as SupabaseClient;
    const state = await getGmailTokenState(supabase);
    expect(state.token).toBe("tok");
    expect(state.isLoggedIn).toBe(true);
  });
});
