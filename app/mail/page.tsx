"use client";

// /mail — 세일즈 메일 템플릿 생성기 (비밀번호 게이트 안, PUBLIC_PATHS 에 추가하지 않음).
//
// 탭 목록은 mail_generators 테이블에서 읽는다. 생성기 추가/수정이 배포 없이 되도록
// 정의를 데이터로 두는 것이 목적이다. 테이블이 비어 있으면 기존 3종을 시드한다.
// useMailGenerator 가 generator key 단위로 슬롯/기본값/폼값을 분리 저장하므로
// 탭 사이 데이터 네임스페이스는 섞이지 않는다.
//
// 저장소에 닿지 못하면 코드 시드로 그냥 뜬다. 내부 도구라 "DB가 안 되면 아무것도 못 쓴다"
// 보다 "저장은 안 되지만 메일은 만든다"가 낫다.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MailGenerator from "@/components/mail/MailGenerator";
import { createClient } from "@/utils/supabase/client";
import {
  compileGenerator,
  initialFieldValues,
} from "@/lib/mail/generators/compile";
import {
  loadGenerators,
  seedGeneratorsIfEmpty,
  visibleGenerators,
  type BrokenGenerator,
  type LoadedGenerator,
} from "@/lib/mail/generators/store";
import { SEED_DEFINITIONS } from "@/lib/mail/generators/seed";

// DB 를 못 읽었을 때 쓰는 목록. 코드 시드를 그대로 쓴다.
const fallbackGenerators = (): LoadedGenerator[] =>
  SEED_DEFINITIONS.map((definition, index) => ({
    key: definition.key,
    sortOrder: index,
    enabled: true,
    definition,
  }));

export default function MailPage() {
  const [generators, setGenerators] = useState<LoadedGenerator[]>([]);
  const [broken, setBroken] = useState<BrokenGenerator[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        await seedGeneratorsIfEmpty(supabase);
        const result = await loadGenerators(supabase);
        if (cancelled) return;
        setGenerators(visibleGenerators(result));
        setBroken(result.broken);
      } catch (e) {
        if (cancelled) return;
        setGenerators(fallbackGenerators());
        setLoadError(
          `생성기 목록을 불러오지 못해 기본 정의로 표시합니다. 이 상태에서는 저장이 되지 않습니다. (${
            (e as Error).message
          })`
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => generators.find((g) => g.key === activeKey) ?? generators[0] ?? null,
    [generators, activeKey]
  );

  // 정의가 바뀔 때만 다시 컴파일한다(매 렌더마다 computeValues 가 새로 생기지 않게).
  const compiled = useMemo(
    () => (active ? compileGenerator(active.definition) : null),
    [active]
  );
  const initialValues = useMemo(
    () => (active ? initialFieldValues(active.definition) : {}),
    [active]
  );

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <span className="mark" />
          <b>메일 템플릿 생성기</b>
        </div>
        <div className="tabs">
          {generators.map((g) => (
            <button
              key={g.key}
              className={`tab${active?.key === g.key ? " active" : ""}`}
              onClick={() => setActiveKey(g.key)}
            >
              {g.definition.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <Link className="tab" href="/mail/generators">
          생성기 관리
        </Link>
        <Link className="tab" href="/mail/log">
          저장 기록
        </Link>
        <Link className="tab" href="/">
          ← 대시보드
        </Link>
      </div>

      <main>
        {loadError && <div className="mg-warning">{loadError}</div>}

        {broken.length > 0 && (
          <div className="mg-warning">
            정의가 올바르지 않아 건너뛴 생성기가 있습니다. 나머지는 정상 동작합니다.
            <ul>
              {broken.map((b) => (
                <li key={b.key}>
                  <b>{b.key}</b> — {b.errors.join(" / ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && <div className="mg-root mg-sub">불러오는 중...</div>}

        {!loading && !compiled && (
          <div className="mg-root mg-sub">
            표시할 생성기가 없습니다. 모두 감춰졌거나 정의가 비어 있습니다.
          </div>
        )}

        {compiled && active && (
          // 탭 전환 시 컨트롤러(슬롯/폼값 상태)를 완전히 재마운트한다.
          <MailGenerator
            key={active.key}
            config={compiled}
            initialFieldValues={initialValues}
          />
        )}
      </main>
    </div>
  );
}
