// 생성기 정의(JSON)를 AI 에게 만들게 하는 프롬프트.
//
// 사용자가 관리 화면에서 복사해 ChatGPT·Claude 등에 붙여넣고, 뒤에 원하는 메일을
// 설명하면 붙여넣을 수 있는 JSON 이 나온다.
//
// 스키마(definition.ts)를 고치면 이 문구도 같이 고쳐야 한다. 어긋나면 AI 가 만든 JSON 이
// 검증에서 걸리고, 사용자는 왜 안 되는지 알 수 없다. __tests__/prompt.test.ts 가
// 프롬프트에 든 예시가 실제로 스키마를 통과하는지 확인한다.

// 프롬프트에 넣는 예시. 실제로 검증을 통과하는 정의여야 한다.
export const PROMPT_EXAMPLE = {
  key: "partner-intro",
  label: "제휴 제안",
  baseSubject: "[{{회사명}}] {{제휴유형}} 제안 — {{회신기한}}까지 회신 부탁드립니다",
  baseBody:
    "<div>{{회사명}} {{담당자명}}님, 안녕하세요.</div>" +
    "<div><br></div>" +
    "<div>{{회사명}}[은/는] {{제휴유형}} 제휴에 적합하다고 판단해 연락드립니다.</div>" +
    "<div>집계 기간 {{집계기간}} 동안 방문자는 {{방문자수}}였습니다.</div>" +
    "<div><br></div>" +
    "<div>회신 기한은 <b>{{회신기한}}</b>({{회신기한전체}}) 이며 오늘 기준 {{디데이}} 입니다.</div>",
  fields: [
    {
      id: "companyName",
      name: "회사명",
      type: "text",
      placeholder: "예: 렛츠커리어",
      josa: true,
      counterparty: true,
    },
    { id: "managerName", name: "담당자명", type: "text", placeholder: "예: 김은아" },
    {
      id: "partnerType",
      name: "제휴유형",
      label: "제휴 유형",
      type: "select",
      compact: true,
      options: [
        { label: "콘텐츠", value: "콘텐츠 공동 제작" },
        { label: "채용", value: "채용 공고 노출" },
      ],
    },
    {
      id: "dueDate",
      name: "회신기한",
      label: "회신 기한",
      type: "date",
      format: "short",
      compact: true,
      also: { full: "회신기한전체", dday: "디데이" },
    },
    {
      id: "stat",
      name: "집계기간",
      label: "집계 기간",
      type: "period",
      compact: true,
    },
    {
      id: "visitors",
      name: "방문자수",
      label: "방문자 수",
      type: "text",
      placeholder: "예: 1,240명",
      compact: true,
    },
  ],
  recipient: { placement: "gmail", validated: false },
  attachment: { kind: null },
};

export const GENERATOR_PROMPT = `너는 사내 메일 템플릿 생성기의 "정의 JSON"을 만드는 역할이다.
아래 규격을 정확히 지켜 정의 JSON 하나를 만들어라.

**반드시 \`\`\`json 코드블록 안에 넣어서 출력해라.** 사용자가 그대로 복사해 붙여넣어야 하는데,
일반 대화 텍스트로 출력하면 따옴표가 곡선 따옴표로 바뀌거나 줄바꿈이 어긋나 붙여넣기가 깨진다.
코드블록 밖에는 짧은 한 줄 설명만 두고, JSON 을 두 번 출력하지 마라.

# 이게 무엇인가

이 JSON 하나가 메일 생성기 탭 하나가 된다. 사용자는 폼에 값을 채우고, 그 값이 제목·본문의
{{플레이스홀더}} 자리에 들어가 완성된 메일이 만들어진다. 메일은 Gmail 임시보관함에
초안으로만 저장된다(발송 기능 없음).

# 핵심 규칙

1. 필드 하나가 플레이스홀더 하나를 만든다. 필드의 name 이 곧 본문의 {{name}} 이다.
2. 폼에 표시할 이름이 플레이스홀더와 다르면 label 을 따로 준다.
   예) "도달"로 입력받아 본문에는 {{도달수}}로 쓰고 싶으면 name:"도달수", label:"도달"
3. 계산식은 없다. 값 변환은 형식 선택(date 의 format)으로만 표현한다.
4. 같은 입력을 다른 표기로 한 번 더 쓰려면 also 에 이름을 명시한다.
5. 본문에 쓰지 않는 플레이스홀더는 만들지 마라. 반대로 본문에 쓴 {{이름}}은 반드시
   그것을 만드는 필드가 있어야 한다.

# 최상위 구조

- key: 생성기 식별자. 영소문자·숫자·하이픈만. 저장 후 바꾸기 어려우니 신중히.
- label: 탭에 표시할 이름. 한글 가능.
- baseSubject: 기본 메일 제목(문자열).
- baseBody: 기본 메일 본문. HTML 문자열이다. 각 줄을 <div>...</div> 로 감싸고
  빈 줄은 <div><br></div> 로 쓴다. 강조는 <b>...</b>.
- fields: 필드 배열(아래 참조).
- recipient: { "placement": "gmail", "validated": false } 로 둔다.
  validated:true 는 기존 콜드메일 생성기 전용이므로 새 생성기에는 쓰지 마라.
- attachment: 첨부가 없으면 { "kind": null },
  파일 첨부면 { "kind": "files" },
  본문에 이미지 1장을 넣으려면 { "kind": "image", "placeholderText": "[이미지]" }
  (placeholderText 는 본문에 그대로 넣어두면 그 자리에 이미지가 들어간다)

# 필드 공통 속성

- id: 영문으로 시작하는 영숫자. 폼 입력칸의 내부 이름이라 중복 불가.
- name: 플레이스홀더 이름. 중괄호 금지, 40자 이내, 앞뒤 공백 금지. 중복 불가.
- label: (선택) 폼 표시명. 없으면 name 을 쓴다.
- compact: (선택) true 면 입력칸을 좁게 표시. 날짜·숫자·짧은 값에 쓴다.
- josa: (선택) 이 필드에 조사 자동 선택을 쓸 것임을 표시. 아래 "조사" 참조.
- rawHtml: (선택) true 면 값 안의 HTML 태그를 그대로 살린다. 값에 <b> 등이 든 경우만.
- counterparty: (선택) 메일을 받는 상대의 이름이면 true. 생성기당 최대 1개.
  저장 기록에서 "어디에 보냈는지"를 이 값으로 검색한다. 회사명·기관명·고객사명 같은 필드.
- output: (선택) 기본 true. 본문 치환에 쓰지 않고 입력만 받는 필드는 false.

# 필드 타입

"text"   — 한 줄 텍스트. placeholder 로 입력 예시를 준다.
"email"  — 이메일. 형식이 검사된다.
"select" — 드롭다운. options: [{ "label": 화면표시, "value": 실제치환값 }, ...] 필수.
           {{name}} 에는 value 가 들어간다. 화면에 보이는 label 도 쓰려면
           also: { "label": "다른이름" } 을 준다.
"date"   — 날짜. format 으로 표기를 고른다.
             "short"   → 7월5일
             "full"    → 2026년 7월 5일
             "weekday" → 일요일
             "dday"    → D-3 / D-Day / 마감  (오늘 기준으로 계산된다)
           같은 날짜를 여러 표기로 쓰려면 also 로 이름을 더 준다.
             "also": { "full": "마감일전체", "dday": "디데이" }
"period" — 기간. 시작일·종료일 두 칸이 자동으로 생긴다. 입력은 한 번만 한다.
           {{name}} → 2026년 6월 22일-7월 5일
           축약형도 쓰려면 "also": { "compact": "기간축약" } → 2026.06.22-07.05

# 조사 자동 선택

본문에서 플레이스홀더 뒤에 대괄호로 조사 후보를 적으면 받침에 맞춰 자동으로 골라진다.

  {{회사명}}[은/는]   → "렛츠커리어는" / "넥슨은"
  {{회사명}}[이/가]   {{회사명}}[을/를]   {{회사명}}[과/와]   {{회사명}}[으로/로]

대괄호가 없으면 조사는 처리되지 않는다. "{{회사명}}은/는" 처럼 쓰면 글자 그대로 나온다.

# 예시

${JSON.stringify(PROMPT_EXAMPLE, null, 2)}

# 출력 규칙

- **\`\`\`json 코드블록 하나**에만 담아 출력한다. 복사해서 그대로 붙여넣을 것이기 때문이다.
- JSON 안에 주석(//)을 넣지 마라. JSON 문법이 아니라 붙여넣으면 깨진다.
- 한 번만 출력한다. 같은 JSON 을 설명용으로 또 적지 마라.
- 본문(baseBody)에 쓴 모든 {{이름}}이 fields 에서 만들어지는지 스스로 확인하고 출력해라.
- 플레이스홀더 이름과 필드 id 는 각각 중복되면 안 된다.

---

아래에 어떤 메일을 만들고 싶은지 설명하겠다. 그에 맞는 정의 JSON 을 출력해라.
`;
