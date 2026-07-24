// 콜드메일(sales) 생성기 config.
// 기본 제목·본문·관심사 표현 옵션은 프로토타입(sales.{html,js})에서 verbatim 이식.

import { dateParts, computeDeadlineInfo } from "../engine/format";
import type { FieldOption, GeneratorConfig } from "./types";

// 관심사 표현 셀렉트(3): value = 본문에 그대로 삽입되는 HTML 문구(<b> 포함), label = 표시용.
// 값에 <b> 태그가 들어 있으므로 이 키(관심사문구)는 rawHtmlKeys 로 지정한다.
const INTEREST_PHRASE_OPTIONS: FieldOption[] = [
  {
    value: "저희 플랫폼을 이용하는 유저들의 관심사와 <b>일치</b>하며",
    label: "일치",
  },
  {
    value: "저희 플랫폼을 이용하는 유저들의 관심사와 <b>매우 일치</b>하며",
    label: "매우 일치",
  },
  {
    value: "저희 플랫폼을 이용하는 유저들이 많은 관심을 가지는 분야 중 하나이며",
    label: "유저 관심분야 중 하나",
  },
];

const FACTORY_DEFAULT_SUBJECT =
  "(광고)지만 {{교육프로그램명}} 홍보가 필요하시다면, 모집 부스팅 제안드립니다";

// 레퍼런스 메일 색상(프로토타입 상수 인라인): 태그라인 보라, 연락처 파랑, 푸터 흐린 회색.
const COLOR_TAGLINE = "#9C27B0";
const COLOR_CONTACT = "#1155CC";
const FOOTER_STYLE = "color:#888888;font-size:11px";

const FACTORY_DEFAULT_BODY = `<div>안녕하십니까 {{고객사명}} 담당자님,</div>
<div>취업 교육 플랫폼 렛츠커리어의 담당 매니저입니다.</div>
<div><br></div>
<div>다름 아니라,</div>
<div>귀사에서 현재 모집 중이신 {{교육프로그램명}} 모집 공고를 인상 깊게 보았습니다.</div>
<div><br></div>
<div>다가오는 <b>{{모집마감일}}</b> 모집 마감 일정에 맞추어,</div>
<div>정원 확보와 <b>'고관여 타겟 유입'</b>에 리소스를 집중하고 계실 듯하여</div>
<div>실질적인 도움을 드리고자 메일 드렸습니다.</div>
<div><br></div>
<div>무엇보다,</div>
<div>렛츠커리어는 <b>'광고 소재 기획 및 디자인 제작'을 모두 대행</b>하고 있으며,</div>
<div><b>24시간 내에 결과물을 만들어 광고 송출까지 다이렉트로 진행</b>가능하다는 점을 먼저 강조 드립니다.</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>렛츠커리어는 단순 정보 탐색자가 아닌,</div>
<div>실무 템플릿을 이용하고, 취업 챌린지에 참여하는 등</div>
<div>실행력 있는 <b>'고관여' 주니어/취준생 DB를 독점 보유</b>하고 있습니다.</div>
<div><br></div>
<div>귀사의 이번 교육 과정은 {{관심사문구}},</div>
<div>다음과 같은 온드미디어 패키지를 통해 빠른 모객 전환을 기대할 수 있습니다</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div><b>1. 렛츠커리어 온드미디어 채널 요약 및 기대효과</b></div>
<div><br></div>
<div>- 렛츠커리어 인스타그램 채널 2개 (총 팔로워 5.9만명)</div>
<div>한번의 게재로 <b>인지도 확보와 클릭까지 유도할 수 있는</b> 렛츠커리어의 시그니처 상품</div>
<div><br></div>
<div>- 렛츠커리어 홈페이지 상단/하단 배너 (MAU 3만명)</div>
<div>적극적 구직 활동, 챌린지 참여자들이 머무르는 렛츠커리어만의 독점 <b>'고관여DB'</b></div>
<div><br></div>
<div>- 렛츠커리어 주간 뉴스레터 (구독자 1.8만명)</div>
<div><b>상시 취준생 구독자 1.8만명</b>의 개인 메일함에 광고 소재 제한 없이 다이렉트로 발송</div>
<div><br></div>
<div>- 카카오톡 오픈채팅방 5개 (총원 6600여명)</div>
<div>지속적으로 취업 정보를 공유하고 Q&amp;A를 진행하며 <b>끈끈한 라포</b>가 형성된 채팅채널</div>
<div><br></div>
<div>- 카카오 채널 친구 DM (채널친구 2800여명)</div>
<div>렛츠커리어의 채널 친구 전체에게 카톡을 발송하여 <b>즉각적인 효과</b>를 기대</div>
<div><br></div>
<div>- 온라인 LIVE 세미나 광고 연계 상품</div>
<div>라이브 세미나에 참석하는 <b>고관여 참여자</b>들에게 즉각적인 행동 유도와 각인효과를 기대</div>
<div><br></div>
<div>- 더 다양한 구좌는 첨부파일 참고</div>
<div><br></div>
<div><b>2. 광고 소재 기획 및 제작 대행</b></div>
<div><br></div>
<div>귀사의 내부 디자인 리소스 부담을 덜어드리기 위해,</div>
<div>본 광고 상품 진행 시,</div>
<div>렛츠커리어 측에서 타겟 맞춤형 카드뉴스 및 배너소재를</div>
<div>직접 기획하고 제작하여 송출합니다.</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>단일 구좌에 예산을 소진하기보다, 검증된 타겟 풀을 활용해 효율 극대화를 시도해 보시길 권유드리며,</div>
<div>상세한 광고 구좌 스펙과 단가가 포함된 <b>상품 안내서</b>를 본 메일에 PDF로 첨부해 드렸으니 참고 부탁드립니다.</div>
<div><br></div>
<div><b>첨부된 소개서</b>를 가볍게 검토해 보시고 아래 양식으로 <b>{{회신마감일}}까지 회신</b>을 남겨주시면,</div>
<div>귀사의 수강생 총력 확보를 위한 구좌 스케줄 선점 및 세부 조율을 도와드리겠습니다.</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div><b>[간편 회신 양식]</b></div>
<div><br></div>
<div>-광고 필요 교육명 :</div>
<div>-교육 내용을 확인할 수 있는 URL :</div>
<div>-담당자 연락처 :</div>
<div>-추가 문의사항 :</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>오늘도 응원합니다.</div>
<div><span style="color:${COLOR_TAGLINE}"><b>커리어의 첫 걸음, 렛츠커리어</b></span> 드림</div>
<div><br></div>
<div><span style="color:${COLOR_CONTACT}">M. 010-0000-0000 (담당 매니저)</span></div>
<div><span style="color:${COLOR_CONTACT}">E. <a href="mailto:official@letscareer.co.kr">official@letscareer.co.kr</a></span></div>
<div><span style="color:${COLOR_CONTACT}">H. <a href="https://www.letscareer.co.kr/">https://www.letscareer.co.kr/</a></span></div>
<div><br></div>
<div><span style="${FOOTER_STYLE}">-----</span></div>
<div><span style="${FOOTER_STYLE}">렛츠커리어</span></div>
<div><span style="${FOOTER_STYLE}"><a href="mailto:official@letscareer.co.kr">official@letscareer.co.kr</a></span></div>
<div><span style="${FOOTER_STYLE}">서울특별시 성동구 왕십리로 137, 성동창업이룸센터 2층 206호 0507-0178-8541</span></div>
<div><span style="${FOOTER_STYLE}">*더 이상 렛츠커리어의 B2B 업무 제안 및 광고 수신을 원하지 않으실 경우, 본 메일에 [수신거부]라고 회신해 주시면 즉시 발송 목록에서 영구 제외되도록 하겠습니다.</span></div>`;

// 첫 옵션을 기본 선택값으로 둔다(프로토타입 select 기본 동작과 일치).
export const SALES_DEFAULT_FIELD_VALUES: Record<string, string> = {
  interestPhrase: INTEREST_PHRASE_OPTIONS[0].value,
};

// ────────────────────────────────────────────────────────────────
// sales 전용 검증/가드 (PRD §4.2)
//
// 엄밀한 RFC 5322 검사는 아니고, 흔한 실수(골뱅이 없음/도메인에 점 없음 등)만 걸러내는
// 느슨한 형식 검사. 아래 순수 함수 + 상태 계산은 config/훅 레벨에서 사용하고,
// 실제 "저장 버튼 게이트"와 확인 모달 노출은 Gmail 초안 패널(Push 5)에서 최종 연결한다.
// ────────────────────────────────────────────────────────────────

// 받는사람 이메일: 앞뒤 앵커(^$)로 값 전체가 이메일 1개 형태인지 검사.
export const SALES_EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 문장 중간에 섞인 이메일도 잡아내기 위한 느슨한 패턴(앵커 없음).
// (예: 교육프로그램명 칸에 실수로 이메일을 넣은 경우)
export const SALES_EMAIL_LOOSE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

// 받는사람 이메일이 저장 가능한 형식인지. 빈 값은 통과 실패(false)로 본다.
export function isValidRecipientEmail(value: string): boolean {
  const v = (value ?? "").trim();
  return v.length > 0 && SALES_EMAIL_FORMAT_RE.test(v);
}

// 교육프로그램명에 이메일 주소가 섞여 있으면 true(입력 오류로 간주).
export function programNameHasEmail(value: string): boolean {
  const v = (value ?? "").trim();
  return v.length > 0 && SALES_EMAIL_LOOSE_PATTERN.test(v);
}

// 저장 버튼 활성화 상태: 받는사람 이메일이 유효하고, 교육프로그램명에 이메일이 없어야 한다.
// (프로토타입의 recipientEmailOk && programNameOk 와 동일한 게이트.)
export function computeSalesCanSave(
  fieldValues: Record<string, string>
): boolean {
  return (
    isValidRecipientEmail(fieldValues.recipientEmail ?? "") &&
    !programNameHasEmail(fieldValues.programName ?? "")
  );
}

// text 안에 sub 가 몇 번 등장하는지(겹치지 않게) 센다.
export function countOccurrences(text: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(sub, idx)) !== -1) {
    count += 1;
    idx += sub.length;
  }
  return count;
}

// 직전 저장 성공 시점의 값(중복 발송 확인용).
export interface SalesLastSent {
  recipientEmail: string | null;
  clientName: string | null;
  programName: string | null;
}

// 저장 직전 검사에 넘길 현재 발송 값.
export interface SalesSendInput {
  recipientEmail: string;
  clientName: string;
  programName: string;
  // 최종 생성된 제목(치환 완료). 제목 내 고객사명 중복 검사에 쓴다.
  subject: string;
}

export type SalesGuardCode =
  | "same-recipient" // 직전과 받는사람 주소 동일
  | "same-client-program" // 직전과 고객사명+교육프로그램명 동일
  | "program-includes-client" // 교육프로그램명 안에 고객사명 포함(제목 중복 표기 우려)
  | "subject-duplicate-client"; // 생성된 제목에 고객사명 2회 이상

export interface SalesGuard {
  code: SalesGuardCode;
  message: string;
}

// 저장 직전 "중복 발송/표기" 확인이 필요한 상황을 모아 반환한다(경고, 저장 자체를 막진 않음).
// Gmail 패널(Push 5)에서 각 항목을 확인 모달로 노출하고 사용자가 진행/취소를 고른다.
export function collectSalesSendGuards(
  input: SalesSendInput,
  last: SalesLastSent
): SalesGuard[] {
  const guards: SalesGuard[] = [];
  const to = input.recipientEmail.trim();
  const clientName = input.clientName.trim();
  const programName = input.programName.trim();

  if (
    last.recipientEmail &&
    to.toLowerCase() === last.recipientEmail.toLowerCase()
  ) {
    guards.push({
      code: "same-recipient",
      message: `직전에 저장한 메일과 받는사람 주소가 동일합니다 (${to}).`,
    });
  }

  if (
    last.clientName !== null &&
    clientName === last.clientName &&
    programName === last.programName
  ) {
    guards.push({
      code: "same-client-program",
      message: `고객사명/교육프로그램명이 직전에 저장한 메일과 동일합니다.\n(고객사명: ${clientName || "(빈칸)"} / 교육프로그램명: ${programName || "(빈칸)"})`,
    });
  }

  if (clientName && programName.includes(clientName)) {
    guards.push({
      code: "program-includes-client",
      message: `교육프로그램명에 고객사명(${clientName})과 같은 문구가 포함돼 있습니다. 제목에 고객사명이 중복 표기될 수 있습니다.`,
    });
  }

  if (clientName && countOccurrences(input.subject, clientName) >= 2) {
    guards.push({
      code: "subject-duplicate-client",
      message: `생성된 제목에 고객사명(${clientName})이 중복해서 들어가 있는 것 같습니다.\n제목: ${input.subject}`,
    });
  }

  return guards;
}

export const salesConfig: GeneratorConfig = {
  key: "sales",
  label: "콜드메일",
  storagePrefix: "mailTemplateTool",
  factorySubject: FACTORY_DEFAULT_SUBJECT,
  factoryBody: FACTORY_DEFAULT_BODY,
  josaVars: ["고객사명", "교육프로그램명"],
  rawHtmlKeys: ["관심사문구"],
  fields: [
    { id: "clientName", label: "고객사명", type: "text", placeholder: "예: 연세 IT 미래교육원" },
    {
      id: "programName",
      label: "교육프로그램명",
      type: "text",
      placeholder: "예: 노코드 AI 서비스 개발자2기",
    },
    { id: "deadline", label: "모집마감일", type: "date", compact: true },
    { id: "replyDeadline", label: "회신마감일", type: "date", compact: true },
    {
      id: "interestPhrase",
      label: "관심사 표현",
      type: "select",
      options: INTEREST_PHRASE_OPTIONS,
      compact: true,
    },
    // 받는사람 이메일은 별도 검증 대상(isValidRecipientEmail). 실제 저장 게이트/모달은 Push 5.
    { id: "recipientEmail", label: "받는사람 이메일", type: "email", placeholder: "예: hr@company.com" },
  ],
  computeValues(state) {
    const dl = computeDeadlineInfo(state.deadline ?? "");
    const reply = dateParts(state.replyDeadline ?? "");
    const t = (v: string | undefined) => (v ?? "").trim();
    return {
      고객사명: t(state.clientName),
      교육프로그램명: t(state.programName),
      모집마감일: dl.short,
      모집마감일전체: dl.full,
      마감요일: dl.weekday,
      디데이: dl.dday,
      회신마감일: reply.short,
      // 관심사문구는 <b> 태그를 그대로 살려야 하므로 rawHtmlKeys 로 처리된다.
      관심사문구: state.interestPhrase ?? "",
    };
  },
  // sales 는 받는사람 이메일을 검증한다(validated: true). 입력 위치/게이트는 Gmail 패널(Push 5).
  recipient: { placement: "gmail", validated: true },
  // sales 는 PDF 등 파일 첨부(온드미디어 상품 안내서). 본문 이미지 placeholder 없음.
  attachment: { kind: "files" },
};
