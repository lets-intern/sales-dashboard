// 플레이스홀더 치환 엔진 (본문 HTML / 제목 텍스트 공용).
// 프로토타입(sales.js / intern.js)의 로직을 1:1 이식한 순수 함수.

import { resolveJosaToken } from './josa';

export type EscapeFn = (str: string) => string;

// 본문(HTML) 컨텍스트용 이스케이프. 제목(텍스트)은 identity를 쓴다.
export function escapeForHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 제목(순수 텍스트) 컨텍스트용 항등 함수.
export const identity: EscapeFn = (s) => s;

export function stripTags(str: string): string {
  return String(str).replace(/<[^>]*>/g, '');
}

// {{변수}}[opt1/opt2] 형태의 조사 자동 처리 매칭.
// 굵게(<b>) 등으로 감싸 {{변수}}</b>[은/는] 처럼 닫는 태그가 중간에 끼어도 인식되도록
// 닫는 태그 구간을 캡처해서 그대로 유지한다.
const JOSA_PATTERN = /\{\{\s*([^{}[\]]+?)\s*\}\}((?:\s*<\/[a-zA-Z0-9]+>)*)\s*\[([^[\]]+)\]/g;

// 2-pass 치환:
//  1) 조사 pass — {{변수}}[은/는] 형태를 값 + 닫는태그 + 알맞은 조사로 치환
//  2) 일반 pass — 남은 {{key}}를 값으로 치환
// rawHtmlKeys에 속한 키는 본문(escapeForHtml)에서는 HTML 태그를 그대로 살리고,
// 제목(identity 등)에서는 stripTags로 태그를 제거한 텍스트로 넣는다.
export function substitute(
  source: string,
  values: Record<string, string>,
  escapeFn: EscapeFn,
  rawHtmlKeys: ReadonlySet<string> = new Set(),
): string {
  let out = source;
  const isHtmlContext = escapeFn === escapeForHtml;

  out = out.replace(JOSA_PATTERN, (_match, varName: string, between: string, token: string) => {
    const value = values[varName] || '';
    return escapeFn(value) + between + escapeFn(resolveJosaToken(token, value));
  });

  for (const key of Object.keys(values)) {
    const raw = values[key] || '';
    const replacement = rawHtmlKeys.has(key)
      ? isHtmlContext
        ? raw
        : stripTags(raw)
      : escapeFn(raw);
    out = out.split(`{{${key}}}`).join(replacement);
  }
  return out;
}
