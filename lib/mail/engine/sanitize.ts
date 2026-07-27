// 붙여넣기 HTML 서식 정리(sanitize).
// 프로토타입(sales.js / intern.js)의 로직을 1:1 이식. 브라우저/ jsdom DOM에서 동작한다.
//
// - B/STRONG/I/EM/U/UL/OL/LI/BR/P/DIV: 태그 유지, 속성 제거
// - A: 안전한 링크(http/https/mailto)만 href 유지 + target/rel 추가
// - SPAN/FONT: color·font-size만 추출해서 유지, 없으면 태그를 벗김(unwrap)
// - 그 외 태그(TABLE 등): 태그만 벗기고 내용은 유지

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BR', 'P', 'DIV']);

function extractStyleProp(styleAttr: string | null, prop: string): string | null {
  if (!styleAttr) return null;
  const match = styleAttr.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : null;
}

function sanitizeNode(node: Node): DocumentFragment {
  const doc = node.ownerDocument ?? document;
  const frag = doc.createDocumentFragment();
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      frag.appendChild(doc.createTextNode(child.textContent ?? ''));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as Element;
    const tag = el.tagName;
    if (tag === 'BR') {
      frag.appendChild(doc.createElement('br'));
      return;
    }

    const cleanedChildren = sanitizeNode(el);

    if (tag === 'A') {
      const href = (el.getAttribute('href') || '').trim();
      const anchor = doc.createElement('a');
      if (/^(https?:|mailto:)/i.test(href)) {
        anchor.setAttribute('href', href);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
      anchor.appendChild(cleanedChildren);
      frag.appendChild(anchor);
      return;
    }

    if (tag === 'SPAN' || tag === 'FONT') {
      const style = el.getAttribute('style');
      const color = extractStyleProp(style, 'color') || el.getAttribute('color');
      const fontSize = extractStyleProp(style, 'font-size');
      if (color || fontSize) {
        const span = doc.createElement('span');
        const parts: string[] = [];
        if (color) parts.push(`color:${color}`);
        if (fontSize) parts.push(`font-size:${fontSize}`);
        span.setAttribute('style', parts.join(';'));
        span.appendChild(cleanedChildren);
        frag.appendChild(span);
      } else {
        frag.appendChild(cleanedChildren);
      }
      return;
    }

    if (ALLOWED_TAGS.has(tag)) {
      const kept = doc.createElement(tag);
      kept.appendChild(cleanedChildren);
      frag.appendChild(kept);
    } else {
      // 허용되지 않은 태그(예: TABLE)는 태그만 벗기고 내용은 유지
      frag.appendChild(cleanedChildren);
    }
  });
  return frag;
}

export function sanitizeHtml(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  const cleaned = sanitizeNode(container);
  const out = document.createElement('div');
  out.appendChild(cleaned);
  return out.innerHTML;
}
