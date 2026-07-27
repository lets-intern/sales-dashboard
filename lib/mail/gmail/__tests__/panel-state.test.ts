import { describe, it, expect } from "vitest";
import { computeCanSaveDraft, resolveRecipient } from "../panel-state";

describe("computeCanSaveDraft — 저장 버튼 게이트", () => {
  it("미로그인이면 무조건 저장 불가", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: false,
        validated: true,
        recipient: "",
        fieldValues: { recipientEmail: "hr@company.com" },
      })
    ).toBe(false);
  });

  it("sales(validated): 유효 이메일 + 프로그램명에 이메일 없음 → 저장 가능", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: true,
        validated: true,
        recipient: "",
        fieldValues: { recipientEmail: "hr@company.com", programName: "노코드 2기" },
      })
    ).toBe(true);
  });

  it("sales(validated): 이메일 형식 오류 → 저장 불가", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: true,
        validated: true,
        recipient: "",
        fieldValues: { recipientEmail: "hr-company.com" },
      })
    ).toBe(false);
  });

  it("sales(validated): 프로그램명에 이메일 섞임 → 저장 불가", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: true,
        validated: true,
        recipient: "",
        fieldValues: {
          recipientEmail: "hr@company.com",
          programName: "문의 x@y.com",
        },
      })
    ).toBe(false);
  });

  it("intern·activity(비검증): 패널 수신자가 유효 이메일이면 저장 가능", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: true,
        validated: false,
        recipient: "recruit@corp.com",
        fieldValues: {},
      })
    ).toBe(true);
  });

  it("intern·activity(비검증): 수신자 비었거나 형식 오류면 저장 불가", () => {
    expect(
      computeCanSaveDraft({
        loggedIn: true,
        validated: false,
        recipient: "  ",
        fieldValues: {},
      })
    ).toBe(false);
  });
});

describe("resolveRecipient — 받는사람 출처", () => {
  it("sales 는 폼의 recipientEmail 을 사용한다", () => {
    expect(
      resolveRecipient({
        validated: true,
        recipient: "panel@x.com",
        fieldValues: { recipientEmail: "  form@x.com " },
      })
    ).toBe("form@x.com");
  });

  it("intern·activity 는 패널 입력을 사용한다", () => {
    expect(
      resolveRecipient({
        validated: false,
        recipient: "  panel@x.com ",
        fieldValues: { recipientEmail: "form@x.com" },
      })
    ).toBe("panel@x.com");
  });
});
