"use client";

// /mail — 세일즈 메일 템플릿 생성기 (비밀번호 게이트 안, PUBLIC_PATHS 에 추가하지 않음).
// 서브탭 3종(콜드메일/무료공고/대외활동) 셸. 이번 Push 에서는 무료공고(intern)만 활성.

import Link from "next/link";
import { useState } from "react";
import MailGenerator from "@/components/mail/MailGenerator";
import { internConfig, INTERN_DEFAULT_FIELD_VALUES } from "@/lib/mail/configs/intern";

type MailTab = "sales" | "intern" | "activity";

const TABS: { id: MailTab; label: string; ready: boolean }[] = [
  { id: "sales", label: "콜드메일", ready: false },
  { id: "intern", label: "무료공고", ready: true },
  { id: "activity", label: "대외활동", ready: false },
];

export default function MailPage() {
  const [tab, setTab] = useState<MailTab>("intern");

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark" />
          <b>메일 템플릿 생성기</b>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => t.ready && setTab(t.id)}
              disabled={!t.ready}
              title={t.ready ? undefined : "준비 중"}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <Link className="tab" href="/">
          ← 대시보드
        </Link>
      </div>

      <main>
        {tab === "intern" && (
          <MailGenerator
            config={internConfig}
            initialFieldValues={INTERN_DEFAULT_FIELD_VALUES}
          />
        )}
        {tab !== "intern" && (
          <div className="card" style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
            <b>준비 중입니다.</b>
            <div style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 12.5 }}>
              이 생성기는 다음 단계에서 추가됩니다.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
