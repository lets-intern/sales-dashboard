// 생성기 정의(JSON) 계약. 이 파일이 원본이며, DB(mail_generators.definition)에
// 저장되는 JSON 과 1:1 이다. 생성기 추가 = 이 스키마를 만족하는 JSON 한 벌 추가.
//
// 설계 원칙
// 1) 필드 하나 = 플레이스홀더 하나. 필드의 label 이 곧 플레이스홀더 이름이다.
//    ({{회사명}} 을 쓰려면 name 이 "회사명" 인 필드를 만든다.)
//    예외는 period 뿐 — 시작·종료 두 입력이 한 덩어리라 축약형을 함께 낸다.
// 2) 계산식은 없다. 값 변환은 전부 "형식 선택"으로 표현한다(date.format).
// 3) 코드를 고쳐야 하는 건 필드 "타입"을 새로 만들 때뿐이다. 생성기 추가는 데이터.

import { z } from "zod";

// 플레이스홀더로 쓸 수 있는 이름. {{}} 안에 그대로 들어가므로 중괄호·공백을 막는다.
const placeholderName = z
  .string()
  .min(1, "이름은 비워 둘 수 없습니다")
  .max(40, "이름은 40자 이내여야 합니다")
  .refine((v) => !/[{}]/.test(v), "이름에 중괄호({, })는 쓸 수 없습니다")
  .refine((v) => v.trim() === v, "이름 앞뒤에 공백을 둘 수 없습니다");

// state 키. 폼 input 의 id 로 쓰이므로 영숫자로 제한한다.
const fieldId = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "id 는 영문으로 시작하는 영숫자여야 합니다");

// 날짜 표시 형식. computeValues 를 대체하는 유일한 장치다.
// full "2026년 7월 5일" / short "7월5일" / weekday "일요일" / dday "D-3"·"D-Day"·"마감"
export const DATE_FORMATS = ["full", "short", "weekday", "dday"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

// 기간 표시 형식. full "2026년 6월 22일-7월 5일" / compact "2026.06.22-07.05"
export const PERIOD_FORMATS = ["full", "compact"] as const;
export type PeriodFormat = (typeof PERIOD_FORMATS)[number];

const selectOption = z.object({
  // 드롭다운에 보이는 이름
  label: z.string().min(1),
  // 실제로 치환될 값. HTML 을 넣으려면 필드의 rawHtml 을 켠다.
  value: z.string(),
});

const baseField = {
  id: fieldId,
  // 플레이스홀더 이름. {{name}} 으로 치환된다.
  name: placeholderName,
  // 폼에 표시할 라벨. 생략하면 name 을 쓴다.
  // (기존 생성기는 "도달" 로 입력받아 {{도달수}} 로 치환하는 식이라 둘이 다르다.)
  label: z.string().min(1).optional(),
  // 입력칸을 좁게 표시할지
  compact: z.boolean().optional(),
  // 받침에 따라 은/는·이/가·을/를·과/와·으로/로 를 자동 선택할지
  josa: z.boolean().optional(),
  // 값의 HTML 을 이스케이프하지 않고 그대로 삽입할지 (예: <b> 가 든 문구)
  rawHtml: z.boolean().optional(),
};

const fieldDefinition = z.discriminatedUnion("type", [
  z.object({
    ...baseField,
    type: z.literal("text"),
    placeholder: z.string().optional(),
  }),
  z.object({
    ...baseField,
    type: z.literal("email"),
    placeholder: z.string().optional(),
    // 이메일 형식 검증 + 초안 저장 버튼 게이트에 쓸지
    required: z.boolean().optional(),
  }),
  z.object({
    ...baseField,
    type: z.literal("select"),
    options: z.array(selectOption).min(1, "드롭다운은 옵션이 1개 이상이어야 합니다"),
  }),
  z.object({
    ...baseField,
    type: z.literal("date"),
    format: z.enum(DATE_FORMATS).default("short"),
  }),
  z.object({
    // 시작·종료 두 날짜를 한 덩어리로 받는다.
    // name 이 "통계기간" 이면 {{통계기간}} 과 {{통계기간축약}} 을 함께 내보낸다.
    ...baseField,
    type: z.literal("period"),
  }),
]);

export type FieldDefinition = z.infer<typeof fieldDefinition>;

// period 가 만들어 내는 축약형 플레이스홀더 이름 규칙.
export const COMPACT_SUFFIX = "축약";
export const compactPlaceholder = (label: string) => `${label}${COMPACT_SUFFIX}`;

export const generatorDefinition = z
  .object({
    // 저장 네임스페이스. 슬롯·기본값·폼값이 이 키로 분리된다.
    key: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/, "key 는 영소문자·숫자·하이픈만 쓸 수 있습니다"),
    // 탭에 표시될 이름
    label: z.string().min(1, "탭 이름을 입력하세요"),
    // 공장 기본 제목·본문. 사용자가 "기본값 저장"으로 덮으면 그 값이 우선한다.
    baseSubject: z.string(),
    baseBody: z.string(),
    fields: z.array(fieldDefinition).min(1, "필드가 최소 1개 필요합니다"),
    // 수신자 입력 위치. panel = 값 입력 폼 안, gmail = Gmail 초안 패널
    recipient: z
      .object({
        placement: z.enum(["panel", "gmail"]),
        validated: z.boolean(),
      })
      .default({ placement: "gmail", validated: false }),
    // 첨부 종류. files = 파일 첨부, image = 본문 인라인 이미지 1장
    attachment: z
      .object({
        kind: z.enum(["files", "image"]).nullable(),
        placeholderText: z.string().optional(),
      })
      .default({ kind: null }),
  })
  .superRefine((def, ctx) => {
    // 플레이스홀더 이름이 겹치면 어느 값이 들어갈지 알 수 없다.
    const seen = new Map<string, number>();
    const add = (name: string, index: number, note: string) => {
      if (seen.has(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "name"],
          message: `플레이스홀더 이름 "${name}"이(가) 중복됩니다${note}`,
        });
        return;
      }
      seen.set(name, index);
    };
    def.fields.forEach((f, i) => {
      add(f.name, i, "");
      if (f.type === "period") {
        add(compactPlaceholder(f.name), i, " (period 가 자동으로 만드는 축약형)");
      }
    });

    // 필드 id 중복은 폼 상태가 서로 덮인다.
    const ids = new Set<string>();
    def.fields.forEach((f, i) => {
      if (ids.has(f.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", i, "id"],
          message: `필드 id "${f.id}"가 중복됩니다`,
        });
      }
      ids.add(f.id);
    });
  });

export type GeneratorDefinition = z.infer<typeof generatorDefinition>;

export interface ParseFailure {
  ok: false;
  /** "fields[2].label: 이름에 중괄호는 쓸 수 없습니다" 형태 */
  errors: string[];
}
export type ParseResult =
  | { ok: true; definition: GeneratorDefinition }
  | ParseFailure;

// JSON 문자열 또는 객체를 검증한다. 실패 사유는 사람이 읽을 수 있는 문장으로 돌려준다.
export function parseGeneratorDefinition(input: unknown): ParseResult {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch (e) {
      return { ok: false, errors: [`JSON 형식이 아닙니다: ${(e as Error).message}`] };
    }
  }

  const result = generatorDefinition.safeParse(value);
  if (result.success) return { ok: true, definition: result.data };

  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
