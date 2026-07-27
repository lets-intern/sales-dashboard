// 세일즈 메일 템플릿 생성기 · Supabase 접근 계층 (순수 데이터 함수).
// 슬롯/기본값/폼값 로드·upsert 와 성과 이미지 Storage 업로드를 담당한다.
// SupabaseClient 를 인자로 받아 서버/클라이언트 어디서든 재사용 가능하게 둔다.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DefaultKind,
  FieldValues,
  GeneratorKey,
  MailDefault,
  MailSlot,
  PerformanceImage,
} from "./types";

// 성과 이미지 Storage 버킷 (supabase/mail_storage.sql 와 동일).
export const MAIL_ASSETS_BUCKET = "mail-assets";

const nowIso = () => new Date().toISOString();

// ── 가드 ──────────────────────────────────────────────────────
// 초기화 전(로드 완료 전) 빈 에디터 내용이 저장된 행을 덮어쓰지 않도록 하는 가드.
// 제목·본문이 모두 비어(공백/빈 태그만) 있으면 "빈 슬롯"으로 본다.
const BLANK_HTML = /<[^>]*>|&nbsp;|\s+/g;
export function isBlankContent(value: string | null | undefined): boolean {
  if (!value) return true;
  return value.replace(BLANK_HTML, "").length === 0;
}
export function isEmptySlot(subject: string, body: string): boolean {
  return isBlankContent(subject) && isBlankContent(body);
}

// ── 슬롯(mail_slots) ─────────────────────────────────────────
export async function loadSlots(
  supabase: SupabaseClient,
  generator: GeneratorKey
): Promise<MailSlot[]> {
  const { data, error } = await supabase
    .from("mail_slots")
    .select("*")
    .eq("generator", generator)
    .order("slot", { ascending: true });
  if (error) throw error;
  return (data as MailSlot[]) ?? [];
}

// 슬롯 저장(upsert). 초기화 전 빈 내용은 저장하지 않는다(가드).
// force=true 로 명시적 저장(예: 슬롯 신규 생성, 사용자가 의도적으로 비운 경우)을 허용한다.
// name 이 undefined 면 이름 컬럼은 건드리지 않는다(내용 자동 저장이 이름을 지우지 않도록).
export async function upsertSlot(
  supabase: SupabaseClient,
  slot: MailSlot,
  force = false
): Promise<void> {
  if (!force && isEmptySlot(slot.subject, slot.body)) return;
  const row: Record<string, unknown> = {
    generator: slot.generator,
    slot: slot.slot,
    subject: slot.subject,
    body: slot.body,
    updated_at: nowIso(),
  };
  if (slot.name !== undefined) row.name = slot.name;
  const { error } = await supabase
    .from("mail_slots")
    .upsert(row, { onConflict: "generator,slot" });
  if (error) throw error;
}

// 슬롯 이름만 변경한다. 내용은 건드리지 않는다.
export async function renameSlot(
  supabase: SupabaseClient,
  generator: GeneratorKey,
  slot: number,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("mail_slots")
    .update({ name, updated_at: nowIso() })
    .eq("generator", generator)
    .eq("slot", slot);
  if (error) throw error;
}

// 슬롯 삭제. 호출 측에서 "마지막 1개는 삭제 불가"를 보장한다.
export async function deleteSlot(
  supabase: SupabaseClient,
  generator: GeneratorKey,
  slot: number
): Promise<void> {
  const { error } = await supabase
    .from("mail_slots")
    .delete()
    .eq("generator", generator)
    .eq("slot", slot);
  if (error) throw error;
}

// 다음에 쓸 슬롯 번호. 기존 번호와 겹치지 않도록 최대값 + 1 을 쓴다.
// (중간이 비어도 재사용하지 않는다 — 번호가 이름 대용으로 읽히는 혼란을 피한다.)
export function nextSlotNumber(existing: readonly number[]): number {
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

// ── 기본값(mail_defaults) ────────────────────────────────────
export async function loadDefaults(
  supabase: SupabaseClient,
  generator: GeneratorKey
): Promise<MailDefault[]> {
  const { data, error } = await supabase
    .from("mail_defaults")
    .select("*")
    .eq("generator", generator);
  if (error) throw error;
  return (data as MailDefault[]) ?? [];
}

// override/backup 저장. 부분 갱신을 위해 현재 값 위에 patch 를 얹어 upsert 한다.
export async function saveDefault(
  supabase: SupabaseClient,
  generator: GeneratorKey,
  kind: DefaultKind,
  patch: { override?: string | null; backup?: string | null }
): Promise<void> {
  const { error } = await supabase.from("mail_defaults").upsert(
    {
      generator,
      kind,
      ...patch,
      updated_at: nowIso(),
    },
    { onConflict: "generator,kind" }
  );
  if (error) throw error;
}

// ── 폼 값(mail_field_values) ─────────────────────────────────
export async function loadFieldValues(
  supabase: SupabaseClient,
  generator: GeneratorKey
): Promise<FieldValues> {
  const { data, error } = await supabase
    .from("mail_field_values")
    .select("values")
    .eq("generator", generator)
    .maybeSingle();
  if (error) throw error;
  return ((data?.values as FieldValues) ?? {}) as FieldValues;
}

export async function saveFieldValues(
  supabase: SupabaseClient,
  generator: GeneratorKey,
  values: FieldValues
): Promise<void> {
  const { error } = await supabase.from("mail_field_values").upsert(
    {
      generator,
      values,
      updated_at: nowIso(),
    },
    { onConflict: "generator" }
  );
  if (error) throw error;
}

// ── 성과 이미지 Storage (mail-assets) ────────────────────────
// 파일을 업로드하고 경로 + 공개 URL 을 반환한다.
export async function uploadPerformanceImage(
  supabase: SupabaseClient,
  generator: GeneratorKey,
  file: File
): Promise<PerformanceImage> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${generator}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(MAIL_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return { path, url: getPerformanceImageUrl(supabase, path) };
}

export function getPerformanceImageUrl(
  supabase: SupabaseClient,
  path: string
): string {
  return supabase.storage.from(MAIL_ASSETS_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

// ── 디바운스 헬퍼 (자동 저장용) ──────────────────────────────
// 키별로 마지막 호출만 delay(기본 300ms) 후 실행한다. flush/cancel 지원.
export type Debouncer = {
  schedule: (key: string, fn: () => void) => void;
  cancel: (key: string) => void;
  cancelAll: () => void;
};

export function createDebouncer(delay = 300): Debouncer {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const cancel = (key: string) => {
    const t = timers.get(key);
    if (t) {
      clearTimeout(t);
      timers.delete(key);
    }
  };
  return {
    schedule(key, fn) {
      cancel(key);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fn();
        }, delay)
      );
    },
    cancel,
    cancelAll() {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    },
  };
}
