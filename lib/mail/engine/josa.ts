// 한글 받침(종성) 판정 + 조사 자동 선택 엔진.
// 프로토타입(sales.js / intern.js / activity.js)의 로직을 1:1 이식한 순수 함수.

export interface BatchimInfo {
  /** 받침(종성)이 있는지 여부 */
  has: boolean;
  /** 종성이 'ㄹ'인지 여부 (으로/로 판정에 사용) */
  isRieul: boolean;
  /** 한글/숫자가 아니라 받침을 확정할 수 없어 수동 확인이 필요한지 여부 */
  unknown: boolean;
}

// 마지막 글자를 기준으로 받침 정보를 판정한다.
// - 한글 완성형: 종성 인덱스로 받침 유무/ㄹ 여부 판정
// - 숫자: 발음 기준 받침 맵(0,3,6,7,8 등)
// - 영문·기호·빈값: 판별 불가 → 받침 있는 것으로 간주(unknown)
export function getBatchimInfo(text: string): BatchimInfo {
  const trimmed = (text || '').trim();
  if (!trimmed) return { has: true, isRieul: false, unknown: true };
  const lastChar = trimmed[trimmed.length - 1];
  const code = lastChar.charCodeAt(0);

  if (code >= 0xac00 && code <= 0xd7a3) {
    const idx = (code - 0xac00) % 28;
    return { has: idx !== 0, isRieul: idx === 8, unknown: false };
  }
  if (/[0-9]/.test(lastChar)) {
    const hasMap: Record<string, boolean> = {
      '0': false,
      '1': false,
      '2': false,
      '3': true,
      '4': false,
      '5': false,
      '6': true,
      '7': true,
      '8': true,
      '9': false,
    };
    const rieulMap: Record<string, boolean> = { '7': true, '8': true };
    return { has: hasMap[lastChar], isRieul: !!rieulMap[lastChar], unknown: false };
  }
  // 영문 등 판별 불가 -> 받침 있는 것으로 간주(수동 확인 필요)
  return { has: true, isRieul: false, unknown: true };
}

type JosaMode = 'plain' | 'rieul';

interface JosaSet {
  a: string;
  b: string;
  mode: JosaMode;
}

const JOSA_SETS: readonly JosaSet[] = [
  { a: '은', b: '는', mode: 'plain' },
  { a: '이', b: '가', mode: 'plain' },
  { a: '을', b: '를', mode: 'plain' },
  { a: '과', b: '와', mode: 'plain' },
  { a: '으로', b: '로', mode: 'rieul' },
];

// "은/는" 같은 토큰과 값을 받아 알맞은 조사를 반환한다.
// - 순서 무관 매칭: "은/는"과 "는/은" 모두 인식
// - rieul 모드(으로/로): 받침이 없거나 종성이 'ㄹ'이면 '로' 계열 사용
export function resolveJosaToken(token: string, value: string): string {
  const parts = token.split('/').map((s) => s.trim());
  if (parts.length !== 2) return token;
  const [p1, p2] = parts;
  const info = getBatchimInfo(value);
  const set = JOSA_SETS.find((s) => (s.a === p1 && s.b === p2) || (s.a === p2 && s.b === p1));
  if (!set) return p1;

  if (set.mode === 'rieul') {
    const useRo = !info.has || info.isRieul;
    return useRo ? (p1 === '로' ? p1 : p2) : (p1 === '으로' ? p1 : p2);
  }
  return info.has ? set.a : set.b;
}
