"use client";

// /mail — 세일즈 메일 템플릿 생성기 (비밀번호 게이트 안, PUBLIC_PATHS 에 추가하지 않음).
// 서브탭 3종(콜드메일/무료공고/대외활동) 셸. 각 탭은 독립 config 를 로드하며,
// useMailGenerator 가 config.key(sales/intern/activity) 단위로 슬롯/기본값/폼값을
// 분리 저장하므로 탭 사이 데이터 네임스페이스가 섞이지 않는다.
// (Gmail 초안 패널은 Push 5에서 추가된다.)

import Link from "next/link";
import { useState } from "react";
import MailGenerator from "@/components/mail/MailGenerator";
import type { GeneratorConfig } from "@/lib/mail/configs/types";
import { salesConfig, SALES_DEFAULT_FIELD_VALUES } from "@/lib/mail/configs/sales";
import { internConfig, INTERN_DEFAULT_FIELD_VALUES } from "@/lib/mail/configs/intern";
import {
  activityConfig,
  ACTIVITY_DEFAULT_FIELD_VALUES,
} from "@/lib/mail/configs/activity";
import type { GeneratorKey } from "@/lib/mail/types";

interface TabDef {
  id: GeneratorKey;
  config: GeneratorConfig;
  initialFieldValues: Record<string, string>;
}

// 서브탭 3종. 표시 순서는 콜드메일 → 무료공고 → 대외활동.
const TABS: TabDef[] = [
  { id: "sales", config: salesConfig, initialFieldValues: SALES_DEFAULT_FIELD_VALUES },
  { id: "intern", config: internConfig, initialFieldValues: INTERN_DEFAULT_FIELD_VALUES },
  { id: "activity", config: activityConfig, initialFieldValues: ACTIVITY_DEFAULT_FIELD_VALUES },
];

export default function MailPage() {
  const [tab, setTab] = useState<GeneratorKey>("sales");

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

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
              onClick={() => setTab(t.id)}
            >
              {t.config.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <Link className="tab" href="/mail/log">
          저장 기록
        </Link>
        <Link className="tab" href="/">
          ← 대시보드
        </Link>
      </div>

      <main>
        {/* config.key 를 key 로 줘서 탭 전환 시 컨트롤러(슬롯/폼값 상태)를 완전히 재마운트한다. */}
        <MailGenerator
          key={activeTab.id}
          config={activeTab.config}
          initialFieldValues={activeTab.initialFieldValues}
        />
      </main>
    </div>
  );
}
