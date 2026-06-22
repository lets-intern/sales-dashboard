"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRtnClient } from "@/utils/supabase/routine-client";
import type { RtnDay, RtnTextField, Todo } from "@/lib/routine/types";
import { emptyDay } from "@/lib/routine/types";
import { uid } from "@/lib/utils";

type Store = {
  loading: boolean;
  error: string | null;
  toastMsg: string;
  days: Record<string, RtnDay>; // date -> 기록
  getDay: (date: string) => RtnDay; // 없으면 빈 기록 반환
  toggleCheck: (date: string, key: string) => void;
  setTime: (date: string, key: string, value: string) => void;
  setNum: (date: string, key: string, value: number) => void;
  setText: (date: string, key: string, value: string) => void;
  setChoice: (date: string, field: "mood" | "body", value: string) => void;
  setField: (date: string, field: RtnTextField, value: string) => void;
  addTodo: (date: string, text: string) => void;
  toggleTodo: (date: string, id: string) => void;
  editTodo: (date: string, id: string, text: string) => void;
  removeTodo: (date: string, id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useRtn() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useRtn must be used within RtnStoreProvider");
  return ctx;
}

export function RtnStoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createRtnClient(), []);
  const [days, setDays] = useState<Record<string, RtnDay>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 1400);
  }, []);

  // 최근 기록 전부 불러오기 (한 사람용이라 양이 적음)
  useEffect(() => {
    if (!supabase) {
      setError(
        "루틴 전용 Supabase가 아직 연결되지 않았어요. .env.local 에 NEXT_PUBLIC_RTN_SUPABASE_URL / NEXT_PUBLIC_RTN_SUPABASE_ANON_KEY 를 채워주세요."
      );
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("rtn_days")
        .select("*")
        .order("date", { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      const map: Record<string, RtnDay> = {};
      for (const r of (data as RtnDay[]) || []) {
        map[r.date] = {
          date: r.date,
          checks: r.checks || {},
          times: r.times || {},
          nums: r.nums || {},
          texts: r.texts || {},
          todos: Array.isArray(r.todos) ? r.todos : [],
          mood: r.mood || "",
          body: r.body || "",
          morning_note: r.morning_note || "",
          night_note: r.night_note || "",
        };
      }
      setDays(map);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const getDay = useCallback(
    (date: string) => days[date] || emptyDay(date),
    [days]
  );

  // 날짜별 디바운스 업서트
  const dbTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const writeDb = useCallback(
    (row: RtnDay) => {
      if (!supabase) return; // 미설정 시 로컬에서만 동작
      supabase
        .from("rtn_days")
        .upsert(row, { onConflict: "date" })
        .then(({ error }) => {
          if (error) showToast("저장 실패: " + error.message);
          else showToast("저장됨");
        });
    },
    [supabase, showToast]
  );
  const scheduleSave = useCallback(
    (row: RtnDay, debounce: boolean) => {
      if (!debounce) {
        writeDb(row);
        return;
      }
      const key = row.date;
      if (dbTimers.current[key]) clearTimeout(dbTimers.current[key]);
      dbTimers.current[key] = setTimeout(() => writeDb(row), 600);
    },
    [writeDb]
  );

  // 공통 변경 헬퍼: 로컬 상태 갱신 후 저장
  const mutate = useCallback(
    (date: string, fn: (d: RtnDay) => RtnDay, debounce: boolean) => {
      setDays((prev) => {
        const cur = prev[date] || emptyDay(date);
        const next = fn(cur);
        scheduleSave(next, debounce);
        return { ...prev, [date]: next };
      });
    },
    [scheduleSave]
  );

  const toggleCheck = useCallback(
    (date: string, key: string) =>
      mutate(
        date,
        (d) => ({ ...d, checks: { ...d.checks, [key]: !d.checks[key] } }),
        false
      ),
    [mutate]
  );
  const setTime = useCallback(
    (date: string, key: string, value: string) =>
      mutate(date, (d) => ({ ...d, times: { ...d.times, [key]: value } }), true),
    [mutate]
  );
  const setNum = useCallback(
    (date: string, key: string, value: number) =>
      mutate(date, (d) => ({ ...d, nums: { ...d.nums, [key]: value } }), true),
    [mutate]
  );
  const setText = useCallback(
    (date: string, key: string, value: string) =>
      mutate(date, (d) => ({ ...d, texts: { ...d.texts, [key]: value } }), true),
    [mutate]
  );
  // 투두: 추가/체크/삭제는 즉시 저장, 텍스트 편집은 디바운스.
  const addTodo = useCallback(
    (date: string, text: string) =>
      mutate(
        date,
        (d) => ({ ...d, todos: [...d.todos, { id: uid(), text, done: false }] }),
        false
      ),
    [mutate]
  );
  const toggleTodo = useCallback(
    (date: string, id: string) =>
      mutate(
        date,
        (d) => ({
          ...d,
          todos: d.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        }),
        false
      ),
    [mutate]
  );
  const editTodo = useCallback(
    (date: string, id: string, text: string) =>
      mutate(
        date,
        (d) => ({
          ...d,
          todos: d.todos.map((t) => (t.id === id ? { ...t, text } : t)),
        }),
        true
      ),
    [mutate]
  );
  const removeTodo = useCallback(
    (date: string, id: string) =>
      mutate(date, (d) => ({ ...d, todos: d.todos.filter((t) => t.id !== id) }), false),
    [mutate]
  );
  // 기분/몸 컨디션: 같은 값 다시 누르면 선택 해제. 클릭이라 즉시 저장.
  const setChoice = useCallback(
    (date: string, field: "mood" | "body", value: string) =>
      mutate(
        date,
        (d) => ({ ...d, [field]: d[field] === value ? "" : value }),
        false
      ),
    [mutate]
  );
  const setField = useCallback(
    (date: string, field: RtnTextField, value: string) =>
      mutate(date, (d) => ({ ...d, [field]: value }), true),
    [mutate]
  );

  const value: Store = {
    loading,
    error,
    toastMsg,
    days,
    getDay,
    toggleCheck,
    setTime,
    setNum,
    setText,
    setChoice,
    setField,
    addTodo,
    toggleTodo,
    editTodo,
    removeTodo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
