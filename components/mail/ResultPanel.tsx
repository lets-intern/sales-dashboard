"use client";

// 생성 결과 패널: 실시간 치환된 제목/본문 + 복사(제목 텍스트 / 본문 서식포함).

import { useRef, useState } from "react";
import RichEditor from "./RichEditor";
import { copyText, copyRichHtml } from "@/lib/mail/engine/clipboard";
import type { MailController } from "./useMailGenerator";

// html → 순수 텍스트(복사 폴백/plain 용). 브라우저 DOM 사용.
function htmlToPlain(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText;
}

export default function ResultPanel({ ctrl }: { ctrl: MailController }) {
  const [status, setStatus] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  const onCopySubject = async () => {
    await copyText(ctrl.resultSubject);
    setStatus("제목이 클립보드에 복사되었습니다.");
    window.setTimeout(() => setStatus(""), 1500);
  };

  const onCopyBody = async () => {
    const html = ctrl.resultBody;
    const plain = bodyRef.current
      ? bodyRef.current.innerText
      : htmlToPlain(html);
    await copyRichHtml(html, plain);
    setStatus("결과가 클립보드에 복사되었습니다 (서식 포함).");
    window.setTimeout(() => setStatus(""), 2000);
  };

  return (
    <div className="mg-panel">
      <h2 className="mg-h2">4. 생성 결과</h2>
      <div className="mg-field">
        <label htmlFor="mg-subject-result">제목</label>
        <div className="mg-subject-row">
          <textarea
            id="mg-subject-result"
            className="mg-subject-input"
            rows={2}
            spellCheck={false}
            readOnly
            value={ctrl.resultSubject}
          />
          <button type="button" className="mg-btn" onClick={onCopySubject}>
            제목 복사
          </button>
        </div>
      </div>

      <div className="mg-result-actions">
        <label>본문</label>
        <button type="button" className="mg-btn mg-btn-primary" onClick={onCopyBody}>
          본문 복사 (서식 포함)
        </button>
      </div>

      <div ref={bodyRef}>
        <RichEditor
          value={ctrl.resultBody}
          className="mg-result-box"
          ariaLabel="생성된 본문 결과"
        />
      </div>

      {status && <div className="mg-status mg-status-inline">{status}</div>}
    </div>
  );
}
