"use client";

// 리치 텍스트 에디터(contenteditable). 프로토타입 templateBox/resultBox 이식.
// - 툴바(굵게/기울임/목록)는 document.execCommand 로 처리
// - 붙여넣기는 sanitizeHtml(Push2)로 서식 정리 후 삽입
// - 외부 value(슬롯 전환·기본값 로드)와 내부 DOM 이 다를 때만 반영해 캐럿 튐을 막는다.

import { useEffect, useRef } from "react";
import type { ClipboardEvent } from "react";
import { sanitizeHtml } from "@/lib/mail/engine/sanitize";

interface RichEditorProps {
  value: string;
  onChange?: (html: string) => void;
  // 툴바 노출 여부(결과 본문은 false)
  toolbar?: boolean;
  // 기본값 수정 중 강조 스타일
  editingDefault?: boolean;
  className?: string;
  ariaLabel?: string;
}

const TOOLBAR_COMMANDS: { cmd: string; label: React.ReactNode }[] = [
  { cmd: "bold", label: <><b>B</b> 굵게</> },
  { cmd: "italic", label: <><i>I</i> 기울임</> },
  { cmd: "insertUnorderedList", label: <>• 목록</> },
];

// 순수 텍스트 붙여넣기용 이스케이프(+개행 → <br>).
function escapePlainToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export default function RichEditor({
  value,
  onChange,
  toolbar = false,
  editingDefault = false,
  className,
  ariaLabel,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const emitChange = () => {
    const el = ref.current;
    if (el && onChange) onChange(el.innerHTML);
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const insertHtml = html
      ? sanitizeHtml(html)
      : escapePlainToHtml(e.clipboardData.getData("text/plain"));
    document.execCommand("insertHTML", false, insertHtml);
    emitChange();
  };

  const runCommand = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    emitChange();
  };

  const editorClass = [
    "mg-editor",
    editingDefault ? "editing-default" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mg-richeditor">
      {toolbar && (
        <div className="mg-toolbar">
          {TOOLBAR_COMMANDS.map((t) => (
            <button
              key={t.cmd}
              type="button"
              // mousedown 기본동작(포커스 이동에 의한 선택 해제)을 막아 선택영역 유지
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runCommand(t.cmd)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className={editorClass}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={emitChange}
        onPaste={handlePaste}
      />
    </div>
  );
}
