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
  "인스타 @official 피드",
  "인스타 @official 스토리",
  "인스타 @job 피드",
  "인스타 @job 스토리",
  "오픈채팅방 #쥬디QNA",
  "오픈채팅방 #오공고",
  "카카오 채널 DM",
  "주간 뉴스레터",
  "웹사이트 상단 배너",
  "웹사이트 하단 배너",
  "웹사이트 팝업창",
  "MMS 광고",
];
export const OWNERS = [
  "황준호",
  "송다예",
  "신수현",
  "박재영",
  "최수현",
  "임호정",
  "김학배",
  "김현조",
  "김수정",
];
export const INVOICE_STATUS = ["예정", "완료", "카드 결제"];

// 거래명세서 공급자 정보 (아이엔지 / 렛츠커리어)
export const SUPPLIER = {
  reg_no: "871-11-02629",
  company: "아이엔지",
  ceo: "송다예",
  biz_type: "정보통신업",
  biz_item: "데이터베이스 및 온라인 정보 제공업",
  contact: "official@letscareer.co.kr",
};

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

export const INVOICE_TAG: Record<string, [string, string]> = {
  예정: ["#f1f3f5", "#495057"],
  완료: ["#e3f9e5", "#2b8a3e"],
  "카드 결제": ["#e7f5ff", "#1971c2"],
};
