// 기존 3종을 JSON 정의로 옮긴 뒤에도 "완성된 메일이 한 글자도 바뀌지 않는지" 검증한다.
//
// computeValues 의 반환 키를 비교하지 않는다. 기존 구현은 템플릿이 쓰지 않는 값
// (모집마감일전체·마감요일·디데이·직무명·활동분야)까지 만들어 냈고, 그건 결과에
// 영향을 주지 않기 때문이다. 실제로 지켜야 할 계약은 "같은 입력 → 같은 최종 문구"다.

import { describe, it, expect } from "vitest";
import { substitute, escapeForHtml, identity } from "../../engine/substitute";
import { salesConfig, SALES_DEFAULT_FIELD_VALUES } from "../../configs/sales";
import { internConfig, INTERN_DEFAULT_FIELD_VALUES } from "../../configs/intern";
import {
  activityConfig,
  ACTIVITY_DEFAULT_FIELD_VALUES,
} from "../../configs/activity";
import type { GeneratorConfig } from "../../configs/types";
import { compileGenerator, initialFieldValues } from "../compile";
import {
  salesDefinition,
  internDefinition,
  activityDefinition,
} from "../seed";
import type { GeneratorDefinition } from "../definition";

// config 로 제목·본문을 실제로 렌더한다(useMailGenerator 와 동일한 경로).
function render(config: GeneratorConfig, state: Record<string, string>) {
  const values = config.computeValues(state);
  const rawHtmlKeys = new Set(config.rawHtmlKeys);
  return {
    subject: substitute(config.factorySubject, values, identity, rawHtmlKeys),
    body: substitute(config.factoryBody, values, escapeForHtml, rawHtmlKeys),
  };
}

const STAT_STATE = {
  statViews: "81.3만 회",
  statReach: "9.1만 계정",
  statEngagement: "1.6만 회",
  rateViews: "12.5%",
  rateReach: "6.1%",
  rateEngagement: "10.2%",
  organicRatio: "98%",
  organicViews: "79.8만 회",
};

interface Case {
  name: string;
  config: GeneratorConfig;
  definition: GeneratorDefinition;
  /** 기존 config 기준 폼 상태 */
  legacyState: Record<string, string>;
  /** 정의 기준 폼 상태 (period 는 시작/종료 키가 다르다) */
  compiledState: Record<string, string>;
  /** 기존 config 의 폼 기본값 */
  legacyDefaults: Record<string, string>;
}

const cases: Case[] = [
  {
    name: "sales (콜드메일)",
    config: salesConfig,
    definition: salesDefinition,
    legacyState: {
      clientName: "연세 IT 미래교육원",
      programName: "노코드 AI 서비스 개발자2기",
      deadline: "2026-08-14",
      replyDeadline: "2026-07-31",
      interestPhrase: salesConfig.fields.find((f) => f.id === "interestPhrase")!
        .options![1].value,
      recipientEmail: "hr@company.com",
    },
    compiledState: {
      clientName: "연세 IT 미래교육원",
      programName: "노코드 AI 서비스 개발자2기",
      deadline: "2026-08-14",
      replyDeadline: "2026-07-31",
      interestPhrase: salesConfig.fields.find((f) => f.id === "interestPhrase")!
        .options![1].value,
      recipientEmail: "hr@company.com",
    },
    legacyDefaults: SALES_DEFAULT_FIELD_VALUES,
  },
  {
    name: "intern (무료공고)",
    config: internConfig,
    definition: internDefinition,
    legacyState: {
      companyName: "렛츠커리어",
      jobFieldReason: internConfig.fields.find((f) => f.id === "jobFieldReason")!
        .options![2].value,
      postingName: "2026년 하반기 마케팅 인턴 채용",
      replyDeadline: "2026-07-31",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
      ...STAT_STATE,
    },
    compiledState: {
      companyName: "렛츠커리어",
      jobFieldReason: internConfig.fields.find((f) => f.id === "jobFieldReason")!
        .options![2].value,
      postingName: "2026년 하반기 마케팅 인턴 채용",
      replyDeadline: "2026-07-31",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
      ...STAT_STATE,
    },
    legacyDefaults: INTERN_DEFAULT_FIELD_VALUES,
  },
  {
    name: "activity (대외활동)",
    config: activityConfig,
    definition: activityDefinition,
    legacyState: {
      institutionName: "렛츠커리어",
      activityFieldReason: activityConfig.fields.find(
        (f) => f.id === "activityFieldReason"
      )!.options![1].value,
      postingName: "2026년 대학생 서포터즈 8기 모집",
      replyDeadline: "2026-07-31",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
      ...STAT_STATE,
    },
    compiledState: {
      institutionName: "렛츠커리어",
      activityFieldReason: activityConfig.fields.find(
        (f) => f.id === "activityFieldReason"
      )!.options![1].value,
      postingName: "2026년 대학생 서포터즈 8기 모집",
      replyDeadline: "2026-07-31",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
      ...STAT_STATE,
    },
    legacyDefaults: ACTIVITY_DEFAULT_FIELD_VALUES,
  },
];

describe.each(cases)("$name — JSON 정의 이관 후 동등성", (c) => {
  const compiled = compileGenerator(c.definition);

  it("기본 제목이 문자 단위로 같다", () => {
    expect(compiled.factorySubject).toBe(c.config.factorySubject);
  });

  it("기본 본문이 문자 단위로 같다", () => {
    expect(compiled.factoryBody).toBe(c.config.factoryBody);
  });

  it("같은 입력에서 완성된 제목이 같다", () => {
    expect(render(compiled, c.compiledState).subject).toBe(
      render(c.config, c.legacyState).subject
    );
  });

  it("같은 입력에서 완성된 본문이 같다", () => {
    expect(render(compiled, c.compiledState).body).toBe(
      render(c.config, c.legacyState).body
    );
  });

  it("아무것도 입력하지 않은 초기 상태에서도 결과가 같다", () => {
    // 리터럴 {} 로 비교하지 않는다. 폼은 항상 기본값으로 시작하고 select 는 비울 수 없다.
    // (기존 구현은 sales 만 미선택 select 를 빈 문자열로, intern/activity 는 첫 옵션으로
    //  처리해 서로 달랐다. 통합 구현은 후자를 따르며 이는 폼 기본값과 일치한다.)
    expect(render(compiled, initialFieldValues(c.definition))).toEqual(
      render(c.config, c.legacyDefaults)
    );
  });

  it("조사 처리 대상이 같다", () => {
    // 기존 josaVars 중 템플릿이 쓰지 않는 select 라벨(직무명·활동분야)은 제외된다.
    const used = c.config.josaVars.filter((v) =>
      c.config.factoryBody.includes(`{{${v}}}`) ||
      c.config.factorySubject.includes(`{{${v}}}`)
    );
    expect(new Set(compiled.josaVars)).toEqual(new Set(used));
  });

  it("HTML 원본 삽입 대상이 같다", () => {
    expect(new Set(compiled.rawHtmlKeys)).toEqual(new Set(c.config.rawHtmlKeys));
  });

  it("수신자·첨부 설정이 같다", () => {
    expect(compiled.recipient).toEqual(c.config.recipient);
    expect(compiled.attachment).toEqual(c.config.attachment);
  });
});
