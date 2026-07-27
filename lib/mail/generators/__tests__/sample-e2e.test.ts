// E2E 확인용 샘플 생성기 정의가 스키마를 통과하고 의도한 대로 치환되는지 본다.
// (사용자에게 건네는 JSON 이 실제로 동작하는지 넘기기 전에 확인하는 용도)

import { describe, it, expect } from "vitest";
import { parseGeneratorDefinition } from "../definition";
import { compileGenerator, initialFieldValues } from "../compile";
import { substitute, escapeForHtml, identity } from "../../engine/substitute";
import sample from "./sample-e2e.json";

describe("E2E 샘플 생성기", () => {
  const parsed = parseGeneratorDefinition(sample);

  it("스키마를 통과한다", () => {
    if (!parsed.ok) console.log(parsed.errors);
    expect(parsed.ok).toBe(true);
  });

  it("입력한 값이 제목·본문에 들어가고 조사가 받침에 맞게 붙는다", () => {
    if (!parsed.ok) throw new Error("정의가 올바르지 않습니다");
    const config = compileGenerator(parsed.definition);
    const state = {
      ...initialFieldValues(parsed.definition),
      companyName: "렛츠커리어", // 받침 없음 → 는/가/를
      managerName: "김은아",
      dueDate: "2026-08-14",
      statStart: "2026-06-22",
      statEnd: "2026-07-05",
      visitors: "1,240명",
    };
    const values = config.computeValues(state);
    const rawHtmlKeys = new Set(config.rawHtmlKeys);

    const subject = substitute(config.factorySubject, values, identity, rawHtmlKeys);
    const body = substitute(config.factoryBody, values, escapeForHtml, rawHtmlKeys);

    expect(subject).toContain("렛츠커리어");
    // 조사: "렛츠커리어" 는 받침이 없으므로 "는"
    expect(body).toContain("렛츠커리어는");
    // 날짜 형식 3종
    expect(body).toContain("8월14일");
    expect(body).toContain("2026년 8월 14일");
    // 기간 2종
    expect(body).toContain("2026년 6월 22일-7월 5일");
    expect(body).toContain("2026.06.22-07.05");
    // rawHtml 인 강조문구는 태그가 살아 있어야 한다
    expect(body).toContain("<b>");
  });

  it("받침 있는 이름에는 다른 조사가 붙는다", () => {
    if (!parsed.ok) throw new Error("정의가 올바르지 않습니다");
    const config = compileGenerator(parsed.definition);
    const values = config.computeValues({
      ...initialFieldValues(parsed.definition),
      companyName: "넥슨", // 받침 있음 → 은/이/을
    });
    const body = substitute(
      config.factoryBody,
      values,
      escapeForHtml,
      new Set(config.rawHtmlKeys)
    );
    expect(body).toContain("넥슨은");
  });
});
