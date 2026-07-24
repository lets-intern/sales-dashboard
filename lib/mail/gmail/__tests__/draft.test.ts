import { describe, it, expect, vi } from "vitest";
import {
  createDraft,
  GMAIL_DRAFTS_ENDPOINT,
  GmailTokenExpiredError,
  GmailDraftError,
} from "../draft";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("createDraft — drafts.create 만 호출", () => {
  it("성공 시 /drafts 로 POST { message: { raw } } 를 보낸다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "d1" }));
    const res = await createDraft(
      "tok-123",
      { to: "hr@company.com", subject: "제목", bodyHtml: "<div>본문</div>" },
      fetchImpl as unknown as typeof fetch
    );
    expect(res.id).toBe("d1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(GMAIL_DRAFTS_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    const payload = JSON.parse(init.body);
    expect(payload).toHaveProperty("message.raw");
    expect(typeof payload.message.raw).toBe("string");
  });

  it("⛔ 발송 엔드포인트(messages.send / drafts.send)를 절대 호출하지 않는다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { id: "d1" }));
    await createDraft(
      "tok",
      {
        to: "a@b.com",
        subject: "s",
        bodyHtml: "<div>x</div>",
        attachments: [{ name: "f.pdf", type: "application/pdf", base64: "Zg==" }],
      },
      fetchImpl as unknown as typeof fetch
    );
    for (const [url] of fetchImpl.mock.calls) {
      expect(url).toBe(GMAIL_DRAFTS_ENDPOINT);
      expect(String(url)).toContain("/drafts");
      expect(String(url)).not.toContain("/send");
      expect(String(url)).not.toContain("messages/send");
      expect(String(url)).not.toContain("drafts/send");
    }
  });

  it("모듈에 send 함수가 존재하지 않는다", async () => {
    const mod = await import("../draft");
    const names = Object.keys(mod);
    expect(names.some((n) => /send/i.test(n))).toBe(false);
    // 엔드포인트 상수도 /drafts 로 끝난다.
    expect(GMAIL_DRAFTS_ENDPOINT.endsWith("/drafts")).toBe(true);
  });

  it("401 → GmailTokenExpiredError (재로그인 유도)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: "expired" }));
    await expect(
      createDraft(
        "tok",
        { to: "a@b.com", subject: "s", bodyHtml: "<div>x</div>" },
        fetchImpl as unknown as typeof fetch
      )
    ).rejects.toBeInstanceOf(GmailTokenExpiredError);
  });

  it("기타 실패 → GmailDraftError(status 포함)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" }));
    try {
      await createDraft(
        "tok",
        { to: "a@b.com", subject: "s", bodyHtml: "<div>x</div>" },
        fetchImpl as unknown as typeof fetch
      );
      expect.unreachable("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(GmailDraftError);
      expect((e as GmailDraftError).status).toBe(500);
    }
  });
});
