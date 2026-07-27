// 생성기 정의 검증 — 손으로 쓰는 JSON 이라 실패 사유가 읽을 수 있어야 한다.

import { describe, it, expect } from "vitest";
import { parseGeneratorDefinition } from "../definition";
import { salesDefinition } from "../seed";

const valid = () => JSON.parse(JSON.stringify(salesDefinition));

describe("parseGeneratorDefinition", () => {
  it("올바른 정의를 통과시킨다", () => {
    const result = parseGeneratorDefinition(valid());
    expect(result.ok).toBe(true);
  });

  it("JSON 문자열도 받는다", () => {
    const result = parseGeneratorDefinition(JSON.stringify(valid()));
    expect(result.ok).toBe(true);
  });

  it("JSON 이 아니면 그 사실을 알린다", () => {
    const result = parseGeneratorDefinition("{ 이건 JSON 이 아님");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("JSON 형식이 아닙니다");
  });

  it("빈 객체는 없는 항목을 한국어로 짚어 준다", () => {
    // zod 기본 메시지("Invalid input")가 그대로 나오면 무엇을 고쳐야 할지 알 수 없다.
    const result = parseGeneratorDefinition({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const joined = result.errors.join("\n");
      expect(joined).not.toContain("Invalid input");
      expect(joined).toContain("key 가 없습니다");
      expect(joined).toContain("label 이 없습니다");
      expect(joined).toContain("baseSubject 가 없습니다");
      expect(joined).toContain("baseBody 가 없습니다");
      expect(joined).toContain("fields 가 없습니다");
    }
  });

  it("오류에 위치(경로)를 붙인다", () => {
    const def = valid();
    def.fields[1].name = "회사{{명}}";
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith("fields.1.name:"))).toBe(true);
    }
  });

  it("플레이스홀더 이름 중복을 막는다", () => {
    const def = valid();
    def.fields[1].name = def.fields[0].name;
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("중복");
  });

  it("부가 출력(also)이 기존 이름과 겹치는 것도 막는다", () => {
    const def = valid();
    // 모집마감일 필드의 also 에 이미 있는 이름을 넣는다.
    def.fields[2].also.full = "고객사명";
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("부가 출력");
  });

  it("상대 이름 필드는 1개까지만 허용한다", () => {
    const def = valid();
    def.fields[1].counterparty = true;
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("1개만");
  });

  it("드롭다운은 옵션이 없으면 막는다", () => {
    const def = valid();
    def.fields[4].options = [];
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("옵션이 1개 이상");
  });

  it("기본값이 있는 항목은 생략해도 통과한다", () => {
    const def = valid();
    delete def.recipient;
    delete def.attachment;
    for (const field of def.fields) delete field.output;
    const result = parseGeneratorDefinition(def);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.recipient.placement).toBe("gmail");
      expect(result.definition.attachment.kind).toBeNull();
      expect(result.definition.fields[0].output).toBe(true);
    }
  });
});
