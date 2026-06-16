"use client";

import { useState } from "react";
import { useStore } from "./store";
import { CHANNELS, STATUS_COLOR } from "@/lib/constants";
import { addDays, isSameDay, itemName, mondayOf, ymd } from "@/lib/utils";

const DOWS = ["월", "화", "수", "목", "금", "토", "일"];

export default function CalendarView({
  onOpenDrawer,
  embedded = false,
}: {
  onOpenDrawer: (id: string) => void;
  embedded?: boolean;
}) {
  const { clients, deals, items, updateItem } = useStore();
  const [calStart, setCalStart] = useState(() => mondayOf(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => addDays(calStart, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const used = new Set(items.map((i) => i.channel).filter(Boolean));
  let channels = CHANNELS.filter((c) => used.has(c));
  [...used].forEach((c) => {
    if (!channels.includes(c)) channels.push(c);
  });
  if (!channels.length) channels = CHANNELS.slice(0, 4);

  const rangeLabel = `${calStart.getMonth() + 1}월 ${calStart.getDate()}일 – ${
    addDays(calStart, 6).getMonth() + 1
  }월 ${addDays(calStart, 6).getDate()}일`;

  const nav = (
    <div className="cal-nav">
      <button title="이전 주" onClick={() => setCalStart(addDays(calStart, -7))}>
        ‹
      </button>
      <button className="today-btn" onClick={() => setCalStart(mondayOf(new Date()))}>
        이번 주
      </button>
      <button title="다음 주" onClick={() => setCalStart(addDays(calStart, 7))}>
        ›
      </button>
      <span className="cal-range">{rangeLabel}</span>
    </div>
  );

  const board = (
    <div className="card">
        <div className="tbl-scroll">
          <div
            className="cal-grid"
            style={{
              gridTemplateColumns: "minmax(150px,180px) repeat(7,minmax(110px,1fr))",
            }}
          >
            <div className="ch-head">채널</div>
            {days.map((d, i) => {
              const we = i >= 5;
              return (
                <div
                  key={i}
                  className={`day-head${isSameDay(d, today) ? " is-today" : ""}${
                    we ? " weekend" : ""
                  }`}
                >
                  <span className="dow">{DOWS[i]}</span>
                  <span className="dnum">{d.getDate()}</span>
                </div>
              );
            })}
            {channels.map((ch) => (
              <CalRow
                key={ch}
                channel={ch}
                days={days}
                cellItems={items}
                deals={deals}
                clients={clients}
                onOpenDrawer={onOpenDrawer}
                updateItem={updateItem}
              />
            ))}
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          {nav}
        </div>
        {board}
      </>
    );
  }

  return (
    <section className="view active">
      <div className="view-head">
        <h1>캘린더</h1>
        <span className="count">항목에서 자동 생성</span>
        <div className="spacer" />
        {nav}
      </div>
      {board}
    </section>
  );
}

function CalRow({
  channel,
  days,
  cellItems,
  deals,
  clients,
  onOpenDrawer,
  updateItem,
}: {
  channel: string;
  days: Date[];
  cellItems: ReturnType<typeof useStore>["items"];
  deals: ReturnType<typeof useStore>["deals"];
  clients: ReturnType<typeof useStore>["clients"];
  onOpenDrawer: (id: string) => void;
  updateItem: ReturnType<typeof useStore>["updateItem"];
}) {
  return (
    <>
      <div className="ch-name">{channel}</div>
      {days.map((d, i) => {
        const we = i >= 5;
        const ds = ymd(d);
        const cell = cellItems.filter((it) => it.channel === channel && it.date === ds);
        return (
          <div key={i} className={`cal-cell${we ? " weekend" : ""}`}>
            {cell.map((it) => {
              const c = STATUS_COLOR[it.status] || "gray";
              const cc = c === "blue" || c === "red" ? "gray" : c;
              const label = itemName(it, deals, clients);
              const done = it.status === "완료";
              return (
                <div
                  key={it.id}
                  className="chip"
                  data-c={cc}
                  data-done={done ? "1" : undefined}
                  title={label}
                >
                  <button
                    className="chip-check"
                    title={done ? "완료 해제" : "완료로 표시"}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(it.id, { status: done ? "시작 전" : "완료" });
                    }}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <span
                    className="chip-label"
                    onClick={() => {
                      if (it.deal_id) onOpenDrawer(it.deal_id);
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
