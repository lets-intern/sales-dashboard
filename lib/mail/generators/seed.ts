// 기존 3종(콜드메일/무료공고/대외활동)을 생성기 정의(JSON)로 표현한 것.
// DB(mail_generators)가 비었을 때 이 값으로 시드한다.
//
// 기본 제목·본문과 드롭다운 옵션은 기존 config 에서 그대로 참조한다.
// 문구를 여기에 다시 적으면 두 벌이 되어 어긋나므로, 원본은 configs/ 하나로 둔다.
// (시드가 DB 에 들어간 뒤에는 DB 가 원본이 된다.)
//
// 기존 computeValues 가 내보내던 값 중 템플릿이 쓰지 않는 것은 옮기지 않았다.
//   sales:    모집마감일전체 · 마감요일 · 디데이  (본문 사용 0회)
//   intern:   직무명   (select 라벨, 본문 사용 0회)
//   activity: 활동분야 (select 라벨, 본문 사용 0회)
// 렌더 결과가 동일한지는 __tests__/verbatim.test.ts 가 매번 검증한다.

import { salesConfig } from "../configs/sales";
import { internConfig } from "../configs/intern";
import { activityConfig } from "../configs/activity";
import type { FieldOption } from "../configs/types";
import type { GeneratorDefinition } from "./definition";

// 기존 config 의 select 옵션을 그대로 가져온다.
function optionsOf(
  config: { fields: { id: string; options?: FieldOption[] }[] },
  fieldId: string
): FieldOption[] {
  const found = config.fields.find((f) => f.id === fieldId)?.options;
  if (!found) throw new Error(`${fieldId} 옵션을 찾을 수 없습니다`);
  return found;
}

// 통계 지표 8종은 세 생성기 중 intern/activity 가 동일하게 쓴다.
const STAT_FIELDS: GeneratorDefinition["fields"] = [
  { id: "statViews", name: "조회수", type: "text", placeholder: "예: 81.3만 회", compact: true },
  { id: "statReach", name: "도달수", label: "도달", type: "text", placeholder: "예: 9.1만 계정", compact: true },
  { id: "statEngagement", name: "상호작용수", label: "콘텐츠 상호작용", type: "text", placeholder: "예: 1.6만 회", compact: true },
  { id: "rateViews", name: "조회수증가율", label: "조회수 증가율", type: "text", placeholder: "예: 12.5%", compact: true },
  { id: "rateReach", name: "도달증가율", label: "도달 증가율", type: "text", placeholder: "예: 6.1%", compact: true },
  { id: "rateEngagement", name: "상호작용증가율", label: "상호작용 증가율", type: "text", placeholder: "예: 10.2%", compact: true },
  { id: "organicRatio", name: "일반콘텐츠비율", label: "일반콘텐츠 비율", type: "text", placeholder: "예: 98%", compact: true },
  { id: "organicViews", name: "일반콘텐츠조회수", label: "일반콘텐츠 조회수", type: "text", placeholder: "예: 79.8만 회", compact: true },
];

export const salesDefinition: GeneratorDefinition = {
  key: "sales",
  label: "콜드메일",
  baseSubject: salesConfig.factorySubject,
  baseBody: salesConfig.factoryBody,
  fields: [
    { id: "clientName", name: "고객사명", type: "text", placeholder: "예: 연세 IT 미래교육원", josa: true },
    { id: "programName", name: "교육프로그램명", type: "text", placeholder: "예: 노코드 AI 서비스 개발자2기", josa: true },
    { id: "deadline", name: "모집마감일", type: "date", format: "short", compact: true },
    { id: "replyDeadline", name: "회신마감일", type: "date", format: "short", compact: true },
    {
      id: "interestPhrase",
      name: "관심사문구",
      label: "관심사 표현",
      type: "select",
      options: optionsOf(salesConfig, "interestPhrase"),
      compact: true,
      // 옵션 값에 <b> 태그가 들어 있어 이스케이프하면 안 된다.
      rawHtml: true,
    },
    { id: "recipientEmail", name: "받는사람이메일", label: "받는사람 이메일", type: "email", placeholder: "예: hr@company.com", required: true },
  ],
  recipient: { placement: "gmail", validated: true },
  attachment: { kind: "files" },
};

export const internDefinition: GeneratorDefinition = {
  key: "intern",
  label: "무료공고",
  baseSubject: internConfig.factorySubject,
  baseBody: internConfig.factoryBody,
  fields: [
    { id: "companyName", name: "회사명", type: "text", placeholder: "예: 렛츠커리어", josa: true },
    {
      id: "jobFieldReason",
      name: "선정이유",
      label: "직무 분야",
      type: "select",
      options: optionsOf(internConfig, "jobFieldReason"),
      compact: true,
    },
    { id: "postingName", name: "공고명", type: "text", placeholder: "예: 2026년 하반기 마케팅 인턴 채용", josa: true },
    { id: "replyDeadline", name: "회신기한", type: "date", format: "short", compact: true },
    { id: "stat", name: "통계기간", label: "통계", type: "period", compact: true },
    ...STAT_FIELDS,
  ],
  recipient: { placement: "gmail", validated: false },
  attachment: {
    kind: "image",
    placeholderText: internConfig.attachment.placeholderText,
  },
};

export const activityDefinition: GeneratorDefinition = {
  key: "activity",
  label: "대외활동",
  baseSubject: activityConfig.factorySubject,
  baseBody: activityConfig.factoryBody,
  fields: [
    { id: "institutionName", name: "기관명", type: "text", placeholder: "예: 렛츠커리어", josa: true },
    {
      id: "activityFieldReason",
      name: "선정이유",
      label: "활동 분야",
      type: "select",
      options: optionsOf(activityConfig, "activityFieldReason"),
      compact: true,
    },
    { id: "postingName", name: "공고명", type: "text", placeholder: "예: 2026년 대학생 서포터즈 8기 모집", josa: true },
    { id: "replyDeadline", name: "회신기한", type: "date", format: "short", compact: true },
    { id: "stat", name: "통계기간", label: "통계", type: "period", compact: true },
    ...STAT_FIELDS,
  ],
  recipient: { placement: "gmail", validated: false },
  attachment: {
    kind: "image",
    placeholderText: activityConfig.attachment.placeholderText,
  },
};

export const SEED_DEFINITIONS: GeneratorDefinition[] = [
  salesDefinition,
  internDefinition,
  activityDefinition,
];
