import { describe, it, expect } from "vitest";
import { activityConfig, ACTIVITY_DEFAULT_FIELD_VALUES } from "../activity";
import { substitute, escapeForHtml, identity } from "../../engine/substitute";

describe("activityConfig — 기본 정의", () => {
  it("key/label/josaVars/rawHtmlKeys 가 스펙대로다", () => {
    expect(activityConfig.key).toBe("activity");
    expect(activityConfig.label).toBe("대외활동");
    expect(activityConfig.josaVars).toEqual(["기관명", "활동분야", "공고명"]);
    expect(activityConfig.rawHtmlKeys).toEqual([]);
  });

  it("폼 필드는 14개이며 활동 분야 셀렉트는 9개 옵션이다", () => {
    expect(activityConfig.fields).toHaveLength(14);
    const select = activityConfig.fields.find((f) => f.type === "select");
    expect(select?.id).toBe("activityFieldReason");
    expect(select?.options).toHaveLength(9);
    expect(select?.options?.[0].label).toBe("서포터즈·홍보대사");
  });

  it("공장 기본 제목/본문이 프로토타입과 일치한다(귀 기관/대외활동 문구)", () => {
    expect(activityConfig.factorySubject).toBe(
      "[오늘의공고 1회 편성 안내] {{기관명}} {{공고명}}"
    );
    expect(activityConfig.factoryBody).toContain(
      "귀 기관의 「{{공고명}}」을 렛츠커리어 인스타그램 <b>'오늘의공고'</b>"
    );
    expect(activityConfig.factoryBody).toContain(
      "놓치기 쉬운 대외활동 기회를 선별해,"
    );
  });
});

describe("activityConfig.computeValues — 값→플레이스홀더 매핑", () => {
  it("활동분야는 옵션 라벨, 선정이유는 옵션 값(문장)으로 매핑된다", () => {
    const v = activityConfig.computeValues({
      activityFieldReason:
        "콘텐츠 제작과 글쓰기 경험을 원하는 참여자에게 적합한 활동으로",
    });
    expect(v["활동분야"]).toBe("기자단·에디터");
    expect(v["선정이유"]).toBe(
      "콘텐츠 제작과 글쓰기 경험을 원하는 참여자에게 적합한 활동으로"
    );
  });

  it("알 수 없는 선택값은 첫 옵션으로 폴백한다", () => {
    const v = activityConfig.computeValues({ activityFieldReason: "없는값" });
    expect(v["활동분야"]).toBe("서포터즈·홍보대사");
  });

  it("회신기한은 short(M월D일) 포맷이다", () => {
    const v = activityConfig.computeValues({ replyDeadline: "2026-07-01" });
    expect(v["회신기한"]).toBe("7월1일");
  });

  it("통계기간 full/compact 파생값이 규칙대로 계산된다", () => {
    const v = activityConfig.computeValues({
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
    });
    expect(v["통계기간"]).toBe("2026년 6월 22일-7월 5일");
    expect(v["통계기간축약"]).toBe("2026.06.22-07.05");
  });

  it("통계/증가율 텍스트는 trim 후 그대로 통과된다", () => {
    const v = activityConfig.computeValues({
      institutionName: "  렛츠커리어  ",
      postingName: " 서포터즈 8기 ",
      statViews: " 81.3만 회 ",
      organicViews: "79.8만 회",
    });
    expect(v["기관명"]).toBe("렛츠커리어");
    expect(v["공고명"]).toBe("서포터즈 8기");
    expect(v["조회수"]).toBe("81.3만 회");
    expect(v["일반콘텐츠조회수"]).toBe("79.8만 회");
  });
});

describe("activityConfig — 엔진 연동(치환 + 조사)", () => {
  it("기본 제목이 기관명/공고명으로 치환된다", () => {
    const values = activityConfig.computeValues({
      institutionName: "렛츠커리어",
      postingName: "대학생 서포터즈 8기 모집",
    });
    const out = substitute(activityConfig.factorySubject, values, identity);
    expect(out).toBe(
      "[오늘의공고 1회 편성 안내] 렛츠커리어 대학생 서포터즈 8기 모집"
    );
  });

  it("본문이 기관명/선정이유/통계기간으로 치환된다", () => {
    const values = activityConfig.computeValues({
      ...ACTIVITY_DEFAULT_FIELD_VALUES,
      institutionName: "렛츠커리어",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
    });
    const out = substitute(activityConfig.factoryBody, values, escapeForHtml);
    expect(out).toContain("안녕하세요, 렛츠커리어 담당자님.");
    expect(out).toContain("2026년 6월 22일-7월 5일에는 전체 콘텐츠 기준으로");
  });
});
