"use client";

import { useEffect, useMemo, useState } from "react";
import { StoreProvider, useStore } from "./store";
import DealsView from "./DealsView";
import ItemsView from "./ItemsView";
import ClientsView from "./ClientsView";
import CalendarView from "./CalendarView";
import Drawer from "./Drawer";
import ItemDrawer from "./ItemDrawer";
import ClientDrawer from "./ClientDrawer";
import TodayDispatch from "./TodayDispatch";
import { LogoutIcon, SearchIcon } from "./icons";
import { addDays, fmtWon, mondayOf, quarterList, ymd } from "@/lib/utils";
import { CHANNELS, HIDDEN_CHANNELS, OWNERS, REVENUE_STATUS } from "@/lib/constants";

type View = "deals" | "items" | "clients" | "calendar";
const TABS: { id: View; label: string }[] = [
  { id: "deals", label: "세일즈 대시보드" },
  { id: "clients", label: "고객사 관리" },
  { id: "items", label: "광고 항목 관리" },
  { id: "calendar", label: "광고 캘린더" },
];

function AppInner() {
  const { clients, deals, items, loading, error, toastMsg, deleteDeal } =
    useStore();
  const [view, setView] = useState<View>("deals");
  const [search, setSearch] = useState("");
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  const [calWeek, setCalWeek] = useState(() => mondayOf(new Date()));
  // 캘린더 빈칸에서 즉석 생성된 임시(draft) 세일즈 — 닫을 때 저장 여부를 물어봄
  const [draftDealId, setDraftDealId] = useState<string | null>(null);

  const openDeal = (id: string) => {
    setOpenItemId(null);
    setOpenClientId(null);
    setOpenDealId(id);
  };
  const openDraftDeal = (id: string) => {
    setDraftDealId(id);
    openDeal(id);
  };
  const closeDeal = () => {
    if (openDealId && openDealId === draftDealId) {
      const keep = window.confirm(
        "생성한 항목을 저장하시겠습니까?\n\n[확인] 저장 · [취소] 삭제"
      );
      if (!keep) deleteDeal(openDealId);
      setDraftDealId(null);
    }
    setOpenDealId(null);
  };
  const openItem = (id: string) => {
    setOpenDealId(null);
    setOpenClientId(null);
    setOpenItemId(id);
  };
  const openClient = (id: string) => {
    setOpenDealId(null);
    setOpenItemId(null);
    setOpenClientId(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toUpperCase();
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
      const m: Record<string, View> = {
        "1": "deals",
        "2": "clients",
        "3": "items",
        "4": "calendar",
      };
      if (m[e.key]) setView(m[e.key]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const total = useMemo(
    () =>
      deals
        .filter((d) => REVENUE_STATUS.includes(d.status))
        .reduce((a, d) => a + (Number(d.amount) || 0), 0),
    [deals]
  );

  const owners = useMemo(
    () => [...new Set([...OWNERS, ...deals.map((d) => d.owner)])].filter(Boolean),
    [deals]
  );
  const channels = useMemo(
    () =>
      [...new Set([...CHANNELS, ...items.map((i) => i.channel)])]
        .filter(Boolean)
        .filter((c) => !HIDDEN_CHANNELS.includes(c)),
    [items]
  );

  const s = search.trim().toLowerCase();

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark" />
          <b>렛츠커리어 세일즈 어드민</b>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${view === t.id ? " active" : ""}`}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className={`sync${loading ? "" : " live"}`}>
          <span className="dot" />
          <span>{loading ? "연결 중" : error ? "오류" : "Supabase 연결됨"}</span>
        </div>
        <div className="total">
          <span className="lab">진행·완료 합계</span>
          <span className="val">{fmtWon(total)}</span>
        </div>
        <div className="search">
          <SearchIcon />
          <input
            placeholder="검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="who">
          <span className="av">·</span>
        </div>
        <button
          className="icon-btn"
          title="새로고침"
          onClick={() => location.reload()}
        >
          <LogoutIcon />
        </button>
      </div>

      <main>
        <TodayDispatch />
        {error && (
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <b>데이터를 불러오지 못했어요.</b>
            <div style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 12.5 }}>
              Supabase 테이블이 아직 없을 수 있어요. <code>supabase/schema.sql</code> 을
              실행한 뒤 새로고침하세요. ({error})
            </div>
          </div>
        )}
        {view === "deals" && (
          <DealsView search={s} onOpenDrawer={openDeal} />
        )}
        {view === "items" && (
          <ItemsView search={s} onOpenDeal={openDeal} onOpenItem={openItem} />
        )}
        {view === "clients" && (
          <ClientsView search={s} onOpenClient={openClient} />
        )}
        {view === "calendar" && (
          <>
            <CalendarView
              onOpenDrawer={openDeal}
              onDraftOpen={openDraftDeal}
              weekStart={calWeek}
              onWeekChange={setCalWeek}
            />
            <div style={{ marginTop: 18 }}>
              <ItemsView
                search={s}
                onOpenDeal={openDeal}
                onOpenItem={openItem}
                listOnly
                dateFrom={ymd(calWeek)}
                dateTo={ymd(addDays(calWeek, 6))}
              />
            </div>
          </>
        )}
      </main>

      <Drawer dealId={openDealId} onClose={closeDeal} />
      <ItemDrawer
        itemId={openItemId}
        onClose={() => setOpenItemId(null)}
        onOpenDeal={openDeal}
      />
      <ClientDrawer
        clientId={openClientId}
        onClose={() => setOpenClientId(null)}
        onOpenDeal={openDeal}
      />

      <div id="toast" className={toastMsg ? "show" : ""}>
        {toastMsg}
      </div>

      <datalist id="channelList">
        {channels.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="ownerList">
        {owners.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="quarterList">
        {quarterList().map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>
    </div>
  );
}

export default function SalesApp() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
