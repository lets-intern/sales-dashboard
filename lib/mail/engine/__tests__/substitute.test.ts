import { describe, it, expect } from 'vitest';
import { substitute, escapeForHtml, identity, stripTags } from '../substitute';

describe('substitute - 일반 치환', () => {
  it('제목(identity): {{key}}를 값으로 치환', () => {
    const out = substitute('{{교육프로그램명}} 홍보', { 교육프로그램명: 'AI 캠프' }, identity);
    expect(out).toBe('AI 캠프 홍보');
  });

  it('본문(escapeForHtml): 값의 특수문자를 이스케이프', () => {
    const out = substitute('<div>{{고객사명}}</div>', { 고객사명: 'A & B <Co>' }, escapeForHtml);
    expect(out).toBe('<div>A &amp; B &lt;Co&gt;</div>');
  });

  it('identity 컨텍스트는 값을 이스케이프하지 않음', () => {
    const out = substitute('{{고객사명}}', { 고객사명: 'A & B' }, identity);
    expect(out).toBe('A & B');
  });

  it('없는 값은 빈 문자열로 치환', () => {
    const out = substitute('[{{없음}}]', { 없음: '' }, identity);
    expect(out).toBe('[]');
  });
});

describe('substitute - 조사 pass', () => {
  it('받침 있는 값 + 은/는 → 은', () => {
    // '국'은 받침(ㄱ)이 있으므로 은
    const out = substitute('{{고객사명}}[은/는] 좋다', { 고객사명: '한국' }, identity);
    expect(out).toBe('한국은 좋다');
  });

  it('받침 없는 값 + 이/가 → 가', () => {
    const out = substitute('{{교육프로그램명}}[이/가]', { 교육프로그램명: '스터디' }, identity);
    // '디'는 받침 없음
    expect(out).toBe('스터디가');
  });

  it('닫는 태그가 사이에 껴도 조사 인식 + 태그 보존', () => {
    const out = substitute(
      '<b>{{고객사명}}</b>[을/를] 위해',
      { 고객사명: '카카오' },
      escapeForHtml,
    );
    // '오'는 받침 없음 → 를
    expect(out).toBe('<b>카카오</b>를 위해');
  });

  it('조사 pass에서 값도 escapeFn으로 처리된다(본문)', () => {
    const out = substitute('{{고객사명}}[은/는]', { 고객사명: 'A<b>' }, escapeForHtml);
    expect(out).toBe('A&lt;b&gt;은');
  });

  it('조사 후에도 남은 {{key}} 일반 치환', () => {
    const out = substitute(
      '{{고객사명}}[은/는] {{교육프로그램명}} 담당',
      { 고객사명: '가나', 교육프로그램명: '부트캠프' },
      identity,
    );
    // '나' 받침 없음 → 는
    expect(out).toBe('가나는 부트캠프 담당');
  });
});

describe('substitute - rawHtmlKeys', () => {
  const rawKeys = new Set(['관심사문구']);

  it('본문(escapeForHtml)에서는 HTML 태그를 그대로 유지', () => {
    const out = substitute(
      '<div>{{관심사문구}}</div>',
      { 관심사문구: '<b>실행력 있는</b> 타겟에 적합하여' },
      escapeForHtml,
      rawKeys,
    );
    expect(out).toBe('<div><b>실행력 있는</b> 타겟에 적합하여</div>');
  });

  it('제목(identity)에서는 태그를 제거한 텍스트로 삽입', () => {
    const out = substitute(
      '{{관심사문구}}',
      { 관심사문구: '<b>실행력 있는</b> 타겟' },
      identity,
      rawKeys,
    );
    expect(out).toBe('실행력 있는 타겟');
  });

  it('rawHtmlKeys가 아닌 키는 본문에서 이스케이프됨', () => {
    const out = substitute(
      '{{일반}}',
      { 일반: '<b>x</b>' },
      escapeForHtml,
      rawKeys,
    );
    expect(out).toBe('&lt;b&gt;x&lt;/b&gt;');
  });
});

describe('stripTags', () => {
  it('태그를 제거한다', () => {
    expect(stripTags('<b>가나</b><i>다</i>')).toBe('가나다');
  });
});
