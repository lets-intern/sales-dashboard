import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyText, copyRichHtml } from '../clipboard';

const originalClipboard = navigator.clipboard;
const originalClipboardItem = (globalThis as { ClipboardItem?: unknown }).ClipboardItem;

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
    writable: true,
  });
}

// jsdom 은 document.execCommand 를 구현하지 않으므로 스텁을 정의해 둔다.
beforeEach(() => {
  (document as unknown as { execCommand: () => boolean }).execCommand = () => true;
});

afterEach(() => {
  setClipboard(originalClipboard);
  (globalThis as { ClipboardItem?: unknown }).ClipboardItem = originalClipboardItem;
  vi.restoreAllMocks();
});

describe('copyText', () => {
  it('navigator.clipboard.writeText 성공 시 그대로 사용', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await copyText('제목입니다');
    expect(writeText).toHaveBeenCalledWith('제목입니다');
  });

  it('writeText 실패 시 execCommand 폴백', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard({ writeText });
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    await copyText('폴백텍스트');

    expect(exec).toHaveBeenCalledWith('copy');
    // 폴백 textarea 는 복사 후 제거되어야 한다
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('copyRichHtml', () => {
  beforeEach(() => {
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = undefined;
  });

  it('ClipboardItem 지원 시 text/html+text/plain 으로 write', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const ctorCalls: Record<string, Blob>[] = [];
    class ClipboardItemMock {
      constructor(data: Record<string, Blob>) {
        ctorCalls.push(data);
      }
    }
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = ClipboardItemMock;
    setClipboard({ write });

    await copyRichHtml('<b>hi</b>', 'hi');

    expect(ctorCalls).toHaveLength(1);
    expect(ctorCalls[0]['text/html']).toBeInstanceOf(Blob);
    expect(ctorCalls[0]['text/plain']).toBeInstanceOf(Blob);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('ClipboardItem 미지원 시 execCommand 폴백', async () => {
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = undefined;
    setClipboard({});
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    await copyRichHtml('<b>hi</b>', 'hi');

    expect(exec).toHaveBeenCalledWith('copy');
    // 폴백 임시 컨테이너는 제거되어야 한다
    expect(document.body.querySelector('div[style*="-9999px"]')).toBeNull();
  });

  it('navigator.clipboard.write 실패 시에도 execCommand 폴백', async () => {
    const write = vi.fn().mockRejectedValue(new Error('denied'));
    class ClipboardItemMock {
      constructor(_data: Record<string, Blob>) {}
    }
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = ClipboardItemMock;
    setClipboard({ write });
    const exec = vi.spyOn(document, 'execCommand').mockReturnValue(true);

    await copyRichHtml('<b>hi</b>', 'hi');

    expect(exec).toHaveBeenCalledWith('copy');
  });
});
