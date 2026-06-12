"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import AmountInput from "./AmountInput";
import { ChevronIcon, PlusIcon, TrashIcon } from "./icons";
import {
  DEAL_STATUS,
  SEG_TAG,
  SEGMENTS,
  STATUS_COLOR,
  TYPE_TAG,
  TYPES,
} from "@/lib/constants";
import { clientName } from "@/lib/utils";

export default function DealsView({
  search,
  onOpenDrawer,
}: {
  search: string;
  onOpenDrawer: (id: string) => void;
}) {
  const { clients, deals, items, updateDeal, addDeal, deleteDeal } = useStore();
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fQuarter, setFQuarter] = useState("");
  const [fOwner, setFOwner] = useState("");

  const owners = useMemo(
    () => [...new Set(deals.map((d) => d.owner).filter(Boolean))],
    [deals]
  );
  const quarters = useMemo(
    () => [...new Set(deals.map((d) => d.quarter).filter(Boolean))].sort(),
    [deals]
  );

  const rows = deals.filter((d) => {
    if (fType && d.type !== fType) return false;
    if (fStatus && d.status !== fStatus) return false;
    if (fQuarter && d.quarter !== fQuarter) return false;
    if (fOwner && d.owner !== fOwner) return false;
    if (
      search &&
      !((d.name || "") + clientName(clients, d.client_id)).toLowerCase().includes(search)
    )
      return false;
    return true;
  });

  return (
    <section className="view active">
      <div className="view-head">
        <h1>세일즈 대시보드</h1>
        <span className="count">{rows.length}건</span>
        <div className="spacer" />
        <div className="filters">
          <select value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">전체 유형</option>
            {TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">전체 상태</option>
            {DEAL_STATUS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={fQuarter} onChange={(e) => setFQuarter(e.target.value)}>
            <option value="">전체 분기</option>
            {quarters.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
            <option value="">전체 담당자</option>
            {owners.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="tbl-scroll">
          <table id="dealsTable">
            <thead>
              <tr>
                <th style={{ width: 54 }}>입금</th>
                <th style={{ width: 96 }}>분기</th>
                <th style={{ width: 104 }}>유형</th>
                <th style={{ width: 64 }}>구분</th>
                <th style={{ width: 220 }}>이름</th>
                <th style={{ width: 200 }}>고객사</th>
                <th style={{ width: 128 }}>상태</th>
                <th style={{ width: 130 }}>금액</th>
                <th style={{ width: 200 }}>기간</th>
                <th style={{ width: 104 }}>담당자</th>
                <th style={{ width: 110 }}>상세</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty">
                      <b>표시할 세일즈가 없어요</b>
                      필터를 바꾸거나 새 세일즈를 추가하세요.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((d) => {
                  const tg = TYPE_TAG[d.type] || ["var(--s-gray-bg)", "var(--s-gray-fg)"];
                  const sg = SEG_TAG[d.segment] || ["var(--s-gray-bg)", "var(--s-gray-fg)"];
                  const sc = STATUS_COLOR[d.status] || "gray";
                  const c = clients.find((x) => x.id === d.client_id);
                  const nItems = items.filter((x) => x.deal_id === d.id).length;
                  return (
                    <tr key={d.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="chk"
                          checked={d.paid}
                          onChange={(e) => updateDeal(d.id, { paid: e.target.checked })}
                        />
                      </td>
                      <td className="q-cell">
                        <span className="qtag">{d.quarter || ""}</span>
                        <input
                          list="quarterList"
                          value={d.quarter || ""}
                          onChange={(e) => updateDeal(d.id, { quarter: e.target.value }, true)}
                        />
                      </td>
                      <td className="tag-cell">
                        <span className="tag" style={{ background: tg[0], color: tg[1] }}>
                          {d.type}
                        </span>
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
                      </td>
                      <td className="tag-cell">
                        <span className="tag" style={{ background: sg[0], color: sg[1] }}>
                          {d.segment}
                        </span>
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
                      </td>
                      <td className="name-cell">
                        <input
                          className="cell"
                          value={d.name || ""}
                          placeholder="세일즈 이름"
                          onChange={(e) => updateDeal(d.id, { name: e.target.value }, true)}
                        />
                      </td>
                      <td className="client-cell">
                        {c ? (
                          <>
                            <span className="cname">{c.name}</span>
                            <span className="cper">{c.contact_person || ""}</span>
                          </>
                        ) : (
                          <span className="none">고객사 선택…</span>
                        )}
                        <select
                          value={d.client_id || ""}
                          onChange={(e) =>
                            updateDeal(d.id, { client_id: e.target.value || null })
                          }
                        >
                          <option value="">— 미연결 —</option>
                          {clients.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="pill-wrap">
                          <span className="pill" data-c={sc}>
                            {d.status}
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
                          </span>
                        </div>
                      </td>
                      <td>
                        <AmountInput
                          className="cell num"
                          value={d.amount}
                          onChange={(n) => updateDeal(d.id, { amount: n }, true)}
                        />
                      </td>
                      <td>
                        <div className="period">
                          <input
                            className="cell-date"
                            type="date"
                            value={d.period_start || ""}
                            onChange={(e) =>
                              updateDeal(d.id, { period_start: e.target.value || null })
                            }
                          />
                          <span className="arr">→</span>
                          <input
                            className="cell-date"
                            type="date"
                            value={d.period_end || ""}
                            onChange={(e) =>
                              updateDeal(d.id, { period_end: e.target.value || null })
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          className="cell"
                          list="ownerList"
                          value={d.owner || ""}
                          placeholder="담당자"
                          onChange={(e) => updateDeal(d.id, { owner: e.target.value }, true)}
                        />
                      </td>
                      <td>
                        <button className="open-btn" onClick={() => onOpenDrawer(d.id)}>
                          <ChevronIcon />
                          열기 {nItems ? <span className="n">{nItems}</span> : null}
                        </button>
                      </td>
                      <td className="actions">
                        <button
                          className="row-del"
                          title="삭제"
                          onClick={() => {
                            if (
                              confirm("이 세일즈를 삭제할까요? 연결된 항목도 함께 삭제됩니다.")
                            )
                              deleteDeal(d.id);
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
        <button className="add-row" onClick={() => addDeal()}>
          <PlusIcon />새 세일즈 추가
        </button>
      </div>
    </section>
  );
}
