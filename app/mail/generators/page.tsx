"use client";

// /mail/generators — 생성기 정의(JSON) 편집.
//
// 폼 빌더 UI 는 만들지 않는다. 같은 JSON 스키마 위에 나중에 얹을 수 있고, 지금은
// 텍스트 편집으로 충분하다. 대신 저장 전에 반드시 검증해서, 잘못된 정의가 DB 로
// 들어가 생성기가 조용히 깨지는 일을 막는다.

import "@/components/mail/mail.css";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { alertDialog, confirmDialog } from "@/components/mail/dialog";
import {
  outputNames,
  parseGeneratorDefinition,
} from "@/lib/mail/generators/definition";
import {
  deleteGenerator,
  generatorFootprint,
  loadGenerators,
  setGeneratorEnabled,
  upsertGenerator,
  type BrokenGenerator,
  type LoadedGenerator,
} from "@/lib/mail/generators/store";
import { SEED_DEFINITIONS } from "@/lib/mail/generators/seed";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

// 새 생성기는 백지보다 기존 하나를 복제해 시작하는 편이 쓰기 쉽다.
function newDefinitionDraft(): string {
  const base = JSON.parse(pretty(SEED_DEFINITIONS[0]));
  base.key = "new-generator";
  base.label = "새 생성기";
  return pretty(base);
}

export default function GeneratorsPage() {
  const [rows, setRows] = useState<LoadedGenerator[]>([]);
  const [broken, setBroken] = useState<BrokenGenerator[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const result = await loadGenerators(supabase);
    setRows(result.generators);
    setBroken(result.broken);
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await refresh();
        if (cancelled) return;
        const first = result.generators[0];
        if (first) {
          setSelected(first.key);
          setDraft(pretty(first.definition));
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("");
          await alertDialog(
            `생성기 목록을 불러오지 못했습니다.\n${(e as Error).message}`,
            { title: "불러오기 실패", tone: "danger" }
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const select = (row: LoadedGenerator) => {
    setSelected(row.key);
    setDraft(pretty(row.definition));
    setErrors([]);
    setStatus("");
  };

  const startNew = async () => {
    setSelected(null);
    setDraft(newDefinitionDraft());
    setErrors([]);
    setStatus("새 생성기입니다. key 와 label 을 바꾸고 저장하세요.");
    await alertDialog(
      "콜드메일 정의를 복제해 편집기에 넣었습니다.\n\n" +
        "key 와 label 을 바꾼 뒤 저장하세요. key 는 템플릿·기본값·저장 기록을 묶는 " +
        "이름이라 저장한 뒤에는 바꾸기 어렵습니다.",
      { title: "새 생성기" }
    );
  };

  const validate = async () => {
    const result = parseGeneratorDefinition(draft);
    setErrors(result.ok ? [] : result.errors);
    setStatus("");
    if (result.ok) {
      const def = result.definition;
      const placeholders = def.fields.flatMap(outputNames);
      await alertDialog(
        `정의가 올바릅니다.\n\n` +
          `탭 이름: ${def.label}\n` +
          `필드 ${def.fields.length}개, 플레이스홀더 ${placeholders.length}개\n` +
          `${placeholders.map((n) => `{{${n}}}`).join(" ")}`,
        { title: "검증 결과" }
      );
    } else {
      await alertDialog(
        `고칠 곳이 ${result.errors.length}군데 있습니다. 편집기 아래에 자세히 표시했습니다.`,
        { title: "검증 결과", tone: "danger" }
      );
    }
    return result;
  };

  const save = async () => {
    if (saving) return;
    const result = parseGeneratorDefinition(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setStatus("");
      await alertDialog(
        `정의가 올바르지 않아 저장하지 않았습니다.\n고칠 곳 ${result.errors.length}군데를 편집기 아래에 표시했습니다.`,
        { title: "저장하지 않음", tone: "danger" }
      );
      return;
    }
    setErrors([]);

    // key 를 바꾸면 새 생성기가 된다. 기존 key 의 슬롯·기본값·저장 기록은 따라오지 않는다.
    if (selected && result.definition.key !== selected) {
      const ok = await confirmDialog(
        `key 를 "${selected}" 에서 "${result.definition.key}" 로 바꾸면 새 생성기가 됩니다.\n` +
          `기존 템플릿·기본값·저장 기록은 "${selected}" 에 남고 따라오지 않습니다.\n\n계속할까요?`,
        { title: "key 변경", confirmText: "계속", tone: "danger" }
      );
      if (!ok) return;
    }

    setSaving(true);
    setStatus("저장 중...");
    try {
      const supabase = createClient();
      const order = selected
        ? rows.find((r) => r.key === selected)?.sortOrder
        : rows.length;
      await upsertGenerator(supabase, result.definition.key, result.definition, {
        sortOrder: order ?? rows.length,
        enabled: true,
      });
      await refresh();
      setSelected(result.definition.key);
      setStatus("저장했습니다.");
      await alertDialog(`"${result.definition.label}" 정의를 저장했습니다.`, {
        title: "저장 완료",
      });
    } catch (e) {
      setStatus("");
      await alertDialog(`저장하지 못했습니다.\n${(e as Error).message}`, {
        title: "저장 실패",
        tone: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: LoadedGenerator) => {
    const label = row.definition.label;
    let footprint;
    try {
      footprint = await generatorFootprint(createClient(), row.key);
    } catch (e) {
      await alertDialog(
        `삭제 범위를 확인하지 못했습니다.\n${(e as Error).message}`,
        { title: "삭제 준비 실패", tone: "danger" }
      );
      return;
    }

    const removed = [
      `생성기 정의 (${row.key})`,
      `템플릿 ${footprint.slots}개 — 제목·본문 전부`,
      footprint.hasDefaults ? "베이스 템플릿(기본값)과 되돌리기용 백업" : null,
      footprint.hasFieldValues ? "마지막으로 입력했던 값" : null,
    ].filter(Boolean);

    const ok = await confirmDialog(
      `"${label}" 을(를) 삭제합니다. 되돌릴 수 없습니다.\n\n` +
        `함께 지워지는 것\n${removed.map((r) => `  · ${r}`).join("\n")}\n\n` +
        `남는 것\n  · 임시보관함 저장 기록 ${footprint.draftLogs}건\n` +
        `    (어디에 무엇을 보냈는지의 기록이라 지우지 않습니다)\n\n` +
        `감추기만 해도 탭에서는 보이지 않습니다. 되살릴 생각이 조금이라도 있으면 ` +
        `삭제 대신 감추기를 쓰세요.`,
      {
        title: "생성기 삭제",
        confirmText: "삭제",
        tone: "danger",
        requireText: "삭제하겠습니다",
      }
    );
    if (!ok) return;

    try {
      await deleteGenerator(createClient(), row.key);
      const result = await refresh();
      if (selected === row.key) {
        const first = result.generators[0];
        setSelected(first?.key ?? null);
        setDraft(first ? pretty(first.definition) : "");
        setErrors([]);
      }
      setStatus("");
      await alertDialog(`"${label}" 을(를) 삭제했습니다.`, { title: "삭제 완료" });
    } catch (e) {
      setStatus("");
      await alertDialog(`삭제하지 못했습니다.\n${(e as Error).message}`, {
        title: "삭제 실패",
        tone: "danger",
      });
    }
  };

  const toggleEnabled = async (row: LoadedGenerator) => {
    const next = !row.enabled;
    const ok = await confirmDialog(
      next
        ? `"${row.definition.label}" 을(를) 다시 표시할까요?`
        : `"${row.definition.label}" 을(를) 탭에서 감출까요?\n` +
            `정의와 템플릿·저장 기록은 그대로 남고, 언제든 다시 표시할 수 있습니다.`,
      {
        title: next ? "다시 표시" : "탭에서 감추기",
        confirmText: next ? "표시" : "감추기",
      }
    );
    if (!ok) return;
    try {
      await setGeneratorEnabled(createClient(), row.key, next);
      await refresh();
      setStatus("");
      await alertDialog(
        next
          ? `"${row.definition.label}" 을(를) 다시 표시합니다.`
          : `"${row.definition.label}" 을(를) 탭에서 감췄습니다.`,
        { title: "변경 완료" }
      );
    } catch (e) {
      setStatus("");
      await alertDialog(`변경하지 못했습니다.\n${(e as Error).message}`, {
        title: "변경 실패",
        tone: "danger",
      });
    }
  };

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark" />
          <b>생성기 관리</b>
        </div>
        <div className="spacer" />
        <Link className="tab" href="/mail">
          ← 메일 생성기
        </Link>
      </div>

      <main>
        <div className="mg-root">
          {broken.length > 0 && (
            <div className="mg-warning">
              정의가 올바르지 않아 목록에서 빠진 생성기가 있습니다. 여기서는 고칠 수
              없으니 Supabase 에서 직접 수정해야 합니다.
              <ul>
                {broken.map((b) => (
                  <li key={b.key}>
                    <b>{b.key}</b> — {b.errors.join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mg-panel">
            <div className="mg-h2-row">
              <h2 className="mg-h2">생성기</h2>
              <button type="button" className="mg-btn" onClick={startNew}>
                새 생성기
              </button>
            </div>

            {loading ? (
              <div className="mg-sub">불러오는 중...</div>
            ) : (
              <ul className="gen-list">
                {rows.map((row) => (
                  <li key={row.key} className="gen-item">
                    <button
                      type="button"
                      className={`gen-select${selected === row.key ? " active" : ""}`}
                      onClick={() => select(row)}
                    >
                      <b>{row.definition.label}</b>
                      <span className="gen-key">{row.key}</span>
                      {!row.enabled && <span className="gen-hidden">감춤</span>}
                    </button>
                    <button
                      type="button"
                      className="mg-btn"
                      onClick={() => toggleEnabled(row)}
                    >
                      {row.enabled ? "감추기" : "표시"}
                    </button>
                    <button
                      type="button"
                      className="mg-btn gen-delete"
                      onClick={() => remove(row)}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mg-panel">
            <div className="mg-h2-row">
              <h2 className="mg-h2">
                정의 (JSON){selected ? ` — ${selected}` : " — 새 생성기"}
              </h2>
              <div className="gen-actions">
                <button type="button" className="mg-btn" onClick={validate}>
                  검증
                </button>
                <button
                  type="button"
                  className="mg-btn mg-btn-primary"
                  onClick={save}
                  disabled={saving}
                >
                  저장
                </button>
              </div>
            </div>

            <textarea
              className="gen-editor"
              spellCheck={false}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setErrors([]);
                setStatus("");
              }}
              placeholder="생성기 정의 JSON"
            />

            {errors.length > 0 && (
              <div className="mg-warning gen-errors">
                저장하지 않았습니다. 아래를 고쳐 주세요.
                <ul>
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {status && <div className="mg-sub">{status}</div>}

            <div className="mg-sub gen-help">
              필드 하나가 플레이스홀더 하나입니다. <code>name</code> 이 본문의{" "}
              <code>{"{{이름}}"}</code> 이 되고, 폼에 다른 이름을 쓰려면{" "}
              <code>label</code> 을 따로 줍니다. 타입은 text · email · select · date ·
              period 이며, date 는 <code>format</code> 으로 표기(full · short · weekday ·
              dday)를 고릅니다. 같은 입력을 다른 표기로 한 번 더 쓰려면{" "}
              <code>also</code> 에 이름을 적습니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
