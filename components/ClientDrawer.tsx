"use client";

import { useEffect, useMemo } from "react";
import { useStore } from "./store";
import { REVENUE_STATUS, STATUS_COLOR, TYPE_TAG } from "@/lib/constants";
import { fmtWon, mdy } from "@/lib/utils";

export default function ClientDrawer({
  clientId,
  onClose,
  onOpenDeal,
}: {
  clientId: string | null;
  onClose: () => void;
  onOpenDeal: (id: string) => void;
}) {
  const { clients, deals, updateClient } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const c = clients.find((x) => x.id === clientId) || null;
  const open = !!c;

  // 집행 날짜(기간 시작일) 최신순 정렬
  const history = useMemo(() => {
    if (!c) return [];
    return deals
      .filter((d) => d.client_id === c.id)
      .sort((a, b) => (b.period_start || "").localeCompare(a.period_start || ""));
  }, [c, deals]);

  const revenue = history
    .filter((d) => REVENUE_STATUS.includes(d.status))
    .reduce((a, d) => a + (Number(d.amount) || 0), 0);
  const totalAll = history.reduce((a, d) => a + (Number(d.amount) || 0), 0);

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={onClose} />
      <aside className={`drawer${open ? " open" : ""}`}>
        <div className="drawer-head">
          <input
            className="d-name"
            placeholder="고객사명"
            value={c?.name || ""}
            onChange={(e) => c && updateClient(c.id, { name: e.target.value }, true)}
          />
          <button className="x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          {c && (
            <>
              <div className="d-sec">
                <h3>고객사 정보</h3>
                <div className="d-grid">
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
                  <div className="fld">
                    <label>사업자등록번호</label>
                    <input
                      value={c.biz_reg_no || ""}
                      placeholder="000-00-00000"
                      onChange={(e) =>
                        updateClient(c.id, { biz_reg_no: e.target.value }, true)
                      }
                    />
                  </div>
                  <div className="fld">
                    <label>세금계산서 발행 메일</label>
                    <input
                      value={c.tax_email || ""}
                      placeholder="tax@company.com"
                      onChange={(e) =>
                        updateClient(c.id, { tax_email: e.target.value }, true)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="d-sec">
                <h3>거래 요약</h3>
                <div className="cd-summary">
                  <div className="cd-stat">
                    <span className="lab">총 거래</span>
                    <span className="val">{history.length}건</span>
                  </div>
                  <div className="cd-stat">
                    <span className="lab">진행·완료 매출</span>
                    <span className="val">{fmtWon(revenue)}</span>
                  </div>
                  <div className="cd-stat">
                    <span className="lab">전체 합계</span>
                    <span className="val">{fmtWon(totalAll)}</span>
                  </div>
                </div>
              </div>

              <div className="d-sec">
                <h3>판매 내역 · {history.length}건</h3>
                {history.length === 0 ? (
                  <div className="cd-empty">아직 등록된 거래가 없어요.</div>
                ) : (
                  <div className="cd-history">
                    {history.map((d) => {
                      const tg = TYPE_TAG[d.type] || [
                        "var(--s-gray-bg)",
                        "var(--s-gray-fg)",
                      ];
                      const sc = STATUS_COLOR[d.status] || "gray";
                      const period =
                        mdy(d.period_start) +
                        (d.period_end ? ` → ${mdy(d.period_end)}` : "");
                      return (
                        <button
                          key={d.id}
                          className="cd-deal"
                          onClick={() => onOpenDeal(d.id)}
                          title="세일즈 상세 열기"
                        >
                          <div className="cd-deal-top">
                            <span className="cd-deal-name">
                              {d.name || "(이름 없음)"}
                            </span>
                            <span className="cd-deal-amt">{fmtWon(d.amount)}</span>
                          </div>
                          <div className="cd-deal-meta">
                            <span
                              className="tag"
                              style={{ background: tg[0], color: tg[1] }}
                            >
                              {d.type}
                            </span>
                            <span className="pill" data-c={sc}>
                              {d.status}
                            </span>
                            <span className="cd-deal-date">
                              {period || "기간 미정"}
                            </span>
                            {d.paid && <span className="cd-deal-paid">입금완료</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
