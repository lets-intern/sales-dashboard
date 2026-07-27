// 생성기 정의 저장소 (mail_generators).
//
// 로드는 "한 생성기가 깨져도 나머지는 뜬다"를 원칙으로 한다. 손으로 쓰는 JSON 이라
// 언젠가 하나는 깨지는데, 그때 /mail 전체가 백지가 되면 고칠 방법이 없어진다.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseGeneratorDefinition,
  type GeneratorDefinition,
} from "./definition";
import { SEED_DEFINITIONS } from "./seed";

export const GENERATORS_TABLE = "mail_generators";

export interface GeneratorRow {
  key: string;
  definition: unknown;
  sort_order: number;
  enabled: boolean;
  updated_at?: string;
}

export interface LoadedGenerator {
  key: string;
  sortOrder: number;
  enabled: boolean;
  definition: GeneratorDefinition;
}

export interface BrokenGenerator {
  key: string;
  errors: string[];
}

export interface LoadResult {
  generators: LoadedGenerator[];
  /** 스키마를 만족하지 않아 건너뛴 것 — 화면에 경고로 띄운다 */
  broken: BrokenGenerator[];
}

export async function loadGenerators(
  supabase: SupabaseClient
): Promise<LoadResult> {
  const { data, error } = await supabase
    .from(GENERATORS_TABLE)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const rows = (data as GeneratorRow[]) ?? [];
  const generators: LoadedGenerator[] = [];
  const broken: BrokenGenerator[] = [];

  for (const row of rows) {
    const parsed = parseGeneratorDefinition(row.definition);
    if (!parsed.ok) {
      broken.push({ key: row.key, errors: parsed.errors });
      continue;
    }
    generators.push({
      key: row.key,
      sortOrder: row.sort_order,
      enabled: row.enabled,
      definition: parsed.definition,
    });
  }

  return { generators, broken };
}

export async function upsertGenerator(
  supabase: SupabaseClient,
  key: string,
  definition: GeneratorDefinition,
  patch: { sortOrder?: number; enabled?: boolean } = {}
): Promise<void> {
  const row: Record<string, unknown> = {
    key,
    definition,
    updated_at: new Date().toISOString(),
  };
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.enabled !== undefined) row.enabled = patch.enabled;

  const { error } = await supabase
    .from(GENERATORS_TABLE)
    .upsert(row, { onConflict: "key" });
  if (error) throw error;
}

// 생성기를 지우는 대신 감춘다. 슬롯·기본값·저장 기록이 key 로 묶여 있어
// 삭제하면 되돌릴 수 없다.
export async function setGeneratorEnabled(
  supabase: SupabaseClient,
  key: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from(GENERATORS_TABLE)
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

// 테이블이 비어 있으면 기존 3종을 넣는다. 이미 있으면 아무것도 하지 않는다
// (사용자가 고친 정의를 시드가 덮어쓰면 안 된다).
export async function seedGeneratorsIfEmpty(
  supabase: SupabaseClient
): Promise<boolean> {
  const { count, error } = await supabase
    .from(GENERATORS_TABLE)
    .select("key", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return false;

  const rows = SEED_DEFINITIONS.map((definition, index) => ({
    key: definition.key,
    definition,
    sort_order: index,
    enabled: true,
    updated_at: new Date().toISOString(),
  }));
  const { error: insertError } = await supabase
    .from(GENERATORS_TABLE)
    .upsert(rows, { onConflict: "key" });
  if (insertError) throw insertError;
  return true;
}

// 탭에 그릴 목록. enabled 만, sort_order 순.
export const visibleGenerators = (result: LoadResult): LoadedGenerator[] =>
  result.generators
    .filter((g) => g.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
