// 가변 템플릿(슬롯) — 이름 표시 · 번호 채번 · 이름 변경 · 삭제.

import { describe, it, expect, vi } from "vitest";
import { nextSlotNumber, renameSlot, deleteSlot, upsertSlot } from "../storage";
import { slotDisplayName, INITIAL_SLOT_NUMBERS } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("slotDisplayName", () => {
  it("이름이 없으면 번호 기반 기본 이름을 쓴다", () => {
    expect(slotDisplayName(1)).toBe("템플릿 1");
    expect(slotDisplayName(7, null)).toBe("템플릿 7");
    expect(slotDisplayName(2, "")).toBe("템플릿 2");
    expect(slotDisplayName(3, "   ")).toBe("템플릿 3");
  });

  it("이름이 있으면 앞뒤 공백을 떼고 그대로 쓴다", () => {
    expect(slotDisplayName(1, "1월 콜드메일")).toBe("1월 콜드메일");
    expect(slotDisplayName(1, "  여름 시즌  ")).toBe("여름 시즌");
  });
});

describe("nextSlotNumber", () => {
  it("시드 5개 다음은 6번이다", () => {
    expect(nextSlotNumber([...INITIAL_SLOT_NUMBERS])).toBe(6);
  });

  it("목록이 비면 1번부터 시작한다", () => {
    expect(nextSlotNumber([])).toBe(1);
  });

  it("중간이 비어도 번호를 재사용하지 않는다", () => {
    // 3번을 지운 상태 — 다음은 3이 아니라 6이어야 한다.
    expect(nextSlotNumber([1, 2, 4, 5])).toBe(6);
  });

  it("순서가 뒤섞여 있어도 최대값 기준으로 채번한다", () => {
    expect(nextSlotNumber([4, 1, 9, 2])).toBe(10);
  });
});

describe("renameSlot", () => {
  function mockClient() {
    const eqSlot = vi.fn().mockResolvedValue({ error: null });
    const eqGenerator = vi.fn().mockReturnValue({ eq: eqSlot });
    const update = vi.fn().mockReturnValue({ eq: eqGenerator });
    const client = {
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as SupabaseClient;
    return { client, update, eqGenerator, eqSlot };
  }

  it("이름만 갱신하고 제목·본문은 건드리지 않는다", async () => {
    const { client, update } = mockClient();
    await renameSlot(client, "sales", 2, "1월 콜드메일");
    const patch = update.mock.calls[0][0];
    expect(patch.name).toBe("1월 콜드메일");
    expect(patch).not.toHaveProperty("subject");
    expect(patch).not.toHaveProperty("body");
    expect(typeof patch.updated_at).toBe("string");
  });

  it("generator 와 slot 두 조건으로 대상을 좁힌다", async () => {
    const { client, eqGenerator, eqSlot } = mockClient();
    await renameSlot(client, "intern", 4, "x");
    expect(eqGenerator).toHaveBeenCalledWith("generator", "intern");
    expect(eqSlot).toHaveBeenCalledWith("slot", 4);
  });

  it("에러는 그대로 던진다", async () => {
    const eqSlot = vi.fn().mockResolvedValue({ error: new Error("nope") });
    const client = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ eq: eqSlot }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(renameSlot(client, "sales", 1, "x")).rejects.toThrow("nope");
  });
});

describe("deleteSlot", () => {
  it("generator 와 slot 으로 해당 행만 지운다", async () => {
    const eqSlot = vi.fn().mockResolvedValue({ error: null });
    const eqGenerator = vi.fn().mockReturnValue({ eq: eqSlot });
    const del = vi.fn().mockReturnValue({ eq: eqGenerator });
    const client = {
      from: vi.fn().mockReturnValue({ delete: del }),
    } as unknown as SupabaseClient;

    await deleteSlot(client, "activity", 6);
    expect(eqGenerator).toHaveBeenCalledWith("generator", "activity");
    expect(eqSlot).toHaveBeenCalledWith("slot", 6);
  });
});

describe("upsertSlot 의 name 처리", () => {
  function mockClient() {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as SupabaseClient;
    return { client, upsert };
  }

  it("name 을 넘기지 않으면 이름 컬럼을 건드리지 않는다(자동 저장이 이름을 지우지 않도록)", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(client, {
      generator: "sales",
      slot: 1,
      subject: "제목",
      body: "<p>본문</p>",
    });
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("name");
  });

  it("name 을 넘기면 함께 저장한다", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(client, {
      generator: "sales",
      slot: 6,
      subject: "제목",
      body: "<p>본문</p>",
      name: "여름 시즌",
    });
    expect(upsert.mock.calls[0][0].name).toBe("여름 시즌");
  });

  it("빈 이름('')도 명시하면 저장한다 — 신규 슬롯 시드용", async () => {
    const { client, upsert } = mockClient();
    await upsertSlot(
      client,
      { generator: "sales", slot: 7, subject: "", body: "", name: "" },
      true
    );
    expect(upsert.mock.calls[0][0].name).toBe("");
  });
});
