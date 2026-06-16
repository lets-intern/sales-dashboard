"use client";

import { useMemo, useState } from "react";
import { useStore } from "./store";
import AmountInput from "./AmountInput";
import { ChevronIcon, PlusIcon, TrashIcon } from "./icons";
import { SortTh, sortRows, useSort } from "./sortable";
import {
  DEAL_STATUS,
  INVOICE_STATUS,
  INVOICE_TAG,
  SEG_TAG,
  SEGMENTS,
  STATUS_COLOR,
  TYPE_TAG,
  TYPES,
} from "@/lib/constants";
import { clientName, quarterOf } from "@/lib/utils";

export default function DealsView({
  search,
  onOpenDrawer,
}: {
  search: string;
  onOpenDrawer: (id: string) => void;
}) {
  const { clients, deals, items, updateDeal, addDeal, addClient, deleteDeal } =
    useStore();
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fQuarter, setFQuarter] = useState("");
  const [fOwner, setFOwner] = useState("");
  const { sort, toggle } = useSort({ key: "period", dir: "desc" });

  const owners = useMemo(
    () => [...new Set(deals.map((d) => d.owner).filter(Boolean))],
    [deals]
  );
  const quarters = useMemo(
    () => [...new Set(deals.map((d) => d.quarter).filter(Boolean))].sort(),
    [deals]
  );

  const filtered = deals.filter((d) => {
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

  const rows = sortRows(filtered, sort, (d, key) => {
    switch (key) {
      case "client":
        return clientName(clients, d.client_id);
      case "period":
        return d.period_start;
      default:
        return (d as unknown as Record<string, string | number | boolean | null>)[key];
    }
  });

  async function handleClientSelect(dealId: string, value: string) {
    if (value === "__new__") {
      const id = await addClient();
      updateDeal(dealId, { client_id: id });
    } else {
      updateDeal(dealId, { client_id: value || null });
    }
  }

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
                <SortTh label="결제 여부" sortKey="paid" sort={sort} onToggle={toggle} width={80} />
                <SortTh label="계산서 발행" sortKey="invoice_status" sort={sort} onToggle={toggle} width={120} />
                <SortTh label="분기" sortKey="quarter" sort={sort} onToggle={toggle} width={96} />
                <SortTh label="유형" sortKey="type" sort={sort} onToggle={toggle} width={104} />
                <SortTh label="구분" sortKey="segment" sort={sort} onToggle={toggle} width={64} />
                <SortTh label="이름" sortKey="name" sort={sort} onToggle={toggle} width={400} />
                <SortTh label="금액 (VAT 제외가)" sortKey="amount" sort={sort} onToggle={toggle} width={150} />
                <SortTh label="고객사" sortKey="client" sort={sort} onToggle={toggle} width={200} />
                <SortTh label="상태" sortKey="status" sort={sort} onToggle={toggle} width={140} />
                <SortTh label="기간" sortKey="period" sort={sort} onToggle={toggle} width={200} />
                <SortTh label="담당자" sortKey="owner" sort={sort} onToggle={toggle} width={104} />
                <th style={{ width: 110 }}>상세</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13}>
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
                  const ig = INVOICE_TAG[d.invoice_status] || ["var(--s-gray-bg)", "var(--s-gray-fg)"];
                  const c = clients.find((x) => x.id === d.client_id);
                  const dItems = items.filter((x) => x.deal_id === d.id);
                  const nDone = dItems.filter((x) => x.status === "완료").length;
                  const nPending = dItems.length - nDone;
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
                      <td className="tag-cell">
                        <span className="tag" style={{ background: ig[0], color: ig[1] }}>
                          {d.invoice_status}
                        </span>
                        <select
                          value={d.invoice_status}
                          onChange={(e) =>
                            updateDeal(d.id, { invoice_status: e.target.value })
                          }
                        >
                          {INVOICE_STATUS.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="q-cell">
                        <span className="qtag" title="기간 시작일 기준 자동 표기">
                          {d.quarter || "—"}
                        </span>
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
                      <td>
                        <AmountInput
                          className="cell num"
                          value={d.amount}
                          onChange={(n) => updateDeal(d.id, { amount: n }, true)}
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
                          onChange={(e) => handleClientSelect(d.id, e.target.value)}
                        >
                          <option value="">— 미연결 —</option>
                          {clients.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name || "(이름 없음)"}
                            </option>
                          ))}
                          <option value="__new__">+ 새 고객사 추가</option>
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
                        <div className="period">
                          <input
                            className="cell-date"
                            type="date"
                            value={d.period_start || ""}
                            onChange={(e) => {
                              const v = e.target.value || null;
                              updateDeal(d.id, { period_start: v, quarter: quarterOf(v) });
                            }}
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
                          열기
                          {nPending ? (
                            <span className="n n-pending" title="진행 중인 항목">
                              {nPending}
                            </span>
                          ) : null}
                          {nDone ? (
                            <span className="n n-done" title="완료된 항목">
                              {nDone}
                            </span>
                          ) : null}
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
