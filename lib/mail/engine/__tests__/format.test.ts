import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dateParts, computeDeadlineInfo, computeStatPeriod } from '../format';

describe('dateParts', () => {
  it('full/short/weekday 포맷', () => {
    // 2026-07-05 는 일요일
    expect(dateParts('2026-07-05')).toEqual({
      full: '2026년 7월 5일',
      short: '7월5일',
      weekday: '일요일',
    });
  });

  it('한 자리 월/일도 앞자리 0 없이(full/short)', () => {
    // 2026-01-02 는 금요일
    expect(dateParts('2026-01-02')).toEqual({
      full: '2026년 1월 2일',
      short: '1월2일',
      weekday: '금요일',
    });
  });

  it('빈 문자열은 전부 빈 값', () => {
    expect(dateParts('')).toEqual({ full: '', short: '', weekday: '' });
  });

  it('무효 날짜는 전부 빈 값', () => {
    expect(dateParts('not-a-date')).toEqual({ full: '', short: '', weekday: '' });
  });
});

describe('computeDeadlineInfo (D-day)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T09:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('미래 날짜는 D-n', () => {
    expect(computeDeadlineInfo('2026-07-27').dday).toBe('D-3');
  });

  it('오늘은 D-Day', () => {
    expect(computeDeadlineInfo('2026-07-24').dday).toBe('D-Day');
  });

  it('과거 날짜는 마감', () => {
    expect(computeDeadlineInfo('2026-07-20').dday).toBe('마감');
  });

  it('date parts도 함께 포함', () => {
    const info = computeDeadlineInfo('2026-07-27');
    expect(info.full).toBe('2026년 7월 27일');
    expect(info.short).toBe('7월27일');
  });

  it('빈 값은 dday 빈 문자열', () => {
    expect(computeDeadlineInfo('')).toEqual({ full: '', short: '', weekday: '', dday: '' });
  });

  it('무효 날짜는 dday 빈 문자열', () => {
    expect(computeDeadlineInfo('xxxx')).toEqual({ full: '', short: '', weekday: '', dday: '' });
  });
});

describe('computeStatPeriod', () => {
  it('full/compact 포맷', () => {
    expect(computeStatPeriod('2026-06-22', '2026-07-05')).toEqual({
      full: '2026년 6월 22일-7월 5일',
      compact: '2026.06.22-07.05',
    });
  });

  it('compact는 월/일을 2자리로 패딩', () => {
    expect(computeStatPeriod('2026-01-02', '2026-03-04').compact).toBe('2026.01.02-03.04');
  });

  it('둘 중 하나라도 비면 빈 값', () => {
    expect(computeStatPeriod('', '2026-07-05')).toEqual({ full: '', compact: '' });
    expect(computeStatPeriod('2026-06-22', '')).toEqual({ full: '', compact: '' });
  });

  it('무효 날짜는 빈 값', () => {
    expect(computeStatPeriod('nope', '2026-07-05')).toEqual({ full: '', compact: '' });
  });
});
