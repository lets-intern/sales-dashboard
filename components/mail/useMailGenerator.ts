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
  renameSlot as renameSlotRow,
  deleteSlot as deleteSlotRow,
  nextSlotNumber,
  isEmptySlot,
  loadDefaults,
  saveDefault,
  loadFieldValues,
  saveFieldValues,
} from "@/lib/mail/storage";
import {
  INITIAL_SLOT_NUMBERS,
  slotDisplayName,
  type DefaultKind,
  type SlotNumber,
} from "@/lib/mail/types";
import type { GeneratorConfig } from "@/lib/mail/configs/types";
import { confirmDialog } from "./dialog";

interface SlotContent {
  subject: string;
  body: string;
}

// 목록에 표시되는 템플릿 1개. 이름이 빈 문자열이면 "템플릿 N" 으로 표시한다.
export interface SlotMeta {
  slot: SlotNumber;
  name: string;
}

const seedSlots = (): SlotMeta[] =>
  INITIAL_SLOT_NUMBERS.map((slot) => ({ slot, name: "" }));

export interface MailController {
  slots: SlotMeta[];
  active: SlotNumber;
  activeName: string;
  slotLocked: boolean;
  switchSlot: (n: SlotNumber) => void;

  // 템플릿 관리(플로팅 메뉴)
  addSlot: () => void;
  saveCurrentAsSlot: () => void;
  renameSlot: (slot: SlotNumber, name: string) => void;
  removeSlot: (slot: SlotNumber) => void;
  canRemoveSlot: boolean;
  slotStatus: string;

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

  const [slots, setSlots] = useState<SlotMeta[]>(seedSlots);
  const [active, setActive] = useState<SlotNumber>(1);
  const [slotStatus, setSlotStatus] = useState("");
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

          // "행이 존재하면 그 템플릿이 존재한다"가 목록의 기준이다.
          // 아직 한 번도 쓰지 않은 생성기라면 시드 5개를 실제 행으로 만들어 둔다.
          // (행이 있어야 이름을 붙이고 삭제할 수 있다.)
          if (slotRows.length === 0) {
            await Promise.all(
              INITIAL_SLOT_NUMBERS.map((slot) =>
                upsertSlot(
                  supabase,
                  { generator: config.key, slot, subject: "", body: "", name: "" },
                  true
                ).catch(() => {})
              )
            );
            if (cancelled) return;
            setSlots(seedSlots());
          } else {
            setSlots(
              slotRows.map((r) => ({ slot: r.slot, name: r.name ?? "" }))
            );
          }

          const first = slotCache.current[slotRows[0]?.slot ?? 1];
          const firstActive = slotRows[0]?.slot ?? 1;
          setActive(firstActive);
          const hasContent =
            first && !isEmptySlot(first.subject, first.body);
          setSubjectState(hasContent ? first.subject : defSubject);
          setBodyState(hasContent ? first.body : defBody);

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

  // 콜백에서 최신 슬롯 목록을 읽기 위한 ref (stale 방지)
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const nameOf = useCallback(
    (n: SlotNumber) =>
      slotDisplayName(n, slotsRef.current.find((s) => s.slot === n)?.name),
    []
  );

  const scheduleSlotSave = useCallback(
    (content: SlotContent) => {
      slotCache.current[active] = content;
      setSubjectStatus("저장 중...");
      setBodyStatus("저장 중...");
      debouncerRef.current.schedule(`slot-${active}`, () => {
        persistSlot(active, content);
        setSubjectStatus(`${nameOf(active)}에 자동 저장됨`);
        setBodyStatus(`${nameOf(active)}에 자동 저장됨`);
      });
    },
    [active, persistSlot, nameOf]
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

      // 내용이 비어 있는 템플릿은 베이스 템플릿(기본값) 내용으로 채워 시작한다.
      const target = slotCache.current[n];
      const d = defRef.current;
      const hasContent = target && !isEmptySlot(target.subject, target.body);
      setSubjectState(
        hasContent ? target.subject : d.subjectOverride ?? d.factorySubject
      );
      setBodyState(hasContent ? target.body : d.bodyOverride ?? d.factoryBody);
      setActive(n);
      setSubjectStatus(nameOf(n));
      setBodyStatus(nameOf(n));
    },
    [slotLocked, active, subject, body, persistSlot, nameOf]
  );

  // ── 템플릿 관리(추가/이름변경/삭제) ───────────────────────
  // 현재 편집 중인 슬롯을 즉시 확정 저장한다(디바운스 대기 중인 내용 유실 방지).
  const commitActive = useCallback(() => {
    debouncerRef.current.cancel(`slot-${active}`);
    slotCache.current[active] = { subject, body };
    persistSlot(active, { subject, body });
  }, [active, subject, body, persistSlot]);

  // 새 슬롯을 만들고 그 슬롯으로 이동한다. content 가 곧 새 템플릿의 초기 내용이다.
  const createSlot = useCallback(
    (content: SlotContent, status: string) => {
      if (slotLocked) return;
      commitActive();

      const n = nextSlotNumber(slotsRef.current.map((s) => s.slot));
      const supabase = supabaseRef.current;
      if (supabase && initialized.current) {
        upsertSlot(
          supabase,
          {
            generator: config.key,
            slot: n,
            subject: content.subject,
            body: content.body,
            name: "",
          },
          true
        ).catch(() => {});
      }

      slotCache.current[n] = content;
      setSlots((prev) => [...prev, { slot: n, name: "" }]);
      setSubjectState(content.subject);
      setBodyState(content.body);
      setActive(n);
      setSlotStatus(status);
      setSubjectStatus(`템플릿 ${n}`);
      setBodyStatus(`템플릿 ${n}`);
    },
    [slotLocked, commitActive, config.key]
  );

  // 새 템플릿 — 베이스 템플릿(기본값) 내용으로 시작한다.
  const addSlot = useCallback(() => {
    const d = defRef.current;
    createSlot(
      {
        subject: d.subjectOverride ?? d.factorySubject,
        body: d.bodyOverride ?? d.factoryBody,
      },
      "베이스 템플릿 내용으로 새 템플릿을 만들었습니다."
    );
  }, [createSlot]);

  // 수정사항을 템플릿으로 저장 — 지금 편집 중인 내용을 새 템플릿으로 복제한다.
  const saveCurrentAsSlot = useCallback(() => {
    createSlot({ subject, body }, "현재 내용을 새 템플릿으로 저장했습니다.");
  }, [createSlot, subject, body]);

  const renameSlot = useCallback(
    (slot: SlotNumber, name: string) => {
      // 기본 표시명("템플릿 N")을 그대로 확정하면 이름 없음으로 되돌린다.
      // 이름 입력창이 기본명으로 채워지므로, 확인만 눌러도 같은 값이 저장되는 걸 막는다.
      const raw = name.trim();
      const trimmed = raw === `템플릿 ${slot}` ? "" : raw;
      setSlots((prev) =>
        prev.map((s) => (s.slot === slot ? { ...s, name: trimmed } : s))
      );
      const supabase = supabaseRef.current;
      if (supabase && initialized.current) {
        renameSlotRow(supabase, config.key, slot, trimmed).catch(() => {});
      }
      setSlotStatus(`이름을 "${slotDisplayName(slot, trimmed)}"(으)로 바꿨습니다.`);
    },
    [config.key]
  );

  const removeSlot = useCallback(
    async (slot: SlotNumber) => {
      if (slotLocked) return;
      const list = slotsRef.current;
      if (list.length <= 1) return; // 마지막 1개는 삭제하지 않는다

      const label = slotDisplayName(
        slot,
        list.find((s) => s.slot === slot)?.name
      );
      const ok = await confirmDialog(
        `"${label}"을(를) 삭제할까요?\n저장된 제목·본문이 함께 지워지며 되돌릴 수 없습니다.`,
        { title: "템플릿 삭제", confirmText: "삭제", tone: "danger" }
      );
      if (!ok) return;

      debouncerRef.current.cancel(`slot-${slot}`);
      delete slotCache.current[slot];
      const remaining = list.filter((s) => s.slot !== slot);
      setSlots(remaining);

      const supabase = supabaseRef.current;
      if (supabase && initialized.current) {
        deleteSlotRow(supabase, config.key, slot).catch(() => {});
      }

      // 삭제한 슬롯을 보고 있었다면 남은 첫 슬롯으로 이동한다.
      if (active === slot) {
        const next = remaining[0];
        const cached = slotCache.current[next.slot];
        const d = defRef.current;
        const hasContent = cached && !isEmptySlot(cached.subject, cached.body);
        setSubjectState(
          hasContent ? cached.subject : d.subjectOverride ?? d.factorySubject
        );
        setBodyState(hasContent ? cached.body : d.bodyOverride ?? d.factoryBody);
        setActive(next.slot);
      }
      setSlotStatus(`"${label}"을(를) 삭제했습니다.`);
    },
    [slotLocked, active, config.key]
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

  const saveSubjectDefault = useCallback(async () => {
    const ok = await confirmDialog(
      '현재 내용으로 기본값을 저장할까요?\n기존 기본값은 새 내용으로 대체됩니다. 이전 기본값은 "기본값 되돌리기"로 복원할 수 있습니다.',
      { title: "기본값 저장", confirmText: "저장" }
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

  const revertSubjectDefault = useCallback(async () => {
    if (subjectBackup === null) return;
    const ok = await confirmDialog("기본값을 바로 이전 값으로 되돌릴까요?", {
      title: "기본값 되돌리기",
      confirmText: "되돌리기",
    });
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

  const saveBodyDefault = useCallback(async () => {
    const ok = await confirmDialog(
      '현재 내용으로 기본값을 저장할까요?\n기존 기본값은 새 내용으로 대체됩니다. 이전 기본값은 "기본값 되돌리기"로 복원할 수 있습니다.',
      { title: "기본값 저장", confirmText: "저장" }
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

  const revertBodyDefault = useCallback(async () => {
    if (bodyBackup === null) return;
    const ok = await confirmDialog("기본값을 바로 이전 값으로 되돌릴까요?", {
      title: "기본값 되돌리기",
      confirmText: "되돌리기",
    });
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
    slots,
    active,
    activeName: slotDisplayName(
      active,
      slots.find((s) => s.slot === active)?.name
    ),
    slotLocked,
    switchSlot,
    addSlot,
    saveCurrentAsSlot,
    renameSlot,
    removeSlot,
    canRemoveSlot: slots.length > 1,
    slotStatus,
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
