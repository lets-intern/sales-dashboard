// 김은아 루틴 구성 — 단계별 플로우(Step) 정의.
// 루틴/질문을 추가·수정하려면 이 파일만 고치면 됩니다. (DB 마이그레이션은 새 컬럼 추가 시에만)

export const RTN_PERSON = "김은아";

// 체크 항목. minutes/menu 가 붙으면 체크 시 보조 입력이 나타납니다.
//  - minutes:true → nums[key + "_min"] 에 분 저장
//  - menu:true    → texts[key + "_menu"] 에 메뉴 저장
export type RtnItem = {
  key: string;
  label: string;
  kind: "check" | "time" | "number";
  target?: string; // time: 목표 시각 (예: "22:30")
  unit?: string; // number: 단위 (예: "kg")
  minutes?: boolean; // check: 분 입력 동반
  menu?: boolean; // check: 메뉴 입력 동반
};

export type Step =
  | { id: string; kind: "mood"; q: string; sub?: string }
  | { id: string; kind: "body"; q: string; sub?: string }
  | { id: string; kind: "time"; key: string; target?: string; q: string; sub?: string }
  | { id: string; kind: "todos"; q: string; sub?: string }
  | {
      id: string;
      kind: "note";
      field: "morning_note" | "night_note";
      q: string;
      sub?: string;
      placeholder?: string;
    }
  | { id: string; kind: "checks"; emoji: string; q: string; sub?: string; items: RtnItem[] };

export const STEPS: Step[] = [
  { id: "mood", kind: "mood", q: "오늘 기분은 어떤가요?", sub: "은아님, 좋은 하루예요 ☀️" },
  { id: "wake", kind: "time", key: "wake", q: "몇 시에 일어났어요?", sub: "기상 시간을 기록해요" },
  {
    id: "todos",
    kind: "todos",
    q: "오늘 더 하고 싶은 일이 있나요?",
    sub: "떠오르는 투두를 적어보세요",
  },
  {
    id: "morning_write",
    kind: "note",
    field: "morning_note",
    q: "일어나서 떠오르는 생각이 있나요?",
    sub: "가볍게 한 줄 적어도 좋아요",
    placeholder: "오늘 아침 떠오른 생각…",
  },
  {
    id: "morning",
    kind: "checks",
    emoji: "🌅",
    q: "아침 루틴을 체크해볼까요?",
    items: [
      { key: "weight", label: "몸무게 기록", kind: "number", unit: "kg" },
      { key: "walk", label: "동네 한 바퀴 돌기", kind: "check" },
      { key: "bike", label: "실내 자전거 타기", kind: "check", minutes: true },
      { key: "exercise", label: "맨손 체조 · 필라테스 기구", kind: "check" },
      { key: "wash_am", label: "씻기", kind: "check" },
      { key: "massage_am", label: "얼굴 마사지", kind: "check" },
      { key: "brunch", label: "아점 먹기", kind: "check", menu: true },
    ],
  },
  {
    id: "day",
    kind: "checks",
    emoji: "☀️",
    q: "낮에는 무엇을 했나요?",
    items: [
      { key: "sewing", label: "미싱 하기", kind: "check" },
      { key: "study", label: "일본어 공부하기", kind: "check" },
      { key: "reading_day", label: "책 보기", kind: "check" },
      { key: "housework", label: "집안일 하기", kind: "check" },
    ],
  },
  {
    id: "supplement",
    kind: "checks",
    emoji: "💊",
    q: "영양제 챙겼나요?",
    items: [
      { key: "probiotics", label: "유산균", kind: "check" },
      { key: "hemp_oil", label: "대마종자유", kind: "check" },
      { key: "joint", label: "관절약", kind: "check" },
    ],
  },
  {
    id: "evening",
    kind: "checks",
    emoji: "🌆",
    q: "저녁 시간이에요",
    items: [
      { key: "dinner", label: "저녁 먹기", kind: "check", menu: true },
      { key: "attendance_write", label: "개근 글 작성", kind: "check" },
      { key: "duolingo", label: "듀오링고 하기", kind: "check" },
      { key: "tasks_evening", label: "할 일 하기", kind: "check" },
    ],
  },
  {
    id: "night",
    kind: "checks",
    emoji: "🌙",
    q: "밤, 침실 루틴이에요",
    sub: "수면 패턴을 위해 22:30엔 침실로",
    items: [
      { key: "bedroom", label: "침실 도착 시각", kind: "time", target: "22:30" },
      { key: "wash_pm", label: "씻기", kind: "check" },
      { key: "massage_pm", label: "얼굴 마사지", kind: "check" },
      { key: "reading_pm", label: "책 읽다 잠들기", kind: "check" },
      { key: "sleep", label: "취침 시각", kind: "time" },
    ],
  },
  { id: "body", kind: "body", q: "오늘 몸 컨디션은 어땠어요?", sub: "무리하지 않았나요?" },
  {
    id: "night_write",
    kind: "note",
    field: "night_note",
    q: "오늘 하루를 한 줄로 마무리해볼까요?",
    sub: "짧아도 좋아요",
    placeholder: "오늘의 일기…",
  },
];

// 진행률 계산 대상 = 모든 checks 스텝의 check 항목
export const ALL_CHECK_KEYS = STEPS.flatMap((s) =>
  s.kind === "checks" ? s.items.filter((i) => i.kind === "check").map((i) => i.key) : []
);

export type Choice = { key: string; emoji: string; label: string };

// 기분 선택
export const MOODS: Choice[] = [
  { key: "great", emoji: "😄", label: "좋음" },
  { key: "good", emoji: "🙂", label: "괜찮음" },
  { key: "ok", emoji: "😐", label: "보통" },
  { key: "down", emoji: "😟", label: "별로" },
  { key: "bad", emoji: "😢", label: "힘듦" },
];

// 몸 컨디션 체크
export const BODYS: Choice[] = [
  { key: "light", emoji: "💪", label: "가뿐" },
  { key: "normal", emoji: "🙂", label: "보통" },
  { key: "heavy", emoji: "😮‍💨", label: "무거움" },
  { key: "sick", emoji: "🤒", label: "안 좋음" },
];
