"use client";

import { useStore } from "./store";
import { PlusIcon, TrashIcon } from "./icons";
import { fmtWon } from "@/lib/utils";

export default function ClientsView({ search }: { search: string }) {
  const { clients, deals, updateClient, addClient, deleteClient } = useStore();

  const rows = clients.filter(
    (c) =>
      !search ||
      ((c.name || "") + (c.contact_person || "")).toLowerCase().includes(search)
  );

  const fields: {
    key:
      | "name"
      | "contact_person"
      | "contact_email"
      | "contact_phone"
      | "biz_reg_no"
      | "tax_email"
      | "notes";
    ph: string;
    cls?: string;
  }[] = [
    { key: "name", ph: "고객사명", cls: "name-cell" },
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
                <th style={{ width: 220 }}>고객사명</th>
                <th style={{ width: 200 }}>담당자</th>
                <th style={{ width: 200 }}>이메일</th>
                <th style={{ width: 130 }}>연락처</th>
                <th style={{ width: 140 }}>사업자등록번호</th>
                <th style={{ width: 200 }}>세금계산서 발행 메일</th>
                <th>메모</th>
                <th style={{ width: 80 }}>세일즈</th>
                <th style={{ width: 140 }}>매출 합계</th>
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
