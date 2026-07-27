"use client";

// /mail/log — 임시보관함 저장 기록.
// 어느 상대에게 / 어떤 생성기의 / 어떤 템플릿으로 초안을 만들었는지 되짚어 본다.
// 발송 기록이 아니라 저장 기록이다(이 앱은 메일을 보내지 않는다).

import "@/components/mail/mail.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  draftLogFacets,
  filterDraftLogs,
  loadDraftLogs,
  type DraftLog,
  type DraftLogFilter,
} from "@/lib/mail/draftLog";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function DraftLogPage() {
  const [logs, setLogs] = useState<DraftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<DraftLogFilter>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await loadDraftLogs(supabase);
        if (!cancelled) setLogs(rows);
      } catch (e) {
        if (!cancelled) {
          setError(
            (e as Error).message.includes("mail_draft_logs")
              ? "기록 테이블이 아직 없습니다. supabase/migration_mail_draft_logs.sql 을 실행해 주세요."
              : `기록을 불러오지 못했습니다: ${(e as Error).message}`
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => draftLogFacets(logs), [logs]);
  const rows = useMemo(() => filterDraftLogs(logs, filter), [logs, filter]);

  const set = (patch: Partial<DraftLogFilter>) =>
    setFilter((prev) => ({ ...prev, ...patch }));

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark" />
          <b>임시보관함 저장 기록</b>
        </div>
        <div className="spacer" />
        <Link className="tab" href="/mail">
          ← 메일 생성기
        </Link>
      </div>

      <main>
        <div className="mg-root">
          <div className="mg-panel">
            <div className="dl-filters">
              <label className="dl-field">
                <span>검색</span>
                <input
                  type="search"
                  value={filter.query ?? ""}
                  placeholder="고객사명·받는사람·제목"
                  onChange={(e) => set({ query: e.target.value })}
                />
              </label>

              <label className="dl-field dl-narrow">
                <span>생성기</span>
                <select
                  value={filter.generator ?? ""}
                  onChange={(e) => set({ generator: e.target.value })}
                >
                  <option value="">전체</option>
                  {facets.generators.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dl-field dl-narrow">
                <span>템플릿</span>
                <select
                  value={filter.slotName ?? ""}
                  onChange={(e) => set({ slotName: e.target.value })}
                >
                  <option value="">전체</option>
                  {facets.slotNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <label className="dl-field dl-narrow">
                <span>시작일</span>
                <input
                  type="date"
                  value={filter.from ?? ""}
                  onChange={(e) => set({ from: e.target.value })}
                />
              </label>

              <label className="dl-field dl-narrow">
                <span>종료일</span>
                <input
                  type="date"
                  value={filter.to ?? ""}
                  onChange={(e) => set({ to: e.target.value })}
                />
              </label>

              <button
                type="button"
                className="mg-btn"
                onClick={() => setFilter({})}
              >
                초기화
              </button>
            </div>

            <div className="mg-sub">
              {loading
                ? "불러오는 중..."
                : `${rows.length}건${
                    rows.length !== logs.length ? ` / 전체 ${logs.length}건` : ""
                  }`}
            </div>
          </div>

          {error && (
            <div className="mg-panel dl-error">{error}</div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="mg-panel mg-sub">
              {logs.length === 0
                ? "아직 저장 기록이 없습니다. 초안을 임시보관함에 저장하면 여기에 쌓입니다."
                : "조건에 맞는 기록이 없습니다."}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mg-panel dl-table-wrap">
              <table className="dl-table">
                <thead>
                  <tr>
                    <th>저장 시각</th>
                    <th>상대</th>
                    <th>생성기</th>
                    <th>템플릿</th>
                    <th>받는사람</th>
                    <th>제목</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() =>
                        setExpanded(expanded === log.id ? null : log.id)
                      }
                      className={expanded === log.id ? "expanded" : ""}
                    >
                      <td className="dl-when">{formatWhen(log.created_at)}</td>
                      <td className="dl-counterparty">
                        {log.counterparty || "-"}
                      </td>
                      <td>{log.generator_label || log.generator}</td>
                      <td>{log.slot_name || (log.slot ? `템플릿 ${log.slot}` : "-")}</td>
                      <td className="dl-mono">{log.recipient || "-"}</td>
                      <td className="dl-subject">
                        {log.subject}
                        {expanded === log.id && (
                          <dl className="dl-detail">
                            {Object.entries(log.field_values).map(([k, v]) => (
                              <div key={k}>
                                <dt>{k}</dt>
                                <dd>{v || "-"}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mg-sub">행을 누르면 그때 입력한 값을 볼 수 있습니다.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
