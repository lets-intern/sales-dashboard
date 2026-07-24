// 클립보드 복사 유틸. 프로토타입(sales.js)의 복사 로직을 이식.
// Clipboard API 우선, 미지원/실패 시 execCommand('copy') 폴백.

// 순수 텍스트(제목) 복사.
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// 서식 포함 본문 복사. text/html + text/plain을 함께 넣어
// 서식 붙여넣기와 순수 텍스트 붙여넣기를 모두 지원한다.
export async function copyRichHtml(html: string, plain: string): Promise<void> {
  try {
    if (typeof ClipboardItem === 'undefined') {
      throw new Error('no ClipboardItem support');
    }
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([plain], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
  } catch {
    // 폴백: 임시 요소에 렌더링 후 선택 영역을 만들어 execCommand로 복사한다.
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.opacity = '0';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand('copy');
    sel?.removeAllRanges();
    document.body.removeChild(container);
  }
}
