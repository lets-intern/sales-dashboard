"use client";

import { useEffect } from "react";
import { useStore } from "./store";
import { CHANNELS, ITEM_STATUS, OWNERS } from "@/lib/constants";
import { itemName } from "@/lib/utils";

export default function ItemDrawer({
  itemId,
  onClose,
  onOpenDeal,
}: {
  itemId: string | null;
  onClose: () => void;
  onOpenDeal: (id: string) => void;
}) {
  const { clients, deals, items, updateItem } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const it = items.find((x) => x.id === itemId) || null;
  const open = !!it;
  const deal = it ? deals.find((d) => d.id === it.deal_id) : null;

  const channels = [
    ...new Set([...CHANNELS, ...items.map((i) => i.channel).filter(Boolean)]),
  ];

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`drawer${open ? " open" : ""}`}>
        <div className="drawer-head">
          <div className="d-name" style={{ cursor: "default" }}>
            {it ? itemName(it, deals, clients) : ""}
          </div>
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          {it && (
            <>
              <div className="d-sec">
                <h3>항목 정보</h3>
                <div className="d-grid">
                  <div className="fld">
                    <label>채널</label>
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
                  </div>
                  <div className="fld">
                    <label>게시일</label>
                    <input
                      type="date"
                      value={it.date || ""}
                      onChange={(e) => updateItem(it.id, { date: e.target.value || null })}
                    />
                  </div>
                  <div className="fld">
                    <label>상태</label>
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
                  </div>
                  <div className="fld">
                    <label>담당자</label>
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
                  </div>
                  <div className="fld full">
                    <label>연결된 세일즈</label>
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
                  </div>
                  {deal && (
                    <div className="fld full">
                      <button className="link-btn" onClick={() => onOpenDeal(deal.id)}>
                        <span className="dot" />
                        세일즈 상세 열기 · {deal.name || "(이름 없음)"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="d-sec">
                <h3>상세 내용</h3>
                <div className="fld full">
                  <textarea
                    placeholder="광고 항목 관련 메모, 소재 정보, 협의 내용 등을 자유롭게 정리하세요."
                    value={it.notes || ""}
                    onChange={(e) => updateItem(it.id, { notes: e.target.value }, true)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
