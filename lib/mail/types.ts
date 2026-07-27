// 세일즈 메일 템플릿 생성기 데이터 타입 (supabase/mail_schema.sql 와 1:1)

// 생성기 종류. 콜드메일(sales) / 무료공고(intern) / 대외활동(activity).
export type GeneratorKey = "sales" | "intern" | "activity";

export const GENERATOR_KEYS: readonly GeneratorKey[] = [
  "sales",
  "intern",
  "activity",
];

// 슬롯 번호(1 이상). 개수 고정이 아니며, 행이 존재하는 번호가 곧 존재하는 템플릿이다.
export type SlotNumber = number;

// 최초 진입 시 시드로 만들어 두는 슬롯 번호. 이후 추가/삭제로 달라진다.
export const INITIAL_SLOT_NUMBERS: readonly SlotNumber[] = [1, 2, 3, 4, 5];

// mail_slots: 생성기 × 슬롯별 제목/본문(서식 포함). PK (generator, slot).
export type MailSlot = {
  generator: GeneratorKey;
  slot: number;
  subject: string;
  body: string; // 본문 HTML
  name?: string; // 사용자 지정 이름. 빈 문자열이면 "템플릿 N" 으로 표시한다.
  updated_at?: string;
};

// 슬롯 표시 이름. 사용자가 지정한 이름이 없으면 번호 기반 기본 이름을 쓴다.
export function slotDisplayName(slot: number, name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : `템플릿 ${slot}`;
}

// mail_defaults.kind — 기본값 대상(제목/본문).
export type DefaultKind = "subject" | "body";

// mail_defaults: 사용자 override + 1단계 backup. PK (generator, kind).
// override/backup 은 아직 저장 전이면 null.
export type MailDefault = {
  generator: GeneratorKey;
  kind: DefaultKind;
  override: string | null;
  backup: string | null;
  updated_at?: string;
};

// 폼 값 1벌: { placeholder: value } 형태.
export type FieldValues = Record<string, string>;

// mail_field_values: 생성기별 폼 값 1벌(jsonb). PK (generator).
export type MailFieldValues = {
  generator: GeneratorKey;
  values: FieldValues;
  updated_at?: string;
};

// 성과 이미지 업로드 결과 (Storage: mail-assets 버킷).
export type PerformanceImage = {
  path: string; // 버킷 내 경로
  url: string; // 공개 URL
};
