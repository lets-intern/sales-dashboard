"use client";

import { useStore } from "./store";
import { PlusIcon, TrashIcon } from "./icons";
import { SortTh, sortRows, useSort } from "./sortable";
import { fmtWon } from "@/lib/utils";

export default function ClientsView({
  search,
  onOpenClient,
}: {
  search: string;
  onOpenClient: (id: string) => void;
}) {
  const { clients, deals, updateClient, addClient, deleteClient } = useStore();
  const { sort, toggle } = useSort();

  const dealsCount = (clientId: string) =>
    deals.filter((d) => d.client_id === clientId).length;
  const dealsRevenue = (clientId: string) =>
    deals
      .filter(
        (d) =>
          d.client_id === clientId &&
          (d.status === "사업 진행 중" || d.status === "완료")
      )
      .reduce((a, d) => a + (Number(d.amount) || 0), 0);

  const filtered = clients.filter(
    (c) =>
      !search ||
      ((c.name || "") + (c.contact_person || "")).toLowerCase().includes(search)
  );

  const rows = sortRows(filtered, sort, (c, key) => {
    switch (key) {
      case "deals_count":
        return dealsCount(c.id);
      case "revenue":
        return dealsRevenue(c.id);
      default:
        return (c as unknown as Record<string, string | number | boolean | null>)[key];
    }
  });

  const fields: {
    key:
      | "contact_person"
      | "contact_email"
      | "contact_phone"
      | "biz_reg_no"
      | "tax_email"
      | "notes";
    ph: string;
    cls?: string;
  }[] = [
    { key: "contact_person", ph: "담당자/직함" },
    { key: "contact_email", ph: "이메일" },
    { key: "contact_phone", ph: "연락처" },
    { key: "biz_reg_no", ph: "000-00-00000" },
    { key: "tax_email", ph: "tax@company.com" },
    { key: "notes", ph: "메모" },
  ];

  return (
    <section className="view active">
      <div className="view-head">
        <h1>고객사</h1>
        <span className="count">{rows.length}개사</span>
      </div>
      <div className="card">
        <div className="tbl-scroll">
          <table id="clientsTable">
            <thead>
              <tr>
                <SortTh label="고객사명" sortKey="name" sort={sort} onToggle={toggle} width={220} />
                <SortTh label="담당자" sortKey="contact_person" sort={sort} onToggle={toggle} width={200} />
                <SortTh label="이메일" sortKey="contact_email" sort={sort} onToggle={toggle} width={200} />
                <SortTh label="연락처" sortKey="contact_phone" sort={sort} onToggle={toggle} width={130} />
                <SortTh label="사업자등록번호" sortKey="biz_reg_no" sort={sort} onToggle={toggle} width={140} />
                <SortTh label="세금계산서 발행 메일" sortKey="tax_email" sort={sort} onToggle={toggle} width={200} />
                <SortTh label="메모" sortKey="notes" sort={sort} onToggle={toggle} />
                <SortTh label="세일즈" sortKey="deals_count" sort={sort} onToggle={toggle} width={80} />
                <SortTh label="매출 합계" sortKey="revenue" sort={sort} onToggle={toggle} width={140} />
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty">
                      <b>등록된 고객사가 없어요</b>
                      고객사를 추가하면 세일즈에서 연결할 수 있어요.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const cDeals = deals.filter((d) => d.client_id === c.id);
                  const n = cDeals.length;
                  const revenue = cDeals
                    .filter((d) => d.status === "사업 진행 중" || d.status === "완료")
                    .reduce((a, d) => a + (Number(d.amount) || 0), 0);
                  return (
                    <tr key={c.id}>
                      <td className="name-cell">
                        <button
                          className="client-link"
                          onClick={() => onOpenClient(c.id)}
                          title="판매 내역 보기"
                        >
                          {c.name || "(이름 없음)"}
                        </button>
                      </td>
                      {fields.map((f) => (
                        <td key={f.key} className={f.cls}>
                          <input
                            className="cell"
                            value={c[f.key] || ""}
                            placeholder={f.ph}
                            onChange={(e) =>
                              updateClient(c.id, { [f.key]: e.target.value }, true)
                            }
                          />
                        </td>
                      ))}
                      <td
                        style={{
                          padding: "9px 12px",
                          color: "var(--ink-2)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {n}건
                      </td>
                      <td
                        style={{
                          padding: "9px 12px",
                          color: "var(--ink)",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtWon(revenue)}
                      </td>
                      <td className="actions">
                        <button
                          className="row-del"
                          title="삭제"
                          onClick={() => {
                            if (
                              confirm(
                                "이 고객사를 삭제할까요? 연결된 세일즈는 미연결로 바뀝니다."
                              )
                            )
                              deleteClient(c.id);
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
        <button className="add-row" onClick={() => addClient()}>
          <PlusIcon />새 고객사 추가
        </button>
      </div>
    </section>
  );
}
