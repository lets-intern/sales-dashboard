// 임시보관함 저장 기록 — 기록·필터.

import { describe, it, expect, vi } from "vitest";
import {
  draftLogFacets,
  filterDraftLogs,
  insertDraftLog,
  localDateKey,
  type DraftLog,
} from "../draftLog";
import type { SupabaseClient } from "@supabase/supabase-js";

function log(over: Partial<DraftLog> = {}): DraftLog {
  return {
    id: 1,
    generator: "sales",
    generator_label: "콜드메일",
    slot: 1,
    slot_name: "템플릿 1",
    counterparty: "연세 IT 미래교육원",
    recipient: "hr@yonsei.ac.kr",
    subject: "[온드미디어 제안]",
    field_values: {},
    created_at: "2026-07-20T05:00:00.000Z",
    ...over,
  };
}

describe("filterDraftLogs", () => {
  const logs = [
    log({ id: 1, counterparty: "연세 IT 미래교육원" }),
    log({
      id: 2,
      generator: "intern",
      generator_label: "무료공고",
      counterparty: "렛츠커리어",
      slot_name: "여름 시즌",
      recipient: "team@letscareer.co.kr",
    }),
    log({
      id: 3,
      generator: "activity",
      generator_label: "대외활동",
      counterparty: "서울시청",
      slot_name: "템플릿 2",
      created_at: "2026-06-01T05:00:00.000Z",
    }),
  ];

  it("조건이 없으면 전부 통과시킨다", () => {
    expect(filterDraftLogs(logs, {})).toHaveLength(3);
  });

  it("생성기로 좁힌다", () => {
    expect(filterDraftLogs(logs, { generator: "intern" }).map((l) => l.id)).toEqual([2]);
  });

  it("템플릿 이름으로 좁힌다", () => {
    expect(filterDraftLogs(logs, { slotName: "여름 시즌" }).map((l) => l.id)).toEqual([2]);
  });

  it("검색어는 상대·받는사람·제목·템플릿을 함께 훑는다", () => {
    expect(filterDraftLogs(logs, { query: "서울시청" }).map((l) => l.id)).toEqual([3]);
    expect(filterDraftLogs(logs, { query: "letscareer" }).map((l) => l.id)).toEqual([2]);
    expect(filterDraftLogs(logs, { query: "여름" }).map((l) => l.id)).toEqual([2]);
  });

  it("검색어는 대소문자를 가리지 않고 앞뒤 공백을 무시한다", () => {
    expect(filterDraftLogs(logs, { query: "  TEAM@LETSCAREER.CO.KR " }).map((l) => l.id)).toEqual([2]);
  });

  it("기간으로 좁힌다(양 끝 포함)", () => {
    expect(filterDraftLogs(logs, { from: "2026-07-01" }).map((l) => l.id)).toEqual([1, 2]);
    expect(filterDraftLogs(logs, { to: "2026-06-30" }).map((l) => l.id)).toEqual([3]);
    expect(
      filterDraftLogs(logs, { from: "2026-06-01", to: "2026-06-01" }).map((l) => l.id)
    ).toEqual([3]);
  });

  it("조건을 겹쳐 쓰면 모두 만족하는 것만 남는다", () => {
    expect(
      filterDraftLogs(logs, { generator: "sales", query: "연세" }).map((l) => l.id)
    ).toEqual([1]);
    expect(
      filterDraftLogs(logs, { generator: "sales", query: "서울시청" })
    ).toHaveLength(0);
  });
});

describe("localDateKey", () => {
  it("UTC 가 아니라 로컬 날짜로 자른다", () => {
    // 한국 시간대에서 2026-07-20 09:00 은 UTC 로 2026-07-20T00:00Z 이다.
    // toISOString 으로 잘랐다면 이 값이 전날로 밀릴 수 있다.
    const iso = new Date(2026, 6, 20, 9, 0, 0).toISOString();
    expect(localDateKey(iso)).toBe("2026-07-20");
  });

  it("자정 직후도 같은 날로 본다", () => {
    const iso = new Date(2026, 6, 20, 0, 30, 0).toISOString();
    expect(localDateKey(iso)).toBe("2026-07-20");
  });

  it("잘못된 값은 빈 문자열", () => {
    expect(localDateKey("nope")).toBe("");
  });
});

describe("draftLogFacets", () => {
  it("기록에 실제로 등장한 생성기·템플릿만 선택지로 만든다", () => {
    const facets = draftLogFacets([
      log({ id: 1, generator: "sales", generator_label: "콜드메일", slot_name: "템플릿 1" }),
      log({ id: 2, generator: "sales", generator_label: "콜드메일", slot_name: "여름 시즌" }),
    ]);
    expect(facets.generators).toEqual([{ key: "sales", label: "콜드메일" }]);
    expect(facets.slotNames).toEqual(["여름 시즌", "템플릿 1"]);
  });

  it("이름 없는 템플릿은 선택지에 넣지 않는다", () => {
    expect(draftLogFacets([log({ slot_name: "" })]).slotNames).toEqual([]);
  });
});

describe("insertDraftLog", () => {
  it("입력한 값 그대로 한 줄 넣는다", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;

    await insertDraftLog(client, {
      generator: "sales",
      generator_label: "콜드메일",
      slot: 3,
      slot_name: "여름 시즌",
      counterparty: "연세 IT 미래교육원",
      recipient: "hr@yonsei.ac.kr",
      subject: "제목",
      field_values: { clientName: "연세 IT 미래교육원" },
    });

    const row = insert.mock.calls[0][0];
    expect(row.generator).toBe("sales");
    expect(row.slot_name).toBe("여름 시즌");
    expect(row.counterparty).toBe("연세 IT 미래교육원");
    expect(row.field_values).toEqual({ clientName: "연세 IT 미래교육원" });
    // id·created_at 은 DB 가 채운다.
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("created_at");
  });

  it("에러는 그대로 던진다(호출 측이 무시할지 결정한다)", async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error("nope") }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      insertDraftLog(client, {
        generator: "sales",
        generator_label: "",
        slot: null,
        slot_name: "",
        counterparty: "",
        recipient: "",
        subject: "",
        field_values: {},
      })
    ).rejects.toThrow("nope");
  });
});
