"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import CalendarView from "./CalendarView";
import { ChevronIcon, PlusIcon, TrashIcon } from "./icons";
import { SortTh, sortRows, useSort } from "./sortable";
import { CHANNELS, ITEM_STATUS, OWNERS, STATUS_COLOR } from "@/lib/constants";
import { itemName } from "@/lib/utils";

export default function ItemsView({
  search,
  onOpenDeal,
  onOpenItem,
}: {
  search: string;
  onOpenDeal: (id: string) => void;
  onOpenItem: (id: string) => void;
}) {
  const { clients, deals, items, updateItem, addItem, deleteItem } = useStore();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [fChannel, setFChannel] = useState("");
  const [fStatus, setFStatus] = useState("");
  const { sort, toggle } = useSort();

  const channels = useMemo(
    () => [...new Set([...CHANNELS, ...items.map((i) => i.channel).filter(Boolean)])],
    [items]
  );

  const filtered = items.filter((it) => {
    if (fChannel && it.channel !== fChannel) return false;
    if (fStatus && it.status !== fStatus) return false;
    if (search && !itemName(it, deals, clients).toLowerCase().includes(search))
      return false;
    return true;
  });

  const rows = sortRows(filtered, sort, (it, key) => {
    switch (key) {
      case "name":
        return itemName(it, deals, clients);
      case "deal": {
        const d = deals.find((x) => x.id === it.deal_id);
        return d ? d.name : "";
      }
      default:
        return (it as unknown as Record<string, string | number | boolean | null>)[key];
    }
  });

  return (
    <section className="view active">
      <div className="view-head">
        <h1>항목 관리</h1>
        <span className="count">
          {mode === "list" ? `${rows.length}건` : "캘린더"}
        </span>
        <div className="spacer" />
        <div className="view-toggle" style={{ marginRight: 12 }}>
          <button
            className={mode === "list" ? "active" : ""}
            onClick={() => setMode("list")}
          >
            목록
          </button>
          <button
            className={mode === "calendar" ? "active" : ""}
            onClick={() => setMode("calendar")}
          >
            캘린더
          </button>
        </div>
        {mode === "list" && (
          <div className="filters">
            <select value={fChannel} onChange={(e) => setFChannel(e.target.value)}>
              <option value="">전체 채널</option>
              {channels.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">전체 상태</option>
              {ITEM_STATUS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {mode === "calendar" ? (
        <CalendarView onOpenDrawer={onOpenDeal} embedded />
      ) : (
        <div className="card">
          <div className="tbl-scroll">
            <table id="itemsTable">
              <thead>
                <tr>
                  <SortTh label="광고 항목 (자동 생성)" sortKey="name" sort={sort} onToggle={toggle} />
                  <SortTh label="채널" sortKey="channel" sort={sort} onToggle={toggle} width={210} />
                  <SortTh label="게시일" sortKey="date" sort={sort} onToggle={toggle} width={140} />
                  <SortTh label="상태" sortKey="status" sort={sort} onToggle={toggle} width={120} />
                  <SortTh label="담당자" sortKey="owner" sort={sort} onToggle={toggle} width={120} />
                  <SortTh label="연결된 세일즈" sortKey="deal" sort={sort} onToggle={toggle} width={240} />
                  <th style={{ width: 90 }}>상세</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty">
                        <b>등록된 항목이 없어요</b>
                        항목을 추가하면 이름이 자동 생성되고 캘린더에 표시됩니다.
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((it) => {
                    const sc = STATUS_COLOR[it.status] || "gray";
                    const deal = deals.find((d) => d.id === it.deal_id);
                    return (
                      <tr key={it.id}>
                        <td className="item-name">{itemName(it, deals, clients)}</td>
                        <td className="tag-cell">
                          <select
                            value={it.channel || ""}
                            onChange={(e) => updateItem(it.id, { channel: e.target.value })}
                          >
                            <option value="">채널 선택…</option>
                            {channels.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="cell-date"
                            type="date"
                            value={it.date || ""}
                            onChange={(e) => updateItem(it.id, { date: e.target.value || null })}
                          />
                        </td>
                        <td>
                          <div className="pill-wrap">
                            <span className="pill" data-c={sc}>
                              {it.status}
                              <select
                                value={it.status}
                                onChange={(e) => updateItem(it.id, { status: e.target.value })}
                              >
                                {ITEM_STATUS.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </span>
                          </div>
                        </td>
                        <td className="tag-cell">
                          <select
                            value={it.owner || ""}
                            onChange={(e) => updateItem(it.id, { owner: e.target.value })}
                          >
                            <option value="">담당자…</option>
                            {OWNERS.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="deal-ref">
                          {deal ? (
                            <button
                              className="link-btn"
                              onClick={() => onOpenDeal(deal.id)}
                              title="세일즈 열기"
                            >
                              <span className="dot" />
                              {deal.name || "(이름 없음)"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--ink-3)", paddingLeft: 12 }}>
                              미연결
                            </span>
                          )}
                          <select
                            value={it.deal_id || ""}
                            onChange={(e) =>
                              updateItem(it.id, { deal_id: e.target.value || null })
                            }
                          >
                            <option value="">— 연결 안 함 —</option>
                            {deals.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name || "(이름 없음)"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button className="open-btn" onClick={() => onOpenItem(it.id)}>
                            <ChevronIcon />
                            열기
                          </button>
                        </td>
                        <td className="actions">
                          <button
                            className="row-del"
                            title="삭제"
                            onClick={() => {
                              if (confirm("이 항목을 삭제할까요?")) deleteItem(it.id);
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <button className="add-row" onClick={() => addItem(null)}>
            <PlusIcon />새 항목 추가
          </button>
        </div>
      )}
    </section>
  );
}
