import { describe, it, expect } from "vitest";
import { salesConfig } from "../sales";
import { internConfig } from "../intern";
import { activityConfig } from "../activity";
import { GENERATOR_KEYS } from "../../types";

// /mail 서브탭 3종이 config.key / storagePrefix 로 독립 네임스페이스를 갖는지 검증한다.
// (useMailGenerator 는 config.key 단위로 슬롯/기본값/폼값을 분리 저장하므로, 키가
//  서로 겹치지 않아야 탭 사이 데이터가 섞이지 않는다.)
describe("생성기 3종 — 네임스페이스 분리", () => {
  const configs = [salesConfig, internConfig, activityConfig];

  it("config.key 는 GeneratorKey 3종과 정확히 일치한다", () => {
    expect(configs.map((c) => c.key).sort()).toEqual([...GENERATOR_KEYS].sort());
  });

  it("key 가 서로 중복되지 않는다", () => {
    const keys = configs.map((c) => c.key);
    expect(new Set(keys).size).toBe(3);
  });

  it("storagePrefix 가 서로 중복되지 않는다(프로토타입 호환 식별자)", () => {
    const prefixes = configs.map((c) => c.storagePrefix);
    expect(new Set(prefixes).size).toBe(3);
    expect(salesConfig.storagePrefix).toBe("mailTemplateTool");
    expect(internConfig.storagePrefix).toBe("internMailTool");
    expect(activityConfig.storagePrefix).toBe("activityMailTool");
  });

  it("서브탭 라벨은 콜드메일/무료공고/대외활동이다", () => {
    expect(salesConfig.label).toBe("콜드메일");
    expect(internConfig.label).toBe("무료공고");
    expect(activityConfig.label).toBe("대외활동");
  });
});
