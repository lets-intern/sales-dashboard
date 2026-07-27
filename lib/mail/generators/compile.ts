// 생성기 정의(JSON) → GeneratorConfig 변환.
//
// 기존 3종은 computeValues 를 손으로 짠 함수로 갖고 있었다. 그 함수가 실제로 하던 일은
// (1) 영문 state 키를 한글 플레이스홀더로 옮기기 (2) 날짜를 정해진 표기로 바꾸기 뿐이라,
// 필드 label 을 곧 플레이스홀더로 삼고 날짜에 format 을 붙이면 함수가 필요 없어진다.
// 여기서 만드는 computeValues 는 그 규칙을 그대로 적용하는 공용 구현 하나다.

import { dateParts, computeDeadlineInfo, computeStatPeriod } from "../engine/format";
import type { FieldDef, FieldType, GeneratorConfig } from "../configs/types";
import type { GeneratorKey } from "../types";
import {
  alsoName,
  fieldOutputs,
  type DateFormat,
  type FieldDefinition,
  type GeneratorDefinition,
} from "./definition";

// period 필드는 시작·종료 두 입력을 쓴다. state 키는 id 에 접미사를 붙여 만든다.
export const periodStartKey = (id: string) => `${id}Start`;
export const periodEndKey = (id: string) => `${id}End`;

const trim = (v: string | undefined) => (v ?? "").trim();

function formatDate(value: string, format: DateFormat): string {
  if (format === "dday") return computeDeadlineInfo(value).dday;
  const parts = dateParts(value);
  if (format === "full") return parts.full;
  if (format === "weekday") return parts.weekday;
  return parts.short;
}

// 정의 필드 1개 → 폼에 그릴 FieldDef 목록.
// period 만 두 칸(시작/종료)으로 펼쳐지고 나머지는 1:1 이다.
function toFormFields(field: FieldDefinition): FieldDef[] {
  const common = { label: field.label ?? field.name, compact: field.compact };

  switch (field.type) {
    case "select":
      return [
        {
          ...common,
          id: field.id,
          type: "select" as FieldType,
          options: field.options,
        },
      ];
    case "date":
      return [{ ...common, id: field.id, type: "date" as FieldType, compact: true }];
    case "period":
      return [
        {
          ...common,
          id: periodStartKey(field.id),
          label: `${field.label ?? field.name} 시작`,
          type: "date" as FieldType,
          compact: true,
        },
        {
          ...common,
          id: periodEndKey(field.id),
          label: `${field.label ?? field.name} 종료`,
          type: "date" as FieldType,
          compact: true,
        },
      ];
    case "email":
      return [
        {
          ...common,
          id: field.id,
          type: "email" as FieldType,
          placeholder: field.placeholder,
        },
      ];
    default:
      return [
        {
          ...common,
          id: field.id,
          type: "text" as FieldType,
          placeholder: field.placeholder,
        },
      ];
  }
}

// 폼 값(state) → 플레이스홀더 값. config.computeValues 자리에 들어간다.
function buildComputeValues(fields: FieldDefinition[]) {
  return (state: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};

    for (const field of fields) {
      // 입력 전용 필드는 치환값을 만들지 않는다.
      if (!field.output) continue;

      switch (field.type) {
        case "date": {
          const value = trim(state[field.id]);
          out[field.name] = formatDate(value, field.format);
          // 같은 날짜를 다른 표기로도 쓰는 경우(예: 마감일의 요일·D-day).
          if (field.also) {
            for (const [format, also] of Object.entries(field.also)) {
              if (also) out[alsoName(also)] = formatDate(value, format as DateFormat);
            }
          }
          break;
        }
        case "period": {
          const period = computeStatPeriod(
            trim(state[periodStartKey(field.id)]),
            trim(state[periodEndKey(field.id)])
          );
          out[field.name] = period.full;
          if (field.also?.compact)
            out[alsoName(field.also.compact)] = period.compact;
          break;
        }
        case "select": {
          // 선택한 옵션의 value 를 그대로 쓴다. 저장된 값이 옵션에 없으면 첫 옵션으로 되돌린다.
          const raw = state[field.id];
          const selected =
            field.options.find((o) => o.value === raw) ?? field.options[0];
          out[field.name] = selected.value;
          // 옵션의 표시 이름도 따로 쓰는 경우(예: 직무명 / 활동분야).
          if (field.also?.label)
            out[alsoName(field.also.label)] = selected.label;
          break;
        }
        default:
          out[field.name] = trim(state[field.id]);
      }
    }

    return out;
  };
}

export function compileGenerator(def: GeneratorDefinition): GeneratorConfig {
  // josa/rawHtml 은 플레이스홀더 단위 속성이다(기본 출력과 부가 출력이 다를 수 있다).
  const outputs = def.fields.flatMap(fieldOutputs);
  const josaVars = outputs.filter((o) => o.josa).map((o) => o.name);
  const rawHtmlKeys = outputs.filter((o) => o.rawHtml).map((o) => o.name);

  return {
    key: def.key as GeneratorKey,
    label: def.label,
    storagePrefix: def.key,
    factorySubject: def.baseSubject,
    factoryBody: def.baseBody,
    josaVars,
    rawHtmlKeys,
    fields: def.fields.flatMap(toFormFields),
    computeValues: buildComputeValues(def.fields),
    recipient: def.recipient,
    attachment: def.attachment,
  };
}

// 정의에서 폼 초기값을 만든다. select 는 첫 옵션, 나머지는 빈 문자열.
export function initialFieldValues(
  def: GeneratorDefinition
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of def.fields) {
    if (field.type === "select") {
      values[field.id] = field.options[0].value;
    } else if (field.type === "period") {
      values[periodStartKey(field.id)] = "";
      values[periodEndKey(field.id)] = "";
    } else {
      values[field.id] = "";
    }
  }
  return values;
}
