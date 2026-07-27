"use client";

// Gmail 초안 패널 — Google 로그인 + 수신자 + 이미지/첨부 업로드 + "임시보관함에 저장".
//
// ⛔ 하드 제약: 초안(drafts.create)까지만. 발송/전송 버튼 없음, 자동 전송 없음.
//    사용자가 Gmail 임시보관함에서 직접 검수 후 발송한다.
//
// - sales: 받는사람은 폼의 recipientEmail(검증), computeSalesCanSave 게이트 +
//   collectSalesSendGuards 확인. 첨부는 다중 파일(multipart/mixed).
// - intern·activity: 패널 자체 수신자 입력, 성과 이미지 1장(multipart/related cid).
//   Supabase Storage(mail-assets)에 업로드해 보존하고, 초안에는 base64 인라인으로 삽입.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { uploadPerformanceImage } from "@/lib/mail/storage";
import type { GeneratorConfig } from "@/lib/mail/configs/types";
import {
  collectSalesSendGuards,
  type SalesLastSent,
} from "@/lib/mail/configs/sales";
import type { MailController } from "./useMailGenerator";
import {
  getGmailTokenState,
  signInWithGoogle,
  signOutGoogle,
  type GmailTokenState,
} from "@/lib/mail/gmail/oauth";
import { insertDraftLog } from "@/lib/mail/draftLog";
import { alertDialog, confirmDialog } from "./dialog";
import {
  createDraft,
  GmailTokenExpiredError,
  type CreateDraftInput,
} from "@/lib/mail/gmail/draft";
import {
  applyInlineImageCid,
  base64FromBytes,
  type MimeAttachment,
} from "@/lib/mail/gmail/mime";
import { computeCanSaveDraft, resolveRecipient } from "@/lib/mail/gmail/panel-state";

const LOGGED_OUT: GmailTokenState = {
  token: null,
  expiresAt: null,
  isLoggedIn: false,
  isExpired: false,
};

// 브라우저 File → base64(순수 페이로드). arrayBuffer 는 브라우저 API.
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  return base64FromBytes(new Uint8Array(buf));
}

interface GmailPanelProps {
  ctrl: MailController;
  config: GeneratorConfig;
}

export default function GmailPanel({ ctrl, config }: GmailPanelProps) {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (supabaseRef.current === null) {
    try {
      supabaseRef.current = createClient();
    } catch {
      supabaseRef.current = null;
    }
  }

  const [tokenState, setTokenState] = useState<GmailTokenState>(LOGGED_OUT);
  const [loginStatus, setLoginStatus] = useState("Google 계정을 연결해 주세요.");
  const [draftStatus, setDraftStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // intern·activity 전용 수신자 입력.
  const [recipient, setRecipient] = useState("");

  // sales 파일 첨부.
  const [files, setFiles] = useState<File[]>([]);
  // intern·activity 성과 이미지.
  const [image, setImage] = useState<File | null>(null);

  // sales 중복 발송 확인용 직전 저장값.
  const lastSentRef = useRef<SalesLastSent>({
    recipientEmail: null,
    clientName: null,
    programName: null,
  });

  const validated = config.recipient.validated;
  const attachmentKind = config.attachment.kind;

  // 로그인 상태 갱신(마운트 시 + 로그인 후 콜백 리디렉션 복귀 시).
  const refreshToken = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const state = await getGmailTokenState(supabase);
      setTokenState(state);
      if (state.isLoggedIn) setLoginStatus("Google 계정 연결됨.");
      else if (state.isExpired)
        setLoginStatus("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      else setLoginStatus("Google 계정을 연결해 주세요.");
    } catch {
      setTokenState(LOGGED_OUT);
    }
  }, []);

  useEffect(() => {
    void refreshToken();
  }, [refreshToken]);

  const onLogin = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      setLoginStatus("Supabase 설정이 필요합니다 (.env).");
      await alertDialog(
        "Supabase 설정이 없어 Google 로그인을 시작할 수 없습니다.\n.env 의 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 를 확인해 주세요.",
        { title: "설정 필요", tone: "danger" }
      );
      return;
    }
    try {
      setLoginStatus("Google 로그인으로 이동합니다...");
      await signInWithGoogle(
        supabase,
        typeof window !== "undefined" ? window.location.href : undefined
      );
    } catch (e) {
      setLoginStatus(`로그인 실패: ${(e as Error).message}`);
      await alertDialog(`Google 로그인에 실패했습니다.\n${(e as Error).message}`, {
        title: "로그인 실패",
        tone: "danger",
      });
    }
  }, []);

  const onLogout = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      await signOutGoogle(supabase);
    } catch {
      // 무시 — 상태만 초기화
    }
    setTokenState(LOGGED_OUT);
    setLoginStatus("Google 계정을 연결해 주세요.");
  }, []);

  const canSave = useMemo(
    () =>
      computeCanSaveDraft({
        loggedIn: tokenState.isLoggedIn,
        validated,
        recipient,
        fieldValues: ctrl.fieldValues,
      }),
    [tokenState.isLoggedIn, validated, recipient, ctrl.fieldValues]
  );

  const onSave = useCallback(async () => {
    if (saving || !tokenState.token) return;
    const to = resolveRecipient({
      validated,
      recipient,
      fieldValues: ctrl.fieldValues,
    });

    // sales: 저장 직전 중복 발송/표기 확인(경고, 사용자가 진행/취소).
    if (validated) {
      const guards = collectSalesSendGuards(
        {
          recipientEmail: to,
          clientName: (ctrl.fieldValues.clientName ?? "").trim(),
          programName: (ctrl.fieldValues.programName ?? "").trim(),
          subject: ctrl.resultSubject,
        },
        lastSentRef.current
      );
      for (const guard of guards) {
        const proceed = await confirmDialog(`${guard.message}\n\n계속 진행할까요?`, {
          title: "저장 전 확인",
          confirmText: "진행",
          tone: "danger",
        });
        if (!proceed) return;
      }
    }

    setSaving(true);
    setDraftStatus("임시보관함에 저장하는 중...");
    try {
      const input: CreateDraftInput = {
        to,
        subject: ctrl.resultSubject,
        bodyHtml: ctrl.resultBody,
      };

      if (attachmentKind === "files" && files.length > 0) {
        const attachments: MimeAttachment[] = await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            type: f.type || "application/octet-stream",
            base64: await fileToBase64(f),
          }))
        );
        input.attachments = attachments;
      } else if (attachmentKind === "image" && image) {
        // 본문 placeholder → cid 인라인 참조로 치환.
        input.bodyHtml = applyInlineImageCid(
          ctrl.resultBody,
          config.attachment.placeholderText ?? ""
        );
        input.inlineImage = {
          base64: await fileToBase64(image),
          type: image.type || "image/png",
          filename: image.name || "performance.png",
        };
        // 보존용으로 Supabase Storage 에도 업로드(실패해도 초안 저장은 진행).
        const supabase = supabaseRef.current;
        if (supabase) {
          try {
            await uploadPerformanceImage(supabase, config.key, image);
          } catch {
            // Storage 미연결/실패는 무시
          }
        }
      }

      await createDraft(tokenState.token, input);

      // 저장 기록. 실패해도 초안은 이미 만들어졌으므로 되돌리지 않고 넘어간다.
      const supabaseForLog = supabaseRef.current;
      if (supabaseForLog) {
        const counterpartyId = config.counterpartyFieldId;
        insertDraftLog(supabaseForLog, {
          generator: config.key,
          generator_label: config.label,
          slot: ctrl.active,
          slot_name: ctrl.activeName,
          counterparty: counterpartyId
            ? (ctrl.fieldValues[counterpartyId] ?? "").trim()
            : "",
          recipient: to,
          subject: ctrl.resultSubject,
          field_values: ctrl.fieldValues,
        }).catch(() => {});
      }

      setDraftStatus(`임시보관함에 저장되었습니다. (받는사람: ${to})`);
      if (validated) {
        lastSentRef.current = {
          recipientEmail: to,
          clientName: (ctrl.fieldValues.clientName ?? "").trim(),
          programName: (ctrl.fieldValues.programName ?? "").trim(),
        };
      }
      await alertDialog(
        `받는사람: ${to}\n제목: ${ctrl.resultSubject}\n\n` +
          `발송되지 않았습니다. Gmail 임시보관함에서 확인한 뒤 직접 보내세요.`,
        { title: "임시보관함에 저장했습니다" }
      );
    } catch (e) {
      if (e instanceof GmailTokenExpiredError) {
        setTokenState(LOGGED_OUT);
        setLoginStatus("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        setDraftStatus("토큰이 만료되어 저장하지 못했습니다. 다시 로그인해 주세요.");
        await alertDialog(
          "Google 로그인이 만료되어 저장하지 못했습니다.\n다시 로그인한 뒤 저장해 주세요.",
          { title: "로그인 만료", tone: "danger" }
        );
      } else {
        setDraftStatus(`저장 실패: ${(e as Error).message}`);
        await alertDialog(
          `임시보관함에 저장하지 못했습니다.\n${(e as Error).message}`,
          { title: "저장 실패", tone: "danger" }
        );
      }
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    tokenState.token,
    validated,
    recipient,
    ctrl.fieldValues,
    ctrl.resultSubject,
    ctrl.resultBody,
    attachmentKind,
    files,
    image,
    config.attachment.placeholderText,
    config.key,
  ]);

  return (
    <div className="mg-panel">
      <h2 className="mg-h2">5. Gmail 임시보관함 초안</h2>
      <p className="mg-sub">
        초안(임시보관함)까지만 만듭니다. 발송은 Gmail에서 직접 검수 후 진행하세요.
      </p>

      {/* 로그인 */}
      <div className="mg-actions">
        {tokenState.isLoggedIn ? (
          <button type="button" className="mg-btn" onClick={onLogout}>
            로그아웃
          </button>
        ) : (
          <button type="button" className="mg-btn" onClick={onLogin}>
            Google 로그인
          </button>
        )}
        <span className="mg-status">{loginStatus}</span>
      </div>

      {/* 수신자 — intern·activity 는 패널에서 입력, sales 는 폼(recipientEmail) 사용 */}
      {validated ? (
        <div className="mg-field" style={{ marginTop: 12 }}>
          <label>받는사람 이메일</label>
          <input
            type="email"
            readOnly
            value={ctrl.fieldValues.recipientEmail ?? ""}
            placeholder="위 입력 폼의 '받는사람 이메일' 값이 사용됩니다"
          />
        </div>
      ) : (
        <div className="mg-field" style={{ marginTop: 12 }}>
          <label htmlFor="gmail-recipient">받는사람 이메일</label>
          <input
            id="gmail-recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="예: recruit@company.com"
          />
        </div>
      )}

      {/* 첨부 / 이미지 */}
      {attachmentKind === "files" && (
        <div className="mg-field" style={{ marginTop: 12 }}>
          <label htmlFor="gmail-files">첨부 파일 (PDF 등, 다중 선택)</label>
          <input
            id="gmail-files"
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <div className="mg-sub">{files.map((f) => f.name).join(", ")}</div>
          )}
        </div>
      )}
      {attachmentKind === "image" && (
        <div className="mg-field" style={{ marginTop: 12 }}>
          <label htmlFor="gmail-image">성과 이미지 (본문 인라인 삽입)</label>
          <input
            id="gmail-image"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
          {image && <div className="mg-sub">{image.name}</div>}
        </div>
      )}

      {/* 저장 (발송 버튼 없음) */}
      <div className="mg-actions">
        <button
          type="button"
          className="mg-btn mg-btn-primary"
          disabled={!canSave || saving}
          onClick={onSave}
        >
          임시보관함에 저장
        </button>
        {draftStatus && <span className="mg-status">{draftStatus}</span>}
      </div>
    </div>
  );
}
