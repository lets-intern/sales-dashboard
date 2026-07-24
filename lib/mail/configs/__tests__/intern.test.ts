import { describe, it, expect } from "vitest";
import { internConfig, INTERN_DEFAULT_FIELD_VALUES } from "../intern";
import { substitute, escapeForHtml, identity } from "../../engine/substitute";

describe("internConfig — 기본 정의", () => {
  it("key/label/josaVars/rawHtmlKeys 가 스펙대로다", () => {
    expect(internConfig.key).toBe("intern");
    expect(internConfig.label).toBe("무료공고");
    expect(internConfig.josaVars).toEqual(["회사명", "직무명", "공고명"]);
    expect(internConfig.rawHtmlKeys).toEqual([]);
  });

  it("폼 필드는 14개이며 직무 분야 셀렉트는 8개 옵션이다", () => {
    expect(internConfig.fields).toHaveLength(14);
    const select = internConfig.fields.find((f) => f.type === "select");
    expect(select?.id).toBe("jobFieldReason");
    expect(select?.options).toHaveLength(8);
  });

  it("공장 기본 제목/본문이 프로토타입과 일치한다", () => {
    expect(internConfig.factorySubject).toBe(
      "[오늘의공고 1회 편성 안내] {{회사명}} {{공고명}}"
    );
    expect(internConfig.factoryBody).toContain(
      "귀사의 「{{공고명}}」을 렛츠커리어 인스타그램 <b>'오늘의공고'</b>"
    );
    expect(internConfig.factoryBody).toContain("{{선정이유}} 판단했습니다.");
  });
});

describe("internConfig.computeValues — 값→플레이스홀더 매핑", () => {
  it("직무명은 옵션 라벨, 선정이유는 옵션 값(문장)으로 매핑된다", () => {
    const v = internConfig.computeValues({
      jobFieldReason:
        "디자인 실무와 포트폴리오 경험을 함께 쌓을 수 있는 공고로",
    });
    expect(v["직무명"]).toBe("디자인");
    expect(v["선정이유"]).toBe(
      "디자인 실무와 포트폴리오 경험을 함께 쌓을 수 있는 공고로"
    );
  });

  it("알 수 없는 선택값은 첫 옵션으로 폴백한다", () => {
    const v = internConfig.computeValues({ jobFieldReason: "없는값" });
    expect(v["직무명"]).toBe("마케팅");
  });

  it("회신기한은 short(M월D일) 포맷이다", () => {
    const v = internConfig.computeValues({ replyDeadline: "2026-07-01" });
    expect(v["회신기한"]).toBe("7월1일");
  });

  it("통계기간 full/compact 파생값이 규칙대로 계산된다", () => {
    const v = internConfig.computeValues({
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
    });
    expect(v["통계기간"]).toBe("2026년 6월 22일-7월 5일");
    expect(v["통계기간축약"]).toBe("2026.06.22-07.05");
  });

  it("통계/증가율 텍스트는 trim 후 그대로 통과된다", () => {
    const v = internConfig.computeValues({
      companyName: "  렛츠커리어  ",
      postingName: " 마케팅 인턴 ",
      statViews: " 81.3만 회 ",
      rateViews: " 12.5% ",
      organicRatio: "98%",
      organicViews: "79.8만 회",
    });
    expect(v["회사명"]).toBe("렛츠커리어");
    expect(v["공고명"]).toBe("마케팅 인턴");
    expect(v["조회수"]).toBe("81.3만 회");
    expect(v["조회수증가율"]).toBe("12.5%");
    expect(v["일반콘텐츠비율"]).toBe("98%");
    expect(v["일반콘텐츠조회수"]).toBe("79.8만 회");
  });

  it("빈 날짜는 빈 문자열로 파생된다", () => {
    const v = internConfig.computeValues({});
    expect(v["회신기한"]).toBe("");
    expect(v["통계기간"]).toBe("");
    expect(v["통계기간축약"]).toBe("");
  });
});

describe("internConfig — 엔진 연동(치환+조사)", () => {
  it("기본 제목이 회사명/공고명으로 치환된다", () => {
    const values = internConfig.computeValues({
      companyName: "렛츠커리어",
      postingName: "마케팅 인턴 채용",
    });
    const out = substitute(internConfig.factorySubject, values, identity);
    expect(out).toBe("[오늘의공고 1회 편성 안내] 렛츠커리어 마케팅 인턴 채용");
  });

  it("본문의 조사가 받침에 맞게 선택된다(회사명[은/는] 없어도 통계기간 등 치환)", () => {
    const values = internConfig.computeValues({
      ...INTERN_DEFAULT_FIELD_VALUES,
      companyName: "렛츠커리어",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
    });
    const out = substitute(internConfig.factoryBody, values, escapeForHtml);
    expect(out).toContain("안녕하세요, 렛츠커리어 채용 담당자님.");
    expect(out).toContain("2026년 6월 22일-7월 5일에는 전체 콘텐츠 기준으로");
  });
});
