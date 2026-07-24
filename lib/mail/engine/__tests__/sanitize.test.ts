import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize';

describe('sanitizeHtml', () => {
  it('허용 태그(B/STRONG/I/EM/U/UL/OL/LI/P/DIV)는 유지, 속성은 제거', () => {
    expect(sanitizeHtml('<b class="x">굵게</b>')).toBe('<b>굵게</b>');
    expect(sanitizeHtml('<div style="margin:10px">본문</div>')).toBe('<div>본문</div>');
    expect(sanitizeHtml('<ul><li>a</li><li>b</li></ul>')).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('BR은 유지', () => {
    expect(sanitizeHtml('가<br>나')).toBe('가<br>나');
  });

  it('안전한 링크(http/https/mailto)는 href 유지 + target/rel 추가', () => {
    expect(sanitizeHtml('<a href="https://a.com">링크</a>')).toBe(
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">링크</a>',
    );
    expect(sanitizeHtml('<a href="mailto:x@y.com">메일</a>')).toBe(
      '<a href="mailto:x@y.com" target="_blank" rel="noopener noreferrer">메일</a>',
    );
  });

  it('위험한 링크(javascript:)는 href 제거하고 앵커만 남김', () => {
    // eslint-disable-next-line no-script-url
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('SPAN은 color/font-size만 유지', () => {
    expect(sanitizeHtml('<span style="color:#ff0000;background:#000">빨강</span>')).toBe(
      '<span style="color:#ff0000">빨강</span>',
    );
    expect(sanitizeHtml('<span style="font-size:11px;margin:2px">작게</span>')).toBe(
      '<span style="font-size:11px">작게</span>',
    );
    expect(sanitizeHtml('<span style="color:#111;font-size:11px">둘다</span>')).toBe(
      '<span style="color:#111;font-size:11px">둘다</span>',
    );
  });

  it('FONT는 color 속성/스타일을 span color로 변환', () => {
    expect(sanitizeHtml('<font color="#123456">색</font>')).toBe(
      '<span style="color:#123456">색</span>',
    );
  });

  it('color/font-size 둘 다 없는 SPAN은 벗겨내고 내용만 유지', () => {
    expect(sanitizeHtml('<span style="background:#000">내용</span>')).toBe('내용');
    expect(sanitizeHtml('<span>plain</span>')).toBe('plain');
  });

  it('허용되지 않은 태그(TABLE 등)는 벗기고 내용은 유지', () => {
    expect(sanitizeHtml('<table><tr><td>셀</td></tr></table>')).toBe('셀');
  });

  it('script 태그는 벗겨지고 실행 코드는 텍스트로 남지 않음(태그 제거)', () => {
    // script 는 허용 태그가 아니므로 unwrap → 내부 텍스트만 남는다
    expect(sanitizeHtml('<div>안전<script>evil()</script></div>')).toBe('<div>안전evil()</div>');
  });

  it('중첩된 서식도 재귀적으로 정리', () => {
    expect(sanitizeHtml('<div><b>가<span style="color:red">나</span></b></div>')).toBe(
      '<div><b>가<span style="color:red">나</span></b></div>',
    );
  });
});
