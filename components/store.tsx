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
import { createClient } from "@/utils/supabase/client";
import type { Client, Deal, Item, TableName } from "@/lib/types";
import { currentQuarter, uid, ymd } from "@/lib/utils";

type Store = {
  clients: Client[];
  deals: Deal[];
  items: Item[];
  loading: boolean;
  error: string | null;
  toastMsg: string;
  showToast: (m: string) => void;

  updateClient: (id: string, patch: Partial<Client>, debounce?: boolean) => void;
  updateDeal: (id: string, patch: Partial<Deal>, debounce?: boolean) => void;
  updateItem: (id: string, patch: Partial<Item>, debounce?: boolean) => void;

  addClient: () => Promise<string>;
  addDeal: () => Promise<string>;
  addItem: (dealId?: string | null) => Promise<string>;

  deleteClient: (id: string) => void;
  deleteDeal: (id: string) => void;
  deleteItem: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  // 최신 상태를 이벤트 핸들러에서 읽기 위한 ref (렌더마다 동기화)
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dealsRef = useRef(deals);
  dealsRef.current = deals;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 1600);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, d, i] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: true }),
        supabase.from("deals").select("*").order("created_at", { ascending: false }),
        supabase.from("items").select("*").order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      const firstErr = c.error || d.error || i.error;
      if (firstErr) setError(firstErr.message);
      setClients((c.data as Client[]) || []);
      setDeals((d.data as Deal[]) || []);
      setItems((i.data as Item[]) || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const dbTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const writeDb = useCallback(
    (table: TableName, id: string, patch: Record<string, unknown>) => {
      supabase
        .from(table)
        .update(patch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) showToast("저장 실패: " + error.message);
        });
    },
    [supabase, showToast]
  );
  const scheduleDb = useCallback(
    (table: TableName, id: string, patch: Record<string, unknown>, debounce?: boolean) => {
      if (!debounce) {
        writeDb(table, id, patch);
        return;
      }
      const key = table + ":" + id + ":" + Object.keys(patch).join(",");
      if (dbTimers.current[key]) clearTimeout(dbTimers.current[key]);
      dbTimers.current[key] = setTimeout(() => writeDb(table, id, patch), 500);
    },
    [writeDb]
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>, debounce?: boolean) => {
      setClients((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      scheduleDb("clients", id, patch as Record<string, unknown>, debounce);
    },
    [scheduleDb]
  );
  const updateDeal = useCallback(
    (id: string, patch: Partial<Deal>, debounce?: boolean) => {
      setDeals((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      scheduleDb("deals", id, patch as Record<string, unknown>, debounce);
    },
    [scheduleDb]
  );
  const updateItem = useCallback(
    (id: string, patch: Partial<Item>, debounce?: boolean) => {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      scheduleDb("items", id, patch as Record<string, unknown>, debounce);

      // 항목을 '완료'로 바꿨을 때: 그 세일즈의 모든 항목이 완료면 '사업 진행 중' → '광고 완료' 자동 전환
      if (patch.status === "완료") {
        const next = itemsRef.current.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        );
        const it = next.find((x) => x.id === id);
        if (it?.deal_id) {
          const siblings = next.filter((x) => x.deal_id === it.deal_id);
          const allDone =
            siblings.length > 0 && siblings.every((x) => x.status === "완료");
          if (allDone) {
            const deal = dealsRef.current.find((d) => d.id === it.deal_id);
            if (deal && deal.status === "사업 진행 중") {
              updateDeal(deal.id, { status: "광고 완료" });
            }
          }
        }
      }
    },
    [scheduleDb, updateDeal]
  );

  const addClient = useCallback(async () => {
    const row: Client = {
      id: uid(),
      name: "",
      contact_person: "",
      contact_email: "",
      contact_phone: "",
      biz_reg_no: "",
      tax_email: "",
      notes: "",
    };
    setClients((prev) => [row, ...prev]);
    const { error } = await supabase.from("clients").insert(row);
    if (error) showToast("추가 실패: " + error.message);
    return row.id;
  }, [supabase, showToast]);

  const addDeal = useCallback(async () => {
    const row: Deal = {
      id: uid(),
      client_id: null,
      type: "광고 대행",
      segment: "B2B",
      name: "",
      status: "시작 전",
      amount: 0,
      owner: "",
      paid: false,
      invoice_status: "예정",
      quarter: currentQuarter(),
      period_start: null,
      period_end: null,
      comm_notes: "",
      statement: null,
    };
    setDeals((prev) => [row, ...prev]);
    const { error } = await supabase.from("deals").insert(row);
    if (error) showToast("추가 실패: " + error.message);
    return row.id;
  }, [supabase, showToast]);

  const addItem = useCallback(
    async (dealId: string | null = null) => {
      const row: Item = {
        id: uid(),
        deal_id: dealId,
        channel: "",
        date: ymd(new Date()),
        status: "시작 전",
        owner: "",
        notes: "",
      };
      setItems((prev) => [row, ...prev]);
      const { error } = await supabase.from("items").insert(row);
      if (error) showToast("추가 실패: " + error.message);
      return row.id;
    },
    [supabase, showToast]
  );

  const deleteClient = useCallback(
    (id: string) => {
      setClients((prev) => prev.filter((x) => x.id !== id));
      setDeals((prev) =>
        prev.map((d) => (d.client_id === id ? { ...d, client_id: null } : d))
      );
      supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .then(({ error }) => error && showToast("삭제 실패: " + error.message));
    },
    [supabase, showToast]
  );
  const deleteDeal = useCallback(
    (id: string) => {
      setDeals((prev) => prev.filter((x) => x.id !== id));
      setItems((prev) => prev.filter((x) => x.deal_id !== id));
      supabase
        .from("deals")
        .delete()
        .eq("id", id)
        .then(({ error }) => error && showToast("삭제 실패: " + error.message));
    },
    [supabase, showToast]
  );
  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      supabase
        .from("items")
        .delete()
        .eq("id", id)
        .then(({ error }) => error && showToast("삭제 실패: " + error.message));
    },
    [supabase, showToast]
  );

  const value: Store = {
    clients,
    deals,
    items,
    loading,
    error,
    toastMsg,
    showToast,
    updateClient,
    updateDeal,
    updateItem,
    addClient,
    addDeal,
    addItem,
    deleteClient,
    deleteDeal,
    deleteItem,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
