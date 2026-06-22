"use client";

import { useMemo, useState } from "react";
import { RtnStoreProvider, useRtn } from "./store";
import {
  ALL_CHECK_KEYS,
  BODYS,
  MOODS,
  RTN_PERSON,
  STEPS,
  type Choice,
  type RtnItem,
  type Step,
} from "@/lib/routine/constants";
import type { RtnDay } from "@/lib/routine/types";
import { addDays, ymd } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function fmtKDate(date: string): string {
  const d = new Date(date + "T00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function dayPct(rec: RtnDay | undefined): number {
  if (!rec) return 0;
  const done = ALL_CHECK_KEYS.filter((k) => rec.checks[k]).length;
  return Math.round((done / ALL_CHECK_KEYS.length) * 100);
}

/* ───────────────────────── 항목 렌더러 (체크 · 시각) ───────────────────────── */

function ItemRow({ it, date }: { it: RtnItem; date: string }) {
  const { getDay, toggleCheck, setTime, setNum, setText } = useRtn();
  const day = getDay(date);

  if (it.kind === "time") {
    return (
      <label className="rtn-field">
        <span className="rtn-field-label">
          {it.label}
          {it.target && <em className="rtn-target">목표 {it.target}</em>}
        </span>
        <input
          type="time"
          value={day.times[it.key] || ""}
          onChange={(e) => setTime(date, it.key, e.target.value)}
        />
      </label>
    );
  }

  if (it.kind === "number") {
    return (
      <label className="rtn-field">
        <span className="rtn-field-label">{it.label}</span>
        <span className="rtn-numfield">
          <input
            type="number"
            min={0}
            step="0.1"
            inputMode="decimal"
            placeholder="0"
            value={day.nums[it.key] ? String(day.nums[it.key]) : ""}
            onChange={(e) => setNum(date, it.key, Number(e.target.value) || 0)}
          />
          {it.unit && <i>{it.unit}</i>}
        </span>
      </label>
    );
  }

  const on = !!day.checks[it.key];
  return (
    <div className="rtn-item">
      <button
        className={`rtn-check${on ? " on" : ""}`}
        onClick={() => toggleCheck(date, it.key)}
      >
        <span className="rtn-box">{on ? "✓" : ""}</span>
        <span className="rtn-check-label">{it.label}</span>
      </button>

      {on && it.minutes && (
        <div className="rtn-addon">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            value={day.nums[it.key + "_min"] ? String(day.nums[it.key + "_min"]) : ""}
            onChange={(e) => setNum(date, it.key + "_min", Number(e.target.value) || 0)}
          />
          <span>분 탔어요</span>
        </div>
      )}
      {on && it.menu && (
        <div className="rtn-addon">
          <input
            type="text"
            placeholder="무엇을 먹었나요?"
            value={day.texts[it.key + "_menu"] || ""}
            onChange={(e) => setText(date, it.key + "_menu", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 스텝 본문 ───────────────────────── */

function ChoiceRow({
  options,
  field,
  date,
  big,
}: {
  options: Choice[];
  field: "mood" | "body";
  date: string;
  big?: boolean;
}) {
  const { getDay, setChoice } = useRtn();
  const sel = getDay(date)[field];
  return (
    <div className={`rtn-choices${big ? " big" : ""}`}>
      {options.map((c) => (
        <button
          key={c.key}
          className={`rtn-choice${sel === c.key ? " on" : ""}`}
          onClick={() => setChoice(date, field, c.key)}
        >
          <span>{c.emoji}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}

function TodoBlock({ date }: { date: string }) {
  const { getDay, addTodo, toggleTodo, editTodo, removeTodo } = useRtn();
  const day = getDay(date);
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    addTodo(date, t);
    setDraft("");
  };

  return (
    <div className="rtn-todos">
      <div className="rtn-todo-add">
        <input
          type="text"
          placeholder="할 일을 입력하고 Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add}>추가</button>
      </div>
      {day.todos.length === 0 ? (
        <p className="rtn-todo-empty">아직 추가한 투두가 없어요</p>
      ) : (
        <ul className="rtn-todo-list">
          {day.todos.map((t) => (
            <li key={t.id} className={t.done ? "done" : ""}>
              <button
                className={`rtn-box${t.done ? " on" : ""}`}
                onClick={() => toggleTodo(date, t.id)}
              >
                {t.done ? "✓" : ""}
              </button>
              <input
                value={t.text}
                onChange={(e) => editTodo(date, t.id, e.target.value)}
              />
              <button className="rtn-todo-del" onClick={() => removeTodo(date, t.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepBody({ step, date }: { step: Step; date: string }) {
  const { getDay, setTime, setField } = useRtn();
  const day = getDay(date);

  switch (step.kind) {
    case "mood":
      return <ChoiceRow options={MOODS} field="mood" date={date} big />;
    case "body":
      return <ChoiceRow options={BODYS} field="body" date={date} big />;
    case "time":
      return (
        <div className="rtn-time-big">
          <input
            type="time"
            value={day.times[step.key] || ""}
            onChange={(e) => setTime(date, step.key, e.target.value)}
          />
          {step.target && <span className="rtn-target">목표 {step.target}</span>}
        </div>
      );
    case "todos":
      return <TodoBlock date={date} />;
    case "note":
      return (
        <textarea
          className="rtn-note"
          placeholder={step.placeholder}
          value={day[step.field]}
          onChange={(e) => setField(date, step.field, e.target.value)}
        />
      );
    case "checks":
      return (
        <div className="rtn-items">
          {step.items.map((it) => (
            <ItemRow key={it.key} it={it} date={date} />
          ))}
        </div>
      );
  }
}

/* ───────────────────────── 단계별 플로우 ───────────────────────── */

function DayFlow({
  date,
  onBack,
  onOverview,
}: {
  date: string;
  onBack: () => void;
  onOverview: () => void;
}) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const stepEmoji = step.kind === "checks" ? step.emoji : "🌿";

  return (
    <div className="rtn-flow">
      <div className="rtn-flow-bar">
        <button className="rtn-iconbtn" onClick={onBack} aria-label="달력으로">
          ‹
        </button>
        <b>{fmtKDate(date)}</b>
        <button className="rtn-textbtn" onClick={onOverview}>
          한눈에 보기
        </button>
      </div>

      <div className="rtn-progress-line">
        {STEPS.map((s, idx) => (
          <span
            key={s.id}
            className={`seg${idx < i ? " done" : ""}${idx === i ? " cur" : ""}`}
            onClick={() => setI(idx)}
          />
        ))}
      </div>

      <div className="rtn-step" key={step.id}>
        <div className="rtn-step-emoji">{stepEmoji}</div>
        <h2 className="rtn-step-q">{step.q}</h2>
        {step.sub && <p className="rtn-step-sub">{step.sub}</p>}
        <div className="rtn-step-body">
          <StepBody step={step} date={date} />
        </div>
      </div>

      <div className="rtn-flow-nav">
        <button className="rtn-nav-prev" disabled={i === 0} onClick={() => setI(i - 1)}>
          이전
        </button>
        <span className="rtn-step-count">
          {i + 1} / {STEPS.length}
        </span>
        {last ? (
          <button className="rtn-nav-next done" onClick={onBack}>
            기록 완료 ✓
          </button>
        ) : (
          <button className="rtn-nav-next" onClick={() => setI(i + 1)}>
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── 한눈에 보기 (전체 편집) ───────────────────────── */

function DayOverview({
  date,
  onBack,
  onFlow,
}: {
  date: string;
  onBack: () => void;
  onFlow: () => void;
}) {
  return (
    <div className="rtn-overview">
      <div className="rtn-flow-bar">
        <button className="rtn-iconbtn" onClick={onBack} aria-label="달력으로">
          ‹
        </button>
        <b>{fmtKDate(date)}</b>
        <button className="rtn-textbtn" onClick={onFlow}>
          단계별로
        </button>
      </div>

      {STEPS.map((step) => (
        <section key={step.id} className="rtn-card rtn-ov-sec">
          <h3 className="rtn-ov-title">
            <span>{step.kind === "checks" ? step.emoji : "🌿"}</span>
            {step.q}
          </h3>
          <StepBody step={step} date={date} />
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────── 캘린더 대시보드 ───────────────────────── */

function Calendar({ onPick }: { onPick: (date: string) => void }) {
  const { days } = useRtn();
  const today = new Date(ymd(new Date()) + "T00:00");
  const todayStr = ymd(today);
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(cur.y, cur.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let p = 0; p < startPad; p++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(ymd(new Date(cur.y, cur.m, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cur]);

  // 이번 달 기록한 날 수 + 오늘 기준 연속 기록
  const recordedThisMonth = cells.filter(
    (c) => c && days[c] && dayPct(days[c]) > 0
  ).length;
  let streak = 0;
  for (let k = 0; ; k++) {
    const d = ymd(addDays(today, -k));
    if (days[d] && dayPct(days[d]) > 0) streak++;
    else break;
  }

  const prevMonth = () =>
    setCur(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const nextMonth = () =>
    setCur(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));
  const isFutureMonth = cur.y > today.getFullYear() || (cur.y === today.getFullYear() && cur.m >= today.getMonth());

  return (
    <div className="rtn-cal">
      <div className="rtn-cal-stats">
        <div className="rtn-stat">
          <b>{streak}</b>
          <span>연속 기록</span>
        </div>
        <div className="rtn-stat">
          <b>{recordedThisMonth}</b>
          <span>이번 달 기록</span>
        </div>
        <button className="rtn-today-btn" onClick={() => onPick(todayStr)}>
          오늘 기록하기 →
        </button>
      </div>

      <div className="rtn-cal-head">
        <button className="rtn-iconbtn" onClick={prevMonth} aria-label="이전 달">
          ‹
        </button>
        <b>
          {cur.y}년 {cur.m + 1}월
        </b>
        <button
          className="rtn-iconbtn"
          onClick={nextMonth}
          disabled={isFutureMonth}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="rtn-cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="rtn-cal-grid">
        {cells.map((c, idx) => {
          if (!c) return <span key={idx} className="rtn-cal-cell empty" />;
          const rec = days[c];
          const pct = dayPct(rec);
          const future = c > todayStr;
          const isToday = c === todayStr;
          const dnum = Number(c.slice(8, 10));
          const hasTodo = rec && rec.todos && rec.todos.length > 0;
          return (
            <button
              key={c}
              className={`rtn-cal-cell${isToday ? " today" : ""}${future ? " future" : ""}`}
              disabled={future}
              onClick={() => onPick(c)}
              style={
                pct > 0
                  ? { background: `rgba(44,122,63,${0.12 + (pct / 100) * 0.5})` }
                  : undefined
              }
            >
              <i>{dnum}</i>
              {pct >= 100 && <em className="rtn-cal-done">✓</em>}
              {hasTodo && pct < 100 && <em className="rtn-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── 앱 셸 ───────────────────────── */

function AppInner() {
  const { loading, error, toastMsg } = useRtn();
  const [date, setDate] = useState<string | null>(null);
  const [mode, setMode] = useState<"flow" | "overview">("flow");

  return (
    <div className="rtn-wrap">
      <header className="rtn-top">
        <div className="rtn-brand">
          <span className="rtn-mark">🌿</span>
          <b>{RTN_PERSON} 루틴</b>
        </div>
        <div className={`rtn-sync${loading ? "" : " live"}`}>
          <span className="rtn-dot" />
          {loading ? "연결 중" : error ? "오류" : "저장됨"}
        </div>
      </header>

      <main className="rtn-main">
        {error && (
          <div className="rtn-card rtn-error">
            <b>기록을 불러오지 못했어요.</b>
            <div>
              Supabase 테이블이 아직 없을 수 있어요. <code>supabase/routine_schema.sql</code>{" "}
              을 실행한 뒤 새로고침하세요. ({error})
            </div>
          </div>
        )}

        {date === null ? (
          <Calendar
            onPick={(d) => {
              setMode("flow");
              setDate(d);
            }}
          />
        ) : mode === "flow" ? (
          <DayFlow
            date={date}
            onBack={() => setDate(null)}
            onOverview={() => setMode("overview")}
          />
        ) : (
          <DayOverview
            date={date}
            onBack={() => setDate(null)}
            onFlow={() => setMode("flow")}
          />
        )}
      </main>

      <div id="toast" className={toastMsg ? "show" : ""}>
        {toastMsg}
      </div>
    </div>
  );
}

export default function RoutineApp() {
  return (
    <RtnStoreProvider>
      <AppInner />
    </RtnStoreProvider>
  );
}
