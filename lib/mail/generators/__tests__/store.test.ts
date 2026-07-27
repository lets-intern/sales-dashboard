// 생성기 정의 저장소 — 로드 시 개별 검증, 시드, 표시 목록.

import { describe, it, expect, vi } from "vitest";
import {
  loadGenerators,
  seedGeneratorsIfEmpty,
  setGeneratorEnabled,
  upsertGenerator,
  visibleGenerators,
  type GeneratorRow,
} from "../store";
import { salesDefinition } from "../seed";
import type { SupabaseClient } from "@supabase/supabase-js";

function clientReturning(rows: GeneratorRow[], error: Error | null = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn().mockReturnValue({ order });
  return {
    client: { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient,
    order,
  };
}

const goodRow = (over: Partial<GeneratorRow> = {}): GeneratorRow => ({
  key: "sales",
  definition: JSON.parse(JSON.stringify(salesDefinition)),
  sort_order: 0,
  enabled: true,
  ...over,
});

describe("loadGenerators", () => {
  it("스키마를 만족하는 정의만 목록에 넣는다", async () => {
    const { client } = clientReturning([goodRow()]);
    const result = await loadGenerators(client);
    expect(result.generators.map((g) => g.key)).toEqual(["sales"]);
    expect(result.broken).toEqual([]);
  });

  it("하나가 깨져도 나머지는 살린다", async () => {
    // 손으로 쓰는 JSON 이라 언젠가 하나는 깨진다. 그때 /mail 전체가 백지가 되면 안 된다.
    const { client } = clientReturning([
      goodRow(),
      goodRow({ key: "broken", definition: { key: "broken" } }),
    ]);
    const result = await loadGenerators(client);
    expect(result.generators.map((g) => g.key)).toEqual(["sales"]);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].key).toBe("broken");
    expect(result.broken[0].errors.length).toBeGreaterThan(0);
  });

  it("깨진 정의의 사유를 사람이 읽을 수 있게 돌려준다", async () => {
    const { client } = clientReturning([
      goodRow({
        key: "dup",
        definition: {
          ...JSON.parse(JSON.stringify(salesDefinition)),
          fields: [
            { id: "a", name: "회사명", type: "text" },
            { id: "b", name: "회사명", type: "text" },
          ],
        },
      }),
    ]);
    const result = await loadGenerators(client);
    expect(result.broken[0].errors.join(" ")).toContain("중복");
  });

  it("조회 에러는 그대로 던진다", async () => {
    const { client } = clientReturning([], new Error("boom"));
    await expect(loadGenerators(client)).rejects.toThrow("boom");
  });
});

describe("visibleGenerators", () => {
  it("감춘 것을 빼고 sort_order 순으로 준다", () => {
    const make = (key: string, sortOrder: number, enabled: boolean) => ({
      key,
      sortOrder,
      enabled,
      definition: salesDefinition,
    });
    const result = visibleGenerators({
      generators: [make("c", 2, true), make("a", 0, true), make("b", 1, false)],
      broken: [],
    });
    expect(result.map((g) => g.key)).toEqual(["a", "c"]);
  });
});

describe("seedGeneratorsIfEmpty", () => {
  function seedClient(count: number) {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const select = vi.fn().mockResolvedValue({ count, error: null });
    return {
      client: {
        from: vi.fn().mockReturnValue({ select, upsert }),
      } as unknown as SupabaseClient,
      upsert,
    };
  }

  it("비어 있으면 기본 3종을 넣는다", async () => {
    const { client, upsert } = seedClient(0);
    expect(await seedGeneratorsIfEmpty(client)).toBe(true);
    const rows = upsert.mock.calls[0][0];
    expect(rows.map((r: { key: string }) => r.key)).toEqual([
      "sales",
      "intern",
      "activity",
    ]);
    expect(rows.map((r: { sort_order: number }) => r.sort_order)).toEqual([0, 1, 2]);
  });

  it("이미 있으면 아무것도 하지 않는다", async () => {
    // 사용자가 고친 정의를 시드가 덮어쓰면 안 된다.
    const { client, upsert } = seedClient(3);
    expect(await seedGeneratorsIfEmpty(client)).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("upsertGenerator", () => {
  it("patch 로 준 값만 함께 저장한다", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as SupabaseClient;

    await upsertGenerator(client, "sales", salesDefinition);
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("sort_order");
    expect(upsert.mock.calls[0][0]).not.toHaveProperty("enabled");

    await upsertGenerator(client, "sales", salesDefinition, {
      sortOrder: 2,
      enabled: false,
    });
    expect(upsert.mock.calls[1][0].sort_order).toBe(2);
    expect(upsert.mock.calls[1][0].enabled).toBe(false);
  });
});

describe("setGeneratorEnabled", () => {
  it("삭제가 아니라 enabled 만 바꾼다", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const client = {
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as SupabaseClient;

    await setGeneratorEnabled(client, "sales", false);
    expect(update.mock.calls[0][0].enabled).toBe(false);
    expect(eq).toHaveBeenCalledWith("key", "sales");
  });
});
