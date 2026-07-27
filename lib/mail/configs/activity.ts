// 대외활동(activity) 제안메일 생성기 config.
// 기본 제목·본문·활동분야 옵션은 프로토타입(activity.{html,js})에서 verbatim 이식.

import { dateParts, computeStatPeriod } from "../engine/format";
import type { FieldOption, GeneratorConfig } from "./types";

// 활동 분야 셀렉트(9): value = 선정이유 문장, label = 분야명.
const ACTIVITY_FIELD_OPTIONS: FieldOption[] = [
  {
    value: "브랜드 홍보와 SNS 활동 경험을 쌓고자 하는 대학생의 관심도가 높은 활동으로",
    label: "서포터즈·홍보대사",
  },
  {
    value: "콘텐츠 제작과 글쓰기 경험을 원하는 참여자에게 적합한 활동으로",
    label: "기자단·에디터",
  },
  {
    value: "마케팅 실무 경험을 쌓고자 하는 대학생의 관심도가 높은 활동으로",
    label: "마케팅 서포터즈",
  },
  {
    value: "디자인·영상 제작 경험과 포트폴리오를 함께 쌓을 수 있는 활동으로",
    label: "디자인·영상 크리에이터",
  },
  {
    value: "기획과 실행 경험을 쌓으려는 대학생에게 적합한 활동으로",
    label: "기획단·프로젝트",
  },
  {
    value: "사회공헌 경험을 원하는 참여자에게 의미 있는 활동으로",
    label: "봉사·사회공헌",
  },
  {
    value: "창업·비즈니스 실무 경험을 원하는 참여자에게 유용한 활동으로",
    label: "창업·비즈니스",
  },
  {
    value: "금융·경제 실무 지식과 분석 경험을 쌓고자 하는 참여자에게 적합한 활동으로",
    label: "금융·경제",
  },
  {
    value: "대외활동을 통해 실전 경험을 쌓고자 하는 참여자에게 유용한 활동으로",
    label: "기타",
  },
];

const FACTORY_DEFAULT_SUBJECT = "[오늘의공고 1회 편성 안내] {{기관명}} {{공고명}}";

// 레퍼런스 메일 색상(프로토타입 상수 인라인): 태그라인 보라, 연락처 파랑, 푸터 흐린 회색.
const COLOR_TAGLINE = "#9C27B0";
const COLOR_CONTACT = "#1155CC";
const FOOTER_STYLE = "color:#888888;font-size:11px";

const FACTORY_DEFAULT_BODY = `<div>안녕하세요, {{기관명}} 담당자님.</div>
<div>취업정보 플랫폼 렛츠커리어입니다.</div>
<div><br></div>
<div>현재 모집 중인 대외활동 공고를 검토한 결과,</div>
<div>귀 기관의 「{{공고명}}」을 렛츠커리어 인스타그램 <b>'오늘의공고'</b>의 1회 소개 대상으로 선정해 연락드립니다.</div>
<div><br></div>
<div>'오늘의공고'는 대학생·취업준비생이 놓치기 쉬운 대외활동 기회를 선별해,</div>
<div>모집 분야와 주요 지원조건, 활동 일정을 한눈에 소개하는 대외활동 큐레이션 콘텐츠입니다.</div>
<div><br></div>
<div>귀 기관의 이번 공고 역시 {{선정이유}} 판단했습니다.</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>렛츠커리어 JOB 인스타그램은 일부 게시물의 일시적인 반응에 그치지 않고,</div>
<div>일별 조회 흐름을 꾸준히 유지하며 성장하고 있는 채널입니다.</div>
<div><br></div>
<div>{{통계기간}}에는 전체 콘텐츠 기준으로</div>
<div><br></div>
<div>조회수 <b>{{조회수}}</b></div>
<div>도달 <b>{{도달수}}</b></div>
<div>콘텐츠 상호작용 <b>{{상호작용수}}</b></div>
<div><br></div>
<div>를 기록했습니다.</div>
<div><br></div>
<div>직전 기간과 비교해 조회수는 <b>{{조회수증가율}}</b>, 도달은 <b>{{도달증가율}}</b>, 콘텐츠 상호작용은 <b>{{상호작용증가율}}</b> 증가했습니다.</div>
<div><br></div>
<div>특히 전체 조회수의 약 <b>{{일반콘텐츠비율}}</b>인 <b>{{일반콘텐츠조회수}}</b>가 광고가 아닌 일반 콘텐츠를 통해 발생했습니다.</div>
<div>팔로워 기반도 꾸준히 확대되며 채널의 자연 유입과 영향력이 함께 성장하고 있습니다.</div>
<div><br></div>
<div>[렛츠커리어 JOB 인스타그램 최근 2주 성과 이미지 삽입]</div>
<div>렛츠커리어 JOB 인스타그램 인사이트｜{{통계기간축약}}(2주)</div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>이번 소개 대상으로 선정된 공고는 기관별 1건, 1회에 한해 <b>별도의 콘텐츠 제작비나 게시 비용 없이</b> 소개합니다.</div>
<div><br></div>
<div>게시물에는 공개된 모집공고를 기준으로 다음 내용을 정리해 담을 예정입니다.</div>
<div><br></div>
<div>- 기관명 및 활동명(모집 분야)</div>
<div>- 주요 지원조건</div>
<div>- 모집 마감일</div>
<div>- 모집공고 원문 링크</div>
<div><br></div>
<div>게재를 원하시면 <b>{{회신기한}}까지 '확인'이라고 간단히 회신</b>해 주세요.</div>
<div><br></div>
<div>정해진 편성 수량에 따라 회신이 확인되는 순서대로 게시 일정을 확정합니다.</div>
<div>공고 내용이 변경됐거나 추가로 반영할 사항이 있다면 함께 알려주시면 됩니다.</div>
<div><br></div>
<div>이번 소개가 귀 기관의 좋은 대외활동 기회와 적합한 참여자를 연결하는 데 도움이 되길 바랍니다.</div>
<div><br></div>
<div>감사합니다.</div>
<div><br></div>
<div><a href="https://www.instagram.com/letscareer.job/">@letscareer.job</a></div>
<div><br></div>
<div>-----</div>
<div><br></div>
<div>오늘도 응원합니다.</div>
<div><span style="color:${COLOR_TAGLINE}"><b>커리어의 첫 걸음, 렛츠커리어</b></span> 드림</div>
<div><br></div>
<div><span style="color:${COLOR_CONTACT}">M. 010-0000-0000 (B2B매니저)</span></div>
<div><span style="color:${COLOR_CONTACT}">E. <a href="mailto:official@letscareer.co.kr">official@letscareer.co.kr</a></span></div>
<div><span style="color:${COLOR_CONTACT}">H. <a href="https://www.letscareer.co.kr/">https://www.letscareer.co.kr/</a></span></div>
<div><br></div>
<div><span style="${FOOTER_STYLE}">-----</span></div>
<div><span style="${FOOTER_STYLE}">렛츠커리어</span></div>
<div><span style="${FOOTER_STYLE}"><a href="mailto:official@letscareer.co.kr">official@letscareer.co.kr</a></span></div>
<div><span style="${FOOTER_STYLE}">서울특별시 성동구 왕십리로 137, 성동창업이룸센터 2층 206호 0507-0178-8541</span></div>
<div><span style="${FOOTER_STYLE}">*더 이상 렛츠커리어의 B2B 업무 제안 및 광고 수신을 원하지 않으실 경우, 본 메일에 [수신거부]라고 회신해 주시면 즉시 발송 목록에서 영구 제외되도록 하겠습니다.</span></div>`;

// 성과 이미지 placeholder(본문 내 문구) — Gmail 초안(Push 5)에서 인라인 이미지로 치환됨.
export const ACTIVITY_IMAGE_PLACEHOLDER =
  "[렛츠커리어 JOB 인스타그램 최근 2주 성과 이미지 삽입]";

// 첫 옵션을 기본 선택값으로 둔다(프로토타입 select 기본 동작과 일치).
export const ACTIVITY_DEFAULT_FIELD_VALUES: Record<string, string> = {
  activityFieldReason: ACTIVITY_FIELD_OPTIONS[0].value,
};

export const activityConfig: GeneratorConfig = {
  key: "activity",
  label: "대외활동",
  storagePrefix: "activityMailTool",
  factorySubject: FACTORY_DEFAULT_SUBJECT,
  factoryBody: FACTORY_DEFAULT_BODY,
  josaVars: ["기관명", "활동분야", "공고명"],
  rawHtmlKeys: [],
  fields: [
    { id: "institutionName", label: "기관명", type: "text", placeholder: "예: 렛츠커리어" },
    {
      id: "activityFieldReason",
      label: "활동 분야",
      type: "select",
      options: ACTIVITY_FIELD_OPTIONS,
      compact: true,
    },
    {
      id: "postingName",
      label: "공고명",
      type: "text",
      placeholder: "예: 2026년 대학생 서포터즈 8기 모집",
    },
    { id: "replyDeadline", label: "회신기한", type: "date", compact: true },
    { id: "statStart", label: "통계 시작일", type: "date", compact: true },
    { id: "statEnd", label: "통계 종료일", type: "date", compact: true },
    { id: "statViews", label: "조회수", type: "text", placeholder: "예: 81.3만 회", compact: true },
    { id: "statReach", label: "도달", type: "text", placeholder: "예: 9.1만 계정", compact: true },
    {
      id: "statEngagement",
      label: "콘텐츠 상호작용",
      type: "text",
      placeholder: "예: 1.6만 회",
      compact: true,
    },
    { id: "rateViews", label: "조회수 증가율", type: "text", placeholder: "예: 12.5%", compact: true },
    { id: "rateReach", label: "도달 증가율", type: "text", placeholder: "예: 6.1%", compact: true },
    {
      id: "rateEngagement",
      label: "상호작용 증가율",
      type: "text",
      placeholder: "예: 10.2%",
      compact: true,
    },
    { id: "organicRatio", label: "일반콘텐츠 비율", type: "text", placeholder: "예: 98%", compact: true },
    {
      id: "organicViews",
      label: "일반콘텐츠 조회수",
      type: "text",
      placeholder: "예: 79.8만 회",
      compact: true,
    },
  ],
  computeValues(state) {
    // 활동분야 = 선택 옵션의 라벨, 선정이유 = 선택 옵션의 값(문장).
    const selected =
      ACTIVITY_FIELD_OPTIONS.find((o) => o.value === state.activityFieldReason) ??
      ACTIVITY_FIELD_OPTIONS[0];
    const reply = dateParts(state.replyDeadline ?? "");
    const period = computeStatPeriod(state.statStart ?? "", state.statEnd ?? "");
    const t = (v: string | undefined) => (v ?? "").trim();
    return {
      기관명: t(state.institutionName),
      활동분야: selected.label,
      공고명: t(state.postingName),
      선정이유: selected.value,
      회신기한: reply.short,
      통계기간: period.full,
      통계기간축약: period.compact,
      조회수: t(state.statViews),
      도달수: t(state.statReach),
      상호작용수: t(state.statEngagement),
      조회수증가율: t(state.rateViews),
      도달증가율: t(state.rateReach),
      상호작용증가율: t(state.rateEngagement),
      일반콘텐츠비율: t(state.organicRatio),
      일반콘텐츠조회수: t(state.organicViews),
    };
  },
  counterpartyFieldId: "institutionName",
  recipient: { placement: "gmail", validated: false },
  attachment: { kind: "image", placeholderText: ACTIVITY_IMAGE_PLACEHOLDER },
};
