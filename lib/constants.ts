export const TYPES = ["광고 대행", "취업 교육", "채용 연계"];
export const SEGMENTS = ["B2B", "B2U"];
export const DEAL_STATUS = [
  "시작 전",
  "논의 진행 중",
  "사업 진행 중",
  "완료",
  "Drop",
  "Fail",
];
export const ITEM_STATUS = ["시작 전", "진행 중", "완료"];
export const CHANNELS = [
  "인스타 피드",
  "인스타 스토리",
  "쥬디 QNA 오픈채팅방",
  "오공고 오픈채팅방",
  "MMS 광고",
  "카카오 채널 DM",
  "웹사이트 상단 배너",
  "주간뉴스레터",
];

export const STATUS_COLOR: Record<string, string> = {
  "시작 전": "gray",
  "논의 진행 중": "amber",
  "진행 중": "amber",
  "사업 진행 중": "blue",
  완료: "green",
  Drop: "red",
  Fail: "red",
};

export const TYPE_TAG: Record<string, [string, string]> = {
  "광고 대행": ["var(--s-blue-bg)", "var(--s-blue-fg)"],
  "취업 교육": ["var(--s-violet-bg)", "var(--s-violet-fg)"],
  "채용 연계": ["var(--s-amber-bg)", "var(--s-amber-fg)"],
};

export const SEG_TAG: Record<string, [string, string]> = {
  B2B: ["#fde6e3", "#c0392b"],
  B2U: ["#efe6fb", "#7a3fc4"],
};
