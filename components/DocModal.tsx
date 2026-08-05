"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import { BANK_ACCOUNT, SUPPLIER } from "@/lib/constants";
import type { Deal, StatementData, StatementLine } from "@/lib/types";
import { ymd, yymmdd } from "@/lib/utils";

export type DocMode = "statement" | "quote";

const CONFIG: Record<
  DocMode,
  { title: string; dateLabel: string; noteLine: string }
> = {
  statement: {
    title: "거 래 내 역 서",
    dateLabel: "영수일 ▶",
    noteLine: "※ 하기와 같이 영수합니다.",
  },
  quote: {
    title: "견 적 서",
    dateLabel: "견적일 ▶",
    noteLine: "※ 하기와 같이 견적합니다. (견적일로부터 10일간 유효합니다.)",
  },
};

function buildDefault(
  deal: Deal,
  clientName: string,
  contactPerson: string,
  contactEmail: string
): StatementData {
  const today = ymd(new Date());
  const base = deal.period_start || today;
  return {
    receipt_date: base,
    lines: [
      {
        date: yymmdd(base),
        name: deal.name || `${clientName} 광고 진행`,
        list_price: deal.amount || 0,
        sale_price: deal.amount || 0,
        note: "",
      },
    ],
    pay_method: deal.invoice_status === "카드 결제" ? "카드 결제" : "",
    contact_note: contactPerson
      ? `${contactPerson} 님${contactEmail ? ` (${contactEmail})` : ""}`
      : "",
  };
}

const won = (n: number) => (Number(n) || 0).toLocaleString("ko-KR");

// public/stamp.png 이 있으면 도장 이미지를, 없으면 빨간 박스로 대체
function StampMark() {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="stmt-stamp">아이엔지</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="stmt-stamp-img"
      src="/stamp.png"
      alt="아이엔지 도장"
      onError={() => setFailed(true)}
    />
  );
}

export default function DocModal({
  deal,
  mode,
  onClose,
}: {
  deal: Deal;
  mode: DocMode;
  onClose: () => void;
}) {
  const { clients, updateDeal } = useStore();
  const client = clients.find((c) => c.id === deal.client_id) || null;
  const cfg = CONFIG[mode];
  const field = mode === "quote" ? "quote" : "statement";

  const [data, setData] = useState<StatementData>(
    () =>
      (deal[field] as StatementData | null | undefined) ||
      buildDefault(
        deal,
        client?.name || "",
        client?.contact_person || "",
        client?.contact_email || ""
      )
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commit(next: StatementData) {
    setData(next);
    updateDeal(deal.id, { [field]: next } as Partial<Deal>, true);
  }
  function patch(p: Partial<StatementData>) {
    commit({ ...data, ...p });
  }
  function setLine(i: number, p: Partial<StatementLine>) {
    commit({ ...data, lines: data.lines.map((l, idx) => (idx === i ? { ...l, ...p } : l)) });
  }
  function addLine() {
    commit({
      ...data,
      lines: [
        ...data.lines,
        { date: yymmdd(data.receipt_date), name: "", list_price: 0, sale_price: 0, note: "" },
      ],
    });
  }
  function removeLine(i: number) {
    commit({ ...data, lines: data.lines.filter((_, idx) => idx !== i) });
  }

  const totals = useMemo(
    () =>
      data.lines.reduce(
        (a, l) => ({
          list: a.list + (Number(l.list_price) || 0),
          sale: a.sale + (Number(l.sale_price) || 0),
        }),
        { list: 0, sale: 0 }
      ),
    [data.lines]
  );

  const recipient = `${client?.name || "고객사"}${
    client?.contact_person ? " " + client.contact_person : ""
  } 귀하`;

  return (
    <div className="stmt-backdrop">
      <div className="stmt-toolbar stmt-noprint">
        <span className="stmt-hint">필드를 클릭해 수정한 뒤 인쇄하세요. 내용은 자동 저장됩니다.</span>
        <div className="spacer" />
        <button className="stmt-print-btn" onClick={() => window.print()}>
          인쇄 / PDF 저장
        </button>
        <button className="stmt-close-btn" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="stmt-print">
        <div className="stmt-sheet">
          <h1 className="stmt-title">{cfg.title}</h1>

          <div className="stmt-header">
            <div className="stmt-recipient">
              <div className="stmt-to">{recipient}</div>
              <div className="stmt-meta">
                <span className="lab">{cfg.dateLabel}</span>
                <input
                  type="date"
                  value={data.receipt_date}
                  onChange={(e) => patch({ receipt_date: e.target.value })}
                />
              </div>
              <div className="stmt-meta">
                <span className="lab">담당자 ▶</span>
                <span className="val">{deal.owner || "—"}</span>
              </div>
              <StampMark />
            </div>

            <div className="stmt-supplier">
              <div className="sp-side">공급자</div>
              <table className="sp-table">
                <tbody>
                  <tr>
                    <th>등록번호</th>
                    <td colSpan={3}>{SUPPLIER.reg_no}</td>
                  </tr>
                  <tr>
                    <th>상호명</th>
                    <td colSpan={3}>{SUPPLIER.company}</td>
                  </tr>
                  <tr>
                    <th>대표자</th>
                    <td colSpan={3}>{SUPPLIER.ceo}</td>
                  </tr>
                  <tr>
                    <th>업태</th>
                    <td>{SUPPLIER.biz_type}</td>
                    <th>종목</th>
                    <td>{SUPPLIER.biz_item}</td>
                  </tr>
                  <tr>
                    <th>연락처</th>
                    <td colSpan={3}>{SUPPLIER.contact}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="stmt-note-line">{cfg.noteLine}</div>

          <table className="stmt-items">
            <thead>
              <tr>
                <th style={{ width: 90 }}>거래일</th>
                <th>항목</th>
                <th style={{ width: 120 }}>정가</th>
                <th style={{ width: 120 }}>할인가</th>
                <th style={{ width: 180 }}>비고</th>
                <th className="stmt-noprint" style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="li li-c"
                      value={l.date}
                      onChange={(e) => setLine(i, { date: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="li"
                      value={l.name}
                      placeholder="항목 설명"
                      onChange={(e) => setLine(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="li li-r"
                      type="number"
                      value={l.list_price}
                      onChange={(e) => setLine(i, { list_price: Number(e.target.value) || 0 })}
                    />
                    <span className="li-print">{won(l.list_price)}</span>
                  </td>
                  <td>
                    <input
                      className="li li-r"
                      type="number"
                      value={l.sale_price}
                      onChange={(e) => setLine(i, { sale_price: Number(e.target.value) || 0 })}
                    />
                    <span className="li-print">{won(l.sale_price)}</span>
                  </td>
                  <td>
                    <input
                      className="li li-c"
                      value={l.note}
                      placeholder="예: *특별 15% 할인 적용"
                      onChange={(e) => setLine(i, { note: e.target.value })}
                    />
                  </td>
                  <td className="stmt-noprint">
                    <button className="li-del" title="행 삭제" onClick={() => removeLine(i)}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="stmt-total">
                <td colSpan={2}>합 계</td>
                <td className="li-r">{won(totals.list)}</td>
                <td className="li-r">{won(totals.sale)}</td>
                <td>VAT 별도</td>
                <td className="stmt-noprint"></td>
              </tr>
            </tbody>
          </table>

          <button className="stmt-add-line stmt-noprint" onClick={addLine}>
            + 항목 추가
          </button>

          <div className="stmt-footer">
            <div className="stmt-foot-row">
              <span className="lab">*결제 방법:</span>
              <input
                className="li"
                value={data.pay_method}
                placeholder="예: 카드 결제 / 계좌이체"
                onChange={(e) => patch({ pay_method: e.target.value })}
              />
            </div>
            {/계좌|이체/.test(data.pay_method) && (
              <div className="stmt-foot-row">
                <span className="lab">*입금 계좌:</span>
                <span className="stmt-acct">{BANK_ACCOUNT}</span>
              </div>
            )}
            <div className="stmt-foot-row">
              <span className="lab">*담당자:</span>
              <input
                className="li"
                value={data.contact_note}
                placeholder="예: 홍길동 매니저님 (mail@company.com)"
                onChange={(e) => patch({ contact_note: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
