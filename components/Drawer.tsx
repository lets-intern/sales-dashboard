"use client";

import { useEffect } from "react";
import { useStore } from "./store";
import AmountInput from "./AmountInput";
import { TrashIcon } from "./icons";
import { DEAL_STATUS, ITEM_STATUS, SEGMENTS, TYPES } from "@/lib/constants";
import { itemName } from "@/lib/utils";

export default function Drawer({
  dealId,
  onClose,
}: {
  dealId: string | null;
  onClose: () => void;
}) {
  const {
    clients,
    deals,
    items,
    updateDeal,
    updateClient,
    updateItem,
    addItem,
    deleteItem,
  } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = deals.find((x) => x.id === dealId) || null;
  const open = !!d;
  const c = d ? clients.find((x) => x.id === d.client_id) : null;
  const its = d ? items.filter((x) => x.deal_id === d.id) : [];

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`drawer${open ? " open" : ""}`}>
        <div className="drawer-head">
          <input
            className="d-name"
            placeholder="세일즈 이름"
            value={d?.name || ""}
            onChange={(e) => d && updateDeal(d.id, { name: e.target.value }, true)}
          />
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          {d && (
            <>
              <div className="d-sec">
                <h3>고객사</h3>
                <div className="d-grid">
                  <div className="fld full">
                    <label>연결된 고객사</label>
                    <select
                      value={d.client_id || ""}
                      onChange={(e) =>
                        updateDeal(d.id, { client_id: e.target.value || null })
                      }
                    >
                      <option value="">— 고객사 선택 —</option>
                      {clients.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {c ? (
                    <>
                      <div className="fld">
                        <label>담당자</label>
                        <input
                          value={c.contact_person || ""}
                          placeholder="이름/직함"
                          onChange={(e) =>
                            updateClient(c.id, { contact_person: e.target.value }, true)
                          }
                        />
                      </div>
                      <div className="fld">
                        <label>연락처</label>
                        <input
                          value={c.contact_phone || ""}
                          placeholder="전화"
                          onChange={(e) =>
                            updateClient(c.id, { contact_phone: e.target.value }, true)
                          }
                        />
                      </div>
                      <div className="fld full">
                        <label>이메일</label>
                        <input
                          value={c.contact_email || ""}
                          placeholder="이메일"
                          onChange={(e) =>
                            updateClient(c.id, { contact_email: e.target.value }, true)
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="fld full">
                      <label style={{ color: "var(--ink-3)" }}>
                        고객사를 선택하면 담당자 정보가 여기에 표시됩니다.
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="d-sec">
                <h3>세일즈 정보</h3>
                <div className="d-grid">
                  <div className="fld">
                    <label>유형</label>
                    <select
                      value={d.type}
                      onChange={(e) => updateDeal(d.id, { type: e.target.value })}
                    >
                      {TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>구분</label>
                    <select
                      value={d.segment}
                      onChange={(e) => updateDeal(d.id, { segment: e.target.value })}
                    >
                      {SEGMENTS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>상태</label>
                    <select
                      value={d.status}
                      onChange={(e) => updateDeal(d.id, { status: e.target.value })}
                    >
                      {DEAL_STATUS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <label>담당자</label>
                    <input
                      list="ownerList"
                      value={d.owner || ""}
                      onChange={(e) => updateDeal(d.id, { owner: e.target.value }, true)}
                    />
                  </div>
                  <div className="fld">
                    <label>분기</label>
                    <input
                      list="quarterList"
                      value={d.quarter || ""}
                      onChange={(e) => updateDeal(d.id, { quarter: e.target.value }, true)}
                    />
                  </div>
                  <div className="fld">
                    <label>금액 (VAT 제외)</label>
                    <AmountInput
                      value={d.amount}
                      onChange={(n) => updateDeal(d.id, { amount: n }, true)}
                    />
                  </div>
                  <div className="fld">
                    <label>기간 시작</label>
                    <input
                      type="date"
                      value={d.period_start || ""}
                      onChange={(e) =>
                        updateDeal(d.id, { period_start: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>기간 종료</label>
                    <input
                      type="date"
                      value={d.period_end || ""}
                      onChange={(e) =>
                        updateDeal(d.id, { period_end: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="fld full">
                    <label className="paid-toggle">
                      <input
                        type="checkbox"
                        className="chk"
                        style={{ margin: 0 }}
                        checked={d.paid}
                        onChange={(e) => updateDeal(d.id, { paid: e.target.checked })}
                      />{" "}
                      입금 완료
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-sec">
                <h3>커뮤니케이션 정리</h3>
                <div className="fld full">
                  <textarea
                    placeholder="고객사와의 미팅·메일·통화 내용을 자유롭게 정리하세요."
                    value={d.comm_notes || ""}
                    onChange={(e) => updateDeal(d.id, { comm_notes: e.target.value }, true)}
                  />
                </div>
              </div>

              <div className="d-sec">
                <h3>연결된 항목 · {its.length}건</h3>
                <div className="d-items">
                  {its.map((it) => (
                    <div className="d-item" key={it.id}>
                      <div className="nm">{itemName(it, deals, clients)}</div>
                      <input
                        list="channelList"
                        value={it.channel || ""}
                        placeholder="채널"
                        onChange={(e) => updateItem(it.id, { channel: e.target.value }, true)}
                      />
                      <input
                        type="date"
                        value={it.date || ""}
                        onChange={(e) => updateItem(it.id, { date: e.target.value || null })}
                      />
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
                      <button
                        className="del"
                        title="삭제"
                        onClick={() => deleteItem(it.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="add-item-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => addItem(d.id)}
                >
                  + 항목 추가
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
