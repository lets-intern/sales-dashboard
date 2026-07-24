"use client";

// 제네릭 생성기 컨트롤러 훅. config × 엔진 × Supabase 저장을 하나로 묶는다.
// - 슬롯 5개 전환 + 자동 저장(디바운스 upsert)
// - 기본값 시스템: 공장값 + override + 1단계 backup (불러오기/수정/저장/취소/되돌리기)
// - 폼 값 1벌 + 실시간 치환 결과(제목/본문)
//
// .env.local(Supabase) 없이도 UI 가 동작하도록, 저장소 접근은 전부 try/catch 로 감싼다.
// 저장이 불가하면 메모리 상태로만 동작한다(라이브 왕복은 .env.local 필요).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { substitute, escapeForHtml, identity } from "@/lib/mail/engine/substitute";
import {
  createDebouncer,
  loadSlots,
  upsertSlot,
  loadDefaults,
  saveDefault,
  loadFieldValues,
  saveFieldValues,
} from "@/lib/mail/storage";
import type { DefaultKind, SlotNumber } from "@/lib/mail/types";
import type { GeneratorConfig } from "@/lib/mail/configs/types";

const SLOTS: SlotNumber[] = [1, 2, 3, 4, 5];

interface SlotContent {
  subject: string;
  body: string;
}

export interface MailController {
  slots: SlotNumber[];
  active: SlotNumber;
  slotLocked: boolean;
  switchSlot: (n: SlotNumber) => void;

  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;

  subjectStatus: string;
  bodyStatus: string;

  // 기본값(제목) 컨트롤
  editingSubjectDefault: boolean;
  canRevertSubject: boolean;
  resetSubject: () => void;
  editSubjectDefault: () => void;
  saveSubjectDefault: () => void;
  cancelSubjectDefault: () => void;
  revertSubjectDefault: () => void;

  // 기본값(본문) 컨트롤
  editingBodyDefault: boolean;
  canRevertBody: boolean;
  resetBody: () => void;
  editBodyDefault: () => void;
  saveBodyDefault: () => void;
  cancelBodyDefault: () => void;
  revertBodyDefault: () => void;

  fieldValues: Record<string, string>;
  setFieldValue: (id: string, v: string) => void;

  resultSubject: string;
  resultBody: string;
}

export function useMailGenerator(
  config: GeneratorConfig,
  initialFieldValues: Record<string, string> = {}
): MailController {
  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (supabaseRef.current === null) {
    try {
      supabaseRef.current = createClient();
    } catch {
      supabaseRef.current = null;
    }
  }
  const debouncerRef = useRef(createDebouncer(300));

  const [active, setActive] = useState<SlotNumber>(1);
  const [subject, setSubjectState] = useState(config.factorySubject);
  const [body, setBodyState] = useState(config.factoryBody);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(
    initialFieldValues
  );

  const [subjectStatus, setSubjectStatus] = useState("자동 저장됩니다.");
  const [bodyStatus, setBodyStatus] = useState("자동 저장됩니다.");

  // 기본값 override/backup (null = 미저장)
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);
  const [subjectBackup, setSubjectBackup] = useState<string | null>(null);
  const [bodyOverride, setBodyOverride] = useState<string | null>(null);
  const [bodyBackup, setBodyBackup] = useState<string | null>(null);

  const [editingSubjectDefault, setEditingSubjectDefault] = useState(false);
  const [editingBodyDefault, setEditingBodyDefault] = useState(false);
  const subjectBeforeEdit = useRef("");
  const bodyBeforeEdit = useRef("");

  const slotCache = useRef<Record<number, SlotContent>>({});
  const initialized = useRef(false);

  const currentDefaultSubject = subjectOverride ?? config.factorySubject;
  const currentDefaultBody = bodyOverride ?? config.factoryBody;

  // override 최신값을 콜백에서 읽기 위한 ref (stale 방지)
  const defRef = useRef({
    subjectOverride,
    bodyOverride,
    factorySubject: config.factorySubject,
    factoryBody: config.factoryBody,
  });
  defRef.current = {
    subjectOverride,
    bodyOverride,
    factorySubject: config.factorySubject,
    factoryBody: config.factoryBody,
  };

  // ── 초기 로드 ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseRef.current;
    (async () => {
      try {
        if (supabase) {
          const [slotRows, defaultRows, fv] = await Promise.all([
            loadSlots(supabase, config.key),
            loadDefaults(supabase, config.key),
            loadFieldValues(supabase, config.key),
          ]);
          if (cancelled) return;

          const subjDef = defaultRows.find((d) => d.kind === "subject");
          const bodyDef = defaultRows.find((d) => d.kind === "body");
          if (subjDef) {
            setSubjectOverride(subjDef.override);
            setSubjectBackup(subjDef.backup);
          }
          if (bodyDef) {
            setBodyOverride(bodyDef.override);
            setBodyBackup(bodyDef.backup);
          }
          const defSubject = subjDef?.override ?? config.factorySubject;
          const defBody = bodyDef?.override ?? config.factoryBody;

          for (const row of slotRows) {
            slotCache.current[row.slot] = {
              subject: row.subject,
              body: row.body,
            };
          }
          const first = slotCache.current[1];
          setSubjectState(first?.subject ?? defSubject);
          setBodyState(first?.body ?? defBody);

          if (fv && Object.keys(fv).length > 0) {
            setFieldValues((prev) => ({ ...prev, ...fv }));
          }
        }
      } catch {
        // 저장소 미연결 — 공장 기본값으로 동작
      } finally {
        if (!cancelled) initialized.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // config.key 단위로 1회 로드
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key]);

  const persistSlot = useCallback(
    (slot: number, content: SlotContent) => {
      const supabase = supabaseRef.current;
      if (!supabase || !initialized.current) return;
      upsertSlot(supabase, {
        generator: config.key,
        slot,
        subject: content.subject,
        body: content.body,
      }).catch(() => {});
    },
    [config.key]
  );

  const scheduleSlotSave = useCallback(
    (content: SlotContent) => {
      slotCache.current[active] = content;
      setSubjectStatus("저장 중...");
      setBodyStatus("저장 중...");
      debouncerRef.current.schedule(`slot-${active}`, () => {
        persistSlot(active, content);
        setSubjectStatus(`템플릿 ${active}번에 자동 저장됨`);
        setBodyStatus(`템플릿 ${active}번에 자동 저장됨`);
      });
    },
    [active, persistSlot]
  );

  // ── 제목/본문 편집 ────────────────────────────────────────
  const setSubject = useCallback(
    (v: string) => {
      setSubjectState(v);
      if (!editingSubjectDefault) {
        scheduleSlotSave({ subject: v, body });
      }
    },
    [editingSubjectDefault, body, scheduleSlotSave]
  );

  const setBody = useCallback(
    (v: string) => {
      setBodyState(v);
      if (!editingBodyDefault) {
        scheduleSlotSave({ subject, body: v });
      }
    },
    [editingBodyDefault, subject, scheduleSlotSave]
  );

  // ── 슬롯 전환 ─────────────────────────────────────────────
  const slotLocked = editingSubjectDefault || editingBodyDefault;

  const switchSlot = useCallback(
    (n: SlotNumber) => {
      if (slotLocked || n === active) return;
      // 현재 슬롯 즉시 저장(디바운스 flush)
      debouncerRef.current.cancel(`slot-${active}`);
      slotCache.current[active] = { subject, body };
      persistSlot(active, { subject, body });

      const target = slotCache.current[n];
      const d = defRef.current;
      setSubjectState(target?.subject ?? d.subjectOverride ?? d.factorySubject);
      setBodyState(target?.body ?? d.bodyOverride ?? d.factoryBody);
      setActive(n);
      setSubjectStatus(`템플릿 ${n}번`);
      setBodyStatus(`템플릿 ${n}번`);
    },
    [slotLocked, active, subject, body, persistSlot]
  );

  // ── 폼 값 ─────────────────────────────────────────────────
  const setFieldValue = useCallback(
    (id: string, v: string) => {
      setFieldValues((prev) => {
        const next = { ...prev, [id]: v };
        const supabase = supabaseRef.current;
        if (supabase && initialized.current) {
          debouncerRef.current.schedule("fields", () => {
            saveFieldValues(supabase, config.key, next).catch(() => {});
          });
        }
        return next;
      });
    },
    [config.key]
  );

  // ── 기본값 저장 헬퍼 ──────────────────────────────────────
  const persistDefault = useCallback(
    (kind: DefaultKind, patch: { override?: string | null; backup?: string | null }) => {
      const supabase = supabaseRef.current;
      if (!supabase) return;
      saveDefault(supabase, config.key, kind, patch).catch(() => {});
    },
    [config.key]
  );

  // ── 제목 기본값 컨트롤 ────────────────────────────────────
  const resetSubject = useCallback(() => {
    setSubject(currentDefaultSubject);
  }, [setSubject, currentDefaultSubject]);

  const editSubjectDefault = useCallback(() => {
    if (editingSubjectDefault) return;
    subjectBeforeEdit.current = subject;
    setSubjectState(currentDefaultSubject);
    setEditingSubjectDefault(true);
    setSubjectStatus('기본값을 수정하는 중입니다. "기본값 저장"을 눌러야 실제로 바뀝니다.');
  }, [editingSubjectDefault, subject, currentDefaultSubject]);

  const saveSubjectDefault = useCallback(() => {
    const ok = window.confirm(
      '현재 내용으로 기본값을 저장하시겠습니까?\n기존 기본값은 새 내용으로 대체됩니다. (이전 기본값은 "기본값 되돌리기"로 복원할 수 있습니다.)'
    );
    if (!ok) return;
    const newDefault = subject;
    const current = currentDefaultSubject;
    const patch: { override: string; backup?: string } = { override: newDefault };
    if (newDefault !== current) {
      setSubjectBackup(current);
      patch.backup = current;
    }
    setSubjectOverride(newDefault);
    persistDefault("subject", patch);
    setSubjectState(subjectBeforeEdit.current);
    setEditingSubjectDefault(false);
    setSubjectStatus("기본값이 저장되었습니다.");
  }, [subject, currentDefaultSubject, persistDefault]);

  const cancelSubjectDefault = useCallback(() => {
    setSubjectState(subjectBeforeEdit.current);
    setEditingSubjectDefault(false);
    setSubjectStatus("기본값 수정을 취소했습니다.");
  }, []);

  const revertSubjectDefault = useCallback(() => {
    if (subjectBackup === null) return;
    const ok = window.confirm("기본값을 바로 이전 값으로 되돌리시겠습니까?");
    if (!ok) return;
    const current = currentDefaultSubject;
    setSubjectOverride(subjectBackup);
    setSubjectBackup(current);
    persistDefault("subject", { override: subjectBackup, backup: current });
    setSubjectStatus("기본값을 이전 값으로 되돌렸습니다.");
  }, [subjectBackup, currentDefaultSubject, persistDefault]);

  // ── 본문 기본값 컨트롤 ────────────────────────────────────
  const resetBody = useCallback(() => {
    setBody(currentDefaultBody);
  }, [setBody, currentDefaultBody]);

  const editBodyDefault = useCallback(() => {
    if (editingBodyDefault) return;
    bodyBeforeEdit.current = body;
    setBodyState(currentDefaultBody);
    setEditingBodyDefault(true);
    setBodyStatus('기본값을 수정하는 중입니다. "기본값 저장"을 눌러야 실제로 바뀝니다.');
  }, [editingBodyDefault, body, currentDefaultBody]);

  const saveBodyDefault = useCallback(() => {
    const ok = window.confirm(
      '현재 내용으로 기본값을 저장하시겠습니까?\n기존 기본값은 새 내용으로 대체됩니다. (이전 기본값은 "기본값 되돌리기"로 복원할 수 있습니다.)'
    );
    if (!ok) return;
    const newDefault = body;
    const current = currentDefaultBody;
    const patch: { override: string; backup?: string } = { override: newDefault };
    if (newDefault !== current) {
      setBodyBackup(current);
      patch.backup = current;
    }
    setBodyOverride(newDefault);
    persistDefault("body", patch);
    setBodyState(bodyBeforeEdit.current);
    setEditingBodyDefault(false);
    setBodyStatus("기본값이 저장되었습니다.");
  }, [body, currentDefaultBody, persistDefault]);

  const cancelBodyDefault = useCallback(() => {
    setBodyState(bodyBeforeEdit.current);
    setEditingBodyDefault(false);
    setBodyStatus("기본값 수정을 취소했습니다.");
  }, []);

  const revertBodyDefault = useCallback(() => {
    if (bodyBackup === null) return;
    const ok = window.confirm("기본값을 바로 이전 값으로 되돌리시겠습니까?");
    if (!ok) return;
    const current = currentDefaultBody;
    setBodyOverride(bodyBackup);
    setBodyBackup(current);
    persistDefault("body", { override: bodyBackup, backup: current });
    setBodyStatus("기본값을 이전 값으로 되돌렸습니다.");
  }, [bodyBackup, currentDefaultBody, persistDefault]);

  // ── 실시간 치환 결과 ──────────────────────────────────────
  const rawHtmlKeys = useMemo(
    () => new Set(config.rawHtmlKeys),
    [config.rawHtmlKeys]
  );
  const computed = useMemo(
    () => config.computeValues(fieldValues),
    [config, fieldValues]
  );
  const resultSubject = useMemo(
    () => substitute(subject, computed, identity, rawHtmlKeys),
    [subject, computed, rawHtmlKeys]
  );
  const resultBody = useMemo(
    () => substitute(body, computed, escapeForHtml, rawHtmlKeys),
    [body, computed, rawHtmlKeys]
  );

  return {
    slots: SLOTS,
    active,
    slotLocked,
    switchSlot,
    subject,
    setSubject,
    body,
    setBody,
    subjectStatus,
    bodyStatus,
    editingSubjectDefault,
    canRevertSubject: subjectBackup !== null,
    resetSubject,
    editSubjectDefault,
    saveSubjectDefault,
    cancelSubjectDefault,
    revertSubjectDefault,
    editingBodyDefault,
    canRevertBody: bodyBackup !== null,
    resetBody,
    editBodyDefault,
    saveBodyDefault,
    cancelBodyDefault,
    revertBodyDefault,
    fieldValues,
    setFieldValue,
    resultSubject,
    resultBody,
  };
}
