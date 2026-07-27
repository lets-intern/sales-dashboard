// 날짜 / D-day / 통계기간 포맷터.
// 프로토타입(sales.js / intern.js)의 로직을 1:1 이식한 순수 함수.

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatShort(d: Date): string {
  return `${d.getMonth() + 1}월${d.getDate()}일`;
}

export interface DateParts {
  /** "2026년 7월 5일" */
  full: string;
  /** "7월5일" */
  short: string;
  /** "일요일" */
  weekday: string;
}

// 날짜 문자열(YYYY-MM-DD) -> {full, short, weekday}. 빈/무효 값은 전부 ''.
export function dateParts(dateStr: string): DateParts {
  const blank: DateParts = { full: '', short: '', weekday: '' };
  if (!dateStr) return blank;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return blank;

  return {
    full: `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`,
    short: formatShort(d),
    weekday: `${WEEKDAY_KR[d.getDay()]}요일`,
  };
}

export interface DeadlineInfo extends DateParts {
  /** "D-3" / "D-Day" / "마감" */
  dday: string;
}

// 모집마감일 전용: dateParts에 오늘 기준 D-day를 더한다.
export function computeDeadlineInfo(dateStr: string): DeadlineInfo {
  const parts = dateParts(dateStr);
  if (!dateStr) return { ...parts, dday: '' };
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return { ...parts, dday: '' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  let dday: string;
  if (diffDays > 0) dday = `D-${diffDays}`;
  else if (diffDays === 0) dday = 'D-Day';
  else dday = '마감';

  return { ...parts, dday };
}

export interface StatPeriod {
  /** "2026년 6월 22일-7월 5일" */
  full: string;
  /** "2026.06.22-07.05" */
  compact: string;
}

// 통계 시작일~종료일 -> {full, compact}. 둘 중 하나라도 빈/무효면 ''.
export function computeStatPeriod(startStr: string, endStr: string): StatPeriod {
  const blank: StatPeriod = { full: '', compact: '' };
  if (!startStr || !endStr) return blank;
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return blank;

  const full = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일-${end.getMonth() + 1}월 ${end.getDate()}일`;
  const compact = `${start.getFullYear()}.${pad2(start.getMonth() + 1)}.${pad2(start.getDate())}-${pad2(end.getMonth() + 1)}.${pad2(end.getDate())}`;
  return { full, compact };
}
