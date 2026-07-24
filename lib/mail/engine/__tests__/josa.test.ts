import { describe, it, expect } from 'vitest';
import { getBatchimInfo, resolveJosaToken } from '../josa';

describe('getBatchimInfo', () => {
  it('받침 있는 한글(강)은 has=true, isRieul=false', () => {
    expect(getBatchimInfo('강')).toEqual({ has: true, isRieul: false, unknown: false });
  });

  it('받침 없는 한글(가)은 has=false', () => {
    expect(getBatchimInfo('가')).toEqual({ has: false, isRieul: false, unknown: false });
  });

  it('종성이 ㄹ인 한글(글)은 isRieul=true', () => {
    expect(getBatchimInfo('글')).toEqual({ has: true, isRieul: true, unknown: false });
  });

  it('마지막 글자 기준으로 판정한다(회사글 -> ㄹ)', () => {
    expect(getBatchimInfo('회사글')).toEqual({ has: true, isRieul: true, unknown: false });
  });

  it('앞뒤 공백은 무시한다', () => {
    expect(getBatchimInfo('  강  ')).toEqual({ has: true, isRieul: false, unknown: false });
  });

  it('숫자 3은 받침 있음', () => {
    expect(getBatchimInfo('3')).toEqual({ has: true, isRieul: false, unknown: false });
  });

  it('숫자 2는 받침 없음', () => {
    expect(getBatchimInfo('2')).toEqual({ has: false, isRieul: false, unknown: false });
  });

  it('숫자 7,8은 ㄹ 받침(칠/팔)', () => {
    expect(getBatchimInfo('7')).toEqual({ has: true, isRieul: true, unknown: false });
    expect(getBatchimInfo('8')).toEqual({ has: true, isRieul: true, unknown: false });
  });

  it('영문은 판별 불가 → 받침 있는 것으로 간주(unknown)', () => {
    expect(getBatchimInfo('AI')).toEqual({ has: true, isRieul: false, unknown: true });
  });

  it('빈 문자열은 unknown', () => {
    expect(getBatchimInfo('')).toEqual({ has: true, isRieul: false, unknown: true });
    expect(getBatchimInfo('   ')).toEqual({ has: true, isRieul: false, unknown: true });
  });
});

describe('resolveJosaToken', () => {
  it('은/는 - 받침 있으면 은', () => {
    expect(resolveJosaToken('은/는', '강')).toBe('은');
  });

  it('은/는 - 받침 없으면 는', () => {
    expect(resolveJosaToken('은/는', '가')).toBe('는');
  });

  it('순서 무관 - 는/은도 동일하게 동작', () => {
    expect(resolveJosaToken('는/은', '강')).toBe('은');
    expect(resolveJosaToken('는/은', '가')).toBe('는');
  });

  it('이/가', () => {
    expect(resolveJosaToken('이/가', '강')).toBe('이');
    expect(resolveJosaToken('이/가', '가')).toBe('가');
  });

  it('을/를', () => {
    expect(resolveJosaToken('을/를', '강')).toBe('을');
    expect(resolveJosaToken('을/를', '가')).toBe('를');
  });

  it('과/와', () => {
    expect(resolveJosaToken('과/와', '강')).toBe('과');
    expect(resolveJosaToken('과/와', '가')).toBe('와');
  });

  it('으로/로 - 받침 없으면 로', () => {
    expect(resolveJosaToken('으로/로', '가')).toBe('로');
  });

  it('으로/로 - 받침 있으면 으로', () => {
    expect(resolveJosaToken('으로/로', '강')).toBe('으로');
  });

  it('으로/로 - 종성 ㄹ이면 로', () => {
    expect(resolveJosaToken('으로/로', '글')).toBe('로');
  });

  it('으로/로 - 순서 무관(로/으로)', () => {
    expect(resolveJosaToken('로/으로', '가')).toBe('로');
    expect(resolveJosaToken('로/으로', '강')).toBe('으로');
    expect(resolveJosaToken('로/으로', '글')).toBe('로');
  });

  it('영문(unknown)은 받침 있는 것으로 취급', () => {
    expect(resolveJosaToken('은/는', 'AI')).toBe('은');
    expect(resolveJosaToken('으로/로', 'AI')).toBe('으로');
  });

  it('알 수 없는 조사쌍이면 첫 파트를 반환', () => {
    expect(resolveJosaToken('가/나', '강')).toBe('가');
  });

  it('슬래시 구분이 2개가 아니면 토큰 원본 반환', () => {
    expect(resolveJosaToken('은', '강')).toBe('은');
    expect(resolveJosaToken('은/는/가', '강')).toBe('은/는/가');
  });
});
