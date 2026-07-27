// AI 프롬프트가 실제 스키마와 어긋나지 않는지 확인한다.
//
// 프롬프트는 사람이 쓴 설명이라 스키마를 고칠 때 같이 안 고치기 쉽다. 어긋나면 AI 가
// 만든 JSON 이 검증에서 걸리고, 사용자는 왜 안 되는지 알 수 없다. 최소한 프롬프트에
// 실린 예시만큼은 통과해야 한다.

import { describe, it, expect } from "vitest";
import { GENERATOR_PROMPT, PROMPT_EXAMPLE } from "../prompt";
import { parseGeneratorDefinition, DATE_FORMATS } from "../definition";
import { compileGenerator } from "../compile";

describe("AI 프롬프트", () => {
  it("예시가 스키마를 통과한다", () => {
    const result = parseGeneratorDefinition(PROMPT_EXAMPLE);
    if (!result.ok) console.log(result.errors);
    expect(result.ok).toBe(true);
  });

  it("예시 본문이 쓰는 플레이스홀더를 예시 필드가 전부 만든다", () => {
    // 프롬프트가 "본문에 쓴 {{이름}}은 반드시 필드가 있어야 한다"고 요구하므로
    // 예시부터 그 규칙을 지켜야 한다.
    const result = parseGeneratorDefinition(PROMPT_EXAMPLE);
    if (!result.ok) throw new Error("예시가 스키마를 통과하지 못했습니다");
    const config = compileGenerator(result.definition);
    const produced = new Set(Object.keys(config.computeValues({})));

    const used = new Set<string>();
    for (const source of [config.factorySubject, config.factoryBody]) {
      for (const m of source.matchAll(/\{\{\s*([^{}[\]]+?)\s*\}\}/g)) {
        used.add(m[1]);
      }
    }

    const missing = [...used].filter((name) => !produced.has(name));
    expect(missing).toEqual([]);
  });

  it("예시가 조사 문법을 대괄호로 쓴다", () => {
    // 가장 틀리기 쉬운 부분이라 예시에 반드시 들어 있어야 한다.
    expect(PROMPT_EXAMPLE.baseBody).toContain("[은/는]");
  });

  it("프롬프트가 지원하는 날짜 형식을 빠짐없이 적는다", () => {
    for (const format of DATE_FORMATS) {
      expect(GENERATOR_PROMPT).toContain(`"${format}"`);
    }
  });

  it("프롬프트가 모든 필드 타입을 적는다", () => {
    for (const type of ["text", "email", "select", "date", "period"]) {
      expect(GENERATOR_PROMPT).toContain(`"${type}"`);
    }
  });

  it("프롬프트에 예시 JSON 이 실제로 박혀 있다", () => {
    // 예시 상수만 고치고 프롬프트가 옛 내용을 들고 있으면 안 된다.
    expect(GENERATOR_PROMPT).toContain('"key": "partner-intro"');
    expect(GENERATOR_PROMPT).toContain('"counterparty": true');
  });

  it("코드블록으로 출력하라고 요구한다", () => {
    // 일반 대화 텍스트로 주면 따옴표가 곡선 따옴표로 바뀌고 줄맞춤이 어긋나
    // 복사해 붙여넣을 수 없다. 실제로 겪은 문제라 프롬프트에서 반드시 막아야 한다.
    expect(GENERATOR_PROMPT).toContain("```json 코드블록");
    expect(GENERATOR_PROMPT).toContain("곡선 따옴표");
  });

  it("새 생성기에 validated:true 를 쓰지 말라고 경고한다", () => {
    // panel-state.ts 가 sales 필드 id 에 하드코딩되어 있어 새 생성기에서는 동작하지 않는다.
    expect(GENERATOR_PROMPT).toContain("validated:true 는 기존 콜드메일 생성기 전용");
  });
});
