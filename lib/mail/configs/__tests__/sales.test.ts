import { describe, it, expect, vi, afterEach } from "vitest";
import {
  salesConfig,
  SALES_DEFAULT_FIELD_VALUES,
  isValidRecipientEmail,
  programNameHasEmail,
  computeSalesCanSave,
  countOccurrences,
  collectSalesSendGuards,
} from "../sales";
import { substitute, escapeForHtml, identity } from "../../engine/substitute";

describe("salesConfig — 기본 정의", () => {
  it("key/label/josaVars/rawHtmlKeys 가 스펙대로다", () => {
    expect(salesConfig.key).toBe("sales");
    expect(salesConfig.label).toBe("콜드메일");
    expect(salesConfig.josaVars).toEqual(["고객사명", "교육프로그램명"]);
    expect(salesConfig.rawHtmlKeys).toEqual(["관심사문구"]);
  });

  it("관심사 표현 셀렉트는 3개 옵션이며 값이 HTML(<b>)을 포함한다", () => {
    const select = salesConfig.fields.find((f) => f.type === "select");
    expect(select?.id).toBe("interestPhrase");
    expect(select?.options).toHaveLength(3);
    expect(select?.options?.[0].value).toContain("<b>일치</b>");
  });

  it("받는사람 이메일 필드가 email 타입으로 존재한다", () => {
    const email = salesConfig.fields.find((f) => f.id === "recipientEmail");
    expect(email?.type).toBe("email");
  });

  it("공장 기본 제목/본문이 프로토타입과 일치한다", () => {
    expect(salesConfig.factorySubject).toBe(
      "(광고)지만 {{교육프로그램명}} 홍보가 필요하시다면, 모집 부스팅 제안드립니다"
    );
    expect(salesConfig.factoryBody).toContain(
      "안녕하십니까 {{고객사명}} 담당자님,"
    );
    expect(salesConfig.factoryBody).toContain(
      "<b>{{회신마감일}}까지 회신</b>"
    );
  });
});

describe("salesConfig.computeValues — 값→플레이스홀더 매핑", () => {
  afterEach(() => vi.useRealTimers());

  it("모집마감일 short/full/weekday 파생값이 규칙대로 계산된다", () => {
    const v = salesConfig.computeValues({ deadline: "2026-07-20" });
    expect(v["모집마감일"]).toBe("7월20일");
    expect(v["모집마감일전체"]).toBe("2026년 7월 20일");
    expect(v["마감요일"]).toBe("월요일");
  });

  it("디데이는 오늘 기준 D-day 로 계산된다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T09:00:00"));
    const v = salesConfig.computeValues({ deadline: "2026-07-20" });
    expect(v["디데이"]).toBe("D-7");
  });

  it("회신마감일은 short(M월D일) 포맷이다", () => {
    const v = salesConfig.computeValues({ replyDeadline: "2026-07-01" });
    expect(v["회신마감일"]).toBe("7월1일");
  });

  it("관심사문구는 선택 옵션의 HTML 값을 그대로 담는다", () => {
    const v = salesConfig.computeValues({
      interestPhrase: SALES_DEFAULT_FIELD_VALUES.interestPhrase,
    });
    expect(v["관심사문구"]).toBe(
      "저희 플랫폼을 이용하는 유저들의 관심사와 <b>일치</b>하며"
    );
  });

  it("고객사명/교육프로그램명은 trim 후 그대로 통과된다", () => {
    const v = salesConfig.computeValues({
      clientName: "  연세 IT 미래교육원  ",
      programName: " 노코드 AI 서비스 개발자2기 ",
    });
    expect(v["고객사명"]).toBe("연세 IT 미래교육원");
    expect(v["교육프로그램명"]).toBe("노코드 AI 서비스 개발자2기");
  });

  it("빈 날짜는 빈 문자열로 파생된다", () => {
    const v = salesConfig.computeValues({});
    expect(v["모집마감일"]).toBe("");
    expect(v["디데이"]).toBe("");
    expect(v["회신마감일"]).toBe("");
  });
});

describe("salesConfig — 엔진 연동(치환 + 조사 + rawHtml)", () => {
  it("제목이 교육프로그램명으로 치환된다", () => {
    const values = salesConfig.computeValues({
      programName: "노코드 AI 서비스 개발자2기",
    });
    const out = substitute(
      salesConfig.factorySubject,
      values,
      identity,
      new Set(salesConfig.rawHtmlKeys)
    );
    expect(out).toBe(
      "(광고)지만 노코드 AI 서비스 개발자2기 홍보가 필요하시다면, 모집 부스팅 제안드립니다"
    );
  });

  it("본문에서 관심사문구는 <b> 태그를 그대로 살려 삽입된다", () => {
    const values = salesConfig.computeValues({
      clientName: "연세 IT 미래교육원",
      interestPhrase: SALES_DEFAULT_FIELD_VALUES.interestPhrase,
    });
    const out = substitute(
      salesConfig.factoryBody,
      values,
      escapeForHtml,
      new Set(salesConfig.rawHtmlKeys)
    );
    expect(out).toContain("안녕하십니까 연세 IT 미래교육원 담당자님,");
    expect(out).toContain(
      "귀사의 이번 교육 과정은 저희 플랫폼을 이용하는 유저들의 관심사와 <b>일치</b>하며,"
    );
  });

  it("제목(텍스트)에서는 관심사문구의 태그가 제거된다", () => {
    const values = { 관심사문구: "관심사와 <b>일치</b>하며" };
    const out = substitute(
      "테스트 {{관심사문구}}",
      values,
      identity,
      new Set(salesConfig.rawHtmlKeys)
    );
    expect(out).toBe("테스트 관심사와 일치하며");
  });
});

describe("sales 검증 — 받는사람 이메일 / 교육프로그램명", () => {
  it("올바른 이메일만 통과한다", () => {
    expect(isValidRecipientEmail("hr@company.com")).toBe(true);
    expect(isValidRecipientEmail("  hr@company.com ")).toBe(true);
    expect(isValidRecipientEmail("")).toBe(false);
    expect(isValidRecipientEmail("hr@company")).toBe(false);
    expect(isValidRecipientEmail("hrcompany.com")).toBe(false);
  });

  it("교육프로그램명에 이메일이 섞이면 걸러낸다", () => {
    expect(programNameHasEmail("마케팅 인턴")).toBe(false);
    expect(programNameHasEmail("")).toBe(false);
    expect(programNameHasEmail("문의 hr@company.com 로")).toBe(true);
  });

  it("canSave 는 이메일 유효 && 프로그램명에 이메일 없음일 때만 true", () => {
    expect(
      computeSalesCanSave({ recipientEmail: "hr@company.com", programName: "마케팅" })
    ).toBe(true);
    expect(
      computeSalesCanSave({ recipientEmail: "bad", programName: "마케팅" })
    ).toBe(false);
    expect(
      computeSalesCanSave({
        recipientEmail: "hr@company.com",
        programName: "x@y.com",
      })
    ).toBe(false);
  });
});

describe("sales 중복 발송/표기 가드", () => {
  it("countOccurrences 는 겹치지 않게 센다", () => {
    expect(countOccurrences("가나가나가", "가나")).toBe(2);
    expect(countOccurrences("abc", "")).toBe(0);
  });

  const noLast = {
    recipientEmail: null,
    clientName: null,
    programName: null,
  };

  it("직전과 받는사람 주소가 같으면 same-recipient 가드", () => {
    const guards = collectSalesSendGuards(
      {
        recipientEmail: "HR@company.com",
        clientName: "A사",
        programName: "프로그램",
        subject: "제목",
      },
      { ...noLast, recipientEmail: "hr@company.com" }
    );
    expect(guards.map((g) => g.code)).toContain("same-recipient");
  });

  it("직전과 고객사명+프로그램명이 같으면 same-client-program 가드", () => {
    const guards = collectSalesSendGuards(
      {
        recipientEmail: "hr@company.com",
        clientName: "A사",
        programName: "프로그램",
        subject: "제목",
      },
      { recipientEmail: "x@y.com", clientName: "A사", programName: "프로그램" }
    );
    expect(guards.map((g) => g.code)).toContain("same-client-program");
  });

  it("교육프로그램명에 고객사명이 포함되면 program-includes-client 가드", () => {
    const guards = collectSalesSendGuards(
      {
        recipientEmail: "hr@company.com",
        clientName: "렛츠커리어",
        programName: "렛츠커리어 마케팅 과정",
        subject: "제목",
      },
      noLast
    );
    expect(guards.map((g) => g.code)).toContain("program-includes-client");
  });

  it("생성된 제목에 고객사명이 2회 이상이면 subject-duplicate-client 가드", () => {
    const guards = collectSalesSendGuards(
      {
        recipientEmail: "hr@company.com",
        clientName: "A사",
        programName: "프로그램",
        subject: "A사 관련 A사 제안",
      },
      noLast
    );
    expect(guards.map((g) => g.code)).toContain("subject-duplicate-client");
  });

  it("직전 값이 없고 중복도 없으면 가드가 비어 있다", () => {
    const guards = collectSalesSendGuards(
      {
        recipientEmail: "hr@company.com",
        clientName: "A사",
        programName: "프로그램",
        subject: "제목",
      },
      noLast
    );
    expect(guards).toEqual([]);
  });
});
