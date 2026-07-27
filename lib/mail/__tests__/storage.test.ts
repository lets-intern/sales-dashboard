import { describe, it, expect, vi } from "vitest";
import {
  createDebouncer,
  isBlankContent,
  isEmptySlot,
  upsertSlot,
} from "../storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MailSlot } from "../types";

describe("isBlankContent / isEmptySlot (초기화 전 빈 내용 가드)", () => {
  it("빈 문자열·공백·빈 태그·&nbsp;는 blank 로 본다", () => {
    expect(isBlankContent("")).toBe(true);
    expect(isBlankContent(null)).toBe(true);
    expect(isBlankContent(undefined)).toBe(true);
    expect(isBlankContent("   ")).toBe(true);
    expect(isBlankContent("<p></p>")).toBe(true);
    expect(isBlankContent("<p>&nbsp;</p>")).toBe(true);
  });

  it("실제 텍스트가 있으면 blank 가 아니다", () => {
    expect(isBlankContent("안녕")).toBe(false);
    expect(isBlankContent("<p>hi</p>")).toBe(false);
  });

  it("제목·본문이 모두 비면 빈 슬롯", () => {
    expect(isEmptySlot("", "<p></p>")).toBe(true);
    expect(isEmptySlot("제목", "")).toBe(false);
    expect(isEmptySlot("", "<p>본문</p>")).toBe(false);
  });
});

describe("upsertSlot 가드", () => {
  const slotRow: MailSlot = {
    generator: "sales",
    slot: 1,
    subject: "",
    body: "<p></p>",
  };

  function mockClient() {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as SupabaseClient;
    return { client, upsert };
  }

  it("빈 슬롯은 저장하지 않는다(덮어쓰기 방지)", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(client, slotRow);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("force=true 면 빈 슬롯도 저장한다", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(client, slotRow, true);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("내용이 있으면 updated_at 을 채워 upsert 한다", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(client, { ...slotRow, subject: "제목" });
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.subject).toBe("제목");
    expect(typeof arg.updated_at).toBe("string");
  });
});

describe("createDebouncer (300ms 자동 저장)", () => {
  it("같은 키의 연속 호출은 마지막 것만 실행된다", () => {
    vi.useFakeTimers();
    const d = createDebouncer(300);
    const fn = vi.fn();
    d.schedule("k", fn);
    d.schedule("k", fn);
    d.schedule("k", fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("다른 키는 독립적으로 실행된다", () => {
    vi.useFakeTimers();
    const d = createDebouncer(300);
    const a = vi.fn();
    const b = vi.fn();
    d.schedule("a", a);
    d.schedule("b", b);
    vi.advanceTimersByTime(300);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("cancelAll 은 대기 중인 저장을 모두 취소한다", () => {
    vi.useFakeTimers();
    const d = createDebouncer(300);
    const fn = vi.fn();
    d.schedule("k", fn);
    d.cancelAll();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
