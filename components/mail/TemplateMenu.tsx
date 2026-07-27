"use client";

// 왼쪽 여백에 떠 있는 템플릿 관리 메뉴.
// 템플릿 선택 + 이름 변경 + 새 템플릿 만들기 + 현재 수정사항을 템플릿으로 저장 + 삭제.
//
// 베이스 템플릿(기본값)은 여기서 건드리지 않는다. 베이스는 제목/본문 패널의
// "기본값 수정 → 기본값 저장" 경로로만 바뀐다 — 새 템플릿의 출발점이라
// 실수로 덮이면 모든 신규 템플릿에 영향이 가기 때문이다.

import { useEffect, useRef, useState } from "react";
import { slotDisplayName } from "@/lib/mail/types";
import type { MailController } from "./useMailGenerator";

export default function TemplateMenu({ ctrl }: { ctrl: MailController }) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming !== null) inputRef.current?.select();
  }, [renaming]);

  const startRename = (slot: number, current: string) => {
    setRenaming(slot);
    setDraft(slotDisplayName(slot, current));
  };

  const commitRename = () => {
    if (renaming === null) return;
    ctrl.renameSlot(renaming, draft);
    setRenaming(null);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="tm-reopen"
        onClick={() => setOpen(true)}
        aria-label="템플릿 메뉴 열기"
      >
        템플릿
      </button>
    );
  }

  return (
    <aside className="tm-root" aria-label="템플릿 관리">
      <div className="tm-head">
        <b>템플릿</b>
        <button
          type="button"
          className="tm-collapse"
          onClick={() => setOpen(false)}
          aria-label="템플릿 메뉴 닫기"
        >
          숨기기
        </button>
      </div>

      <ul className="tm-list">
        {ctrl.slots.map(({ slot, name }) => (
          <li key={slot} className="tm-item">
            {renaming === slot ? (
              <input
                ref={inputRef}
                className="tm-rename-input"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  className={`tm-select${ctrl.active === slot ? " active" : ""}`}
                  disabled={ctrl.slotLocked}
                  onClick={() => ctrl.switchSlot(slot)}
                  onDoubleClick={() => startRename(slot, name)}
                  title="클릭: 열기 / 더블클릭: 이름 변경"
                >
                  {slotDisplayName(slot, name)}
                </button>
                <span className="tm-item-actions">
                  <button
                    type="button"
                    className="tm-icon"
                    disabled={ctrl.slotLocked}
                    onClick={() => startRename(slot, name)}
                    aria-label={`${slotDisplayName(slot, name)} 이름 변경`}
                    title="이름 변경"
                  >
                    이름
                  </button>
                  <button
                    type="button"
                    className="tm-icon tm-danger"
                    disabled={ctrl.slotLocked || !ctrl.canRemoveSlot}
                    onClick={() => ctrl.removeSlot(slot)}
                    aria-label={`${slotDisplayName(slot, name)} 삭제`}
                    title="삭제"
                  >
                    삭제
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="tm-actions">
        <button
          type="button"
          className="tm-btn"
          disabled={ctrl.slotLocked}
          onClick={ctrl.addSlot}
        >
          새 템플릿
        </button>
        <button
          type="button"
          className="tm-btn tm-btn-primary"
          disabled={ctrl.slotLocked}
          onClick={ctrl.saveCurrentAsSlot}
        >
          수정사항을 템플릿으로 저장
        </button>
      </div>

      <p className="tm-note">새 템플릿은 베이스 내용으로 시작합니다.</p>
      {ctrl.slotStatus && <p className="tm-status">{ctrl.slotStatus}</p>}
    </aside>
  );
}
