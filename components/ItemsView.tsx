"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import { PlusIcon, TrashIcon } from "./icons";
import { ITEM_STATUS, STATUS_COLOR } from "@/lib/constants";
import { itemName } from "@/lib/utils";

export default function ItemsView({ search }: { search: string }) {
  const { clients, deals, items, updateItem, addItem, deleteItem } = useStore();
  const [fChannel, setFChannel] = useState("");
  const [fStatus, setFStatus] = useState("");

  const channels = useMemo(
    () => [...new Set(items.map((i) => i.channel).filter(Boolean))],
    [items]
  );

  const rows = items.filter((it) => {
    if (fChannel && it.channel !== fChannel) return false;
    if (fStatus && it.status !== fStatus) return false;
    if (search && !itemName(it, deals, clients).toLowerCase().includes(search))
      return false;
    return true;
  });

  return (
    <section className="view active">
      <div className="view-head">
        <h1>항목 관리</h1>
        <span className="count">{rows.length}건</span>
        <div className="spacer" />
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
      </div>
      <div className="card">
        <div className="tbl-scroll">
          <table id="itemsTable">
            <thead>
              <tr>
                <th>광고 항목 (자동 생성)</th>
                <th style={{ width: 200 }}>채널</th>
                <th style={{ width: 140 }}>게시일</th>
                <th style={{ width: 120 }}>상태</th>
                <th style={{ width: 240 }}>연결된 세일즈</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
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
                      <td>
                        <input
                          className="cell"
                          list="channelList"
                          value={it.channel || ""}
                          placeholder="채널 선택/입력"
                          onChange={(e) => updateItem(it.id, { channel: e.target.value }, true)}
                        />
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
                      <td className="deal-ref">
                        <span className="dot" />
                        {deal ? (
                          deal.name || "(이름 없음)"
                        ) : (
                          <span style={{ color: "var(--ink-3)" }}>미연결</span>
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
    </section>
  );
}
