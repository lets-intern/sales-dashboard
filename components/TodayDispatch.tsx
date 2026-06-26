"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import type { Client, Deal, Item } from "@/lib/types";
import { addDays, clientName, ymd } from "@/lib/utils";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 한 항목 → "고객사명 채널" (슬랙 한 줄)
function dispatchLine(it: Item, deals: Deal[], clients: Client[]): string {
  const d = deals.find((x) => x.id === it.deal_id);
  const cn = d ? clientName(clients, d.client_id) : "";
  const parts: string[] = [];
  if (cn) parts.push(cn);
  if (it.channel) parts.push(it.channel);
  return parts.join(" ") || "(미입력)";
}

export default function TodayDispatch() {
  const { clients, deals, items } = useStore();
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const dayStr = ymd(day);
  const isToday = dayStr === ymd(new Date());

  const todays = useMemo(
    () =>
      items
        .filter((i) => i.date === dayStr)
        .sort((a, b) => dispatchLine(a, deals, clients).localeCompare(
          dispatchLine(b, deals, clients), "ko"
        )),
    [items, deals, clients, dayStr]
  );

  const header = `${day.getMonth() + 1}/${day.getDate()}(${DOW[day.getDay()]}) 광고 송출 일정`;
  const copyText =
    header + "\n" + todays.map((it) => "• " + dispatchLine(it, deals, clients)).join("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 차단 시 선택용 textarea fallback
      const ta = document.createElement("textarea");
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const shiftDay = (n: number) => setDay((d) => addDays(d, n));
  const resetToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setDay(d);
  };

  return (
    <div className="dispatch-card">
      <div className="dispatch-head">
        <span className="dispatch-siren" aria-hidden>🚨</span>
        <b className="dispatch-title">{header}</b>
        <span className="dispatch-count">{todays.length}건</span>
        <div className="dispatch-daynav">
          <button title="이전 날" onClick={() => shiftDay(-1)}>‹</button>
          <button
            className={isToday ? "on" : ""}
            onClick={resetToday}
            title="오늘로"
          >
            오늘
          </button>
          <button title="다음 날" onClick={() => shiftDay(1)}>›</button>
        </div>
        <div className="spacer" />
        <button
          className="dispatch-copy"
          onClick={copy}
          disabled={todays.length === 0}
          title="슬랙에 붙여넣을 수 있게 복사"
        >
          {copied ? "복사됨 ✓" : "복사"}
        </button>
        <button
          className="dispatch-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "펼치기" : "접기"}
        >
          {collapsed ? "▾" : "▴"}
        </button>
      </div>
      {!collapsed && (
        <div className="dispatch-body">
          {todays.length === 0 ? (
            <div className="dispatch-empty">
              이 날 송출 예정인 광고 항목이 없어요.
            </div>
          ) : (
            <ul className="dispatch-list">
              {todays.map((it) => {
                const done = it.status === "완료";
                return (
                  <li key={it.id} className={done ? "done" : ""}>
                    <span className="bul">•</span>
                    {dispatchLine(it, deals, clients)}
                    {done && <span className="done-tag">완료</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
