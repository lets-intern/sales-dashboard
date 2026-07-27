"use client";

// 앱 안에서 그리는 알림·확인 창.
//
// window.confirm/alert 을 쓰지 않는 이유는 두 가지다.
// 1) 브라우저 기본 창은 앱 스타일과 따로 놀고 문구를 여러 줄로 정리하기 어렵다.
// 2) 기본 창은 렌더링을 멈춰 세우고 자동화·테스트 환경에서 세션을 막아 버린다.
//
// 훅(useMailGenerator) 안에서도 불러야 해서 컨텍스트 대신 모듈 스코프 스토어를 쓴다.
// 화면 어딘가에 <DialogHost /> 하나만 떠 있으면 어디서든 openDialog 를 부를 수 있다.

import { useCallback, useEffect, useRef, useState } from "react";

export type DialogTone = "default" | "danger";

export interface DialogRequest {
  title?: string;
  message: string;
  /** 확인 창이면 true. 알림 창은 버튼 하나만 그린다. */
  confirm: boolean;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
  /**
   * 되돌릴 수 없는 동작에 쓴다. 이 문구를 그대로 입력해야 확인 버튼이 열린다.
   * 버튼 하나로 끝나는 확인은 습관적으로 눌리기 때문에, 손이 한 번 멈추게 만든다.
   */
  requireText?: string;
}

interface PendingDialog extends DialogRequest {
  id: number;
  resolve: (value: boolean) => void;
}

type Listener = (dialog: PendingDialog | null) => void;

let current: PendingDialog | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(current);
}

function open(request: DialogRequest): Promise<boolean> {
  return new Promise((resolve) => {
    // 이미 떠 있는 창이 있으면 그것부터 닫는다(취소로 처리).
    if (current) current.resolve(false);
    current = { ...request, id: nextId++, resolve };
    emit();
  });
}

function close(result: boolean) {
  if (!current) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(result);
}

// 알림 — 확인 버튼 하나. 항상 true 로 끝난다.
export function alertDialog(
  message: string,
  options: Omit<DialogRequest, "message" | "confirm"> = {}
): Promise<boolean> {
  return open({ ...options, message, confirm: false });
}

// 확인 — 진행이면 true, 취소면 false.
export function confirmDialog(
  message: string,
  options: Omit<DialogRequest, "message" | "confirm"> = {}
): Promise<boolean> {
  return open({ ...options, message, confirm: true });
}

export function DialogHost() {
  const [dialog, setDialog] = useState<PendingDialog | null>(current);
  const [typed, setTyped] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listeners.add(setDialog);
    return () => {
      listeners.delete(setDialog);
    };
  }, []);

  useEffect(() => {
    setTyped("");
    if (!dialog) return;
    // 확인 문구를 받아야 하면 입력칸에, 아니면 확인 버튼에 포커스를 준다.
    if (dialog.requireText) inputRef.current?.focus();
    else confirmRef.current?.focus();
  }, [dialog]);

  const textOk = !dialog?.requireText || typed.trim() === dialog.requireText;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!dialog) return;
      if (e.key === "Escape") close(false);
      // 확인 창에서 Enter 는 진행. 알림 창은 버튼이 하나라 어느 쪽이든 닫힌다.
      // 확인 문구를 요구하는 창은 문구가 맞을 때만 Enter 가 통한다.
      if (e.key === "Enter" && textOk) close(true);
    },
    [dialog, textOk]
  );

  if (!dialog) return null;

  return (
    <div
      className="dlg-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        // 바깥을 누르면 취소. 알림 창도 닫는다.
        if (e.target === e.currentTarget) close(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="dlg-card"
        role="alertdialog"
        aria-modal="true"
        aria-label={dialog.title ?? "알림"}
      >
        {dialog.title && <h2 className="dlg-title">{dialog.title}</h2>}
        <p className="dlg-message">{dialog.message}</p>

        {dialog.requireText && (
          <label className="dlg-confirm-text">
            <span>
              계속하려면 <b>{dialog.requireText}</b> 를 그대로 입력하세요.
            </span>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              autoComplete="off"
              spellCheck={false}
              placeholder={dialog.requireText}
              onChange={(e) => setTyped(e.target.value)}
            />
          </label>
        )}

        <div className="dlg-actions">
          {dialog.confirm && (
            <button type="button" className="mg-btn" onClick={() => close(false)}>
              {dialog.cancelText ?? "취소"}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`mg-btn ${
              dialog.tone === "danger" ? "dlg-danger" : "mg-btn-primary"
            }`}
            disabled={!textOk}
            onClick={() => close(true)}
          >
            {dialog.confirmText ?? (dialog.confirm ? "진행" : "확인")}
          </button>
        </div>
      </div>
    </div>
  );
}
