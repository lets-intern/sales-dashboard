// Gmail 초안 생성 — drafts.create 만 호출한다.
//
// ⛔ 하드 제약: 이 모듈에는 발송 관련 코드가 없다.
//    messages.send / drafts.send / 그 밖의 send 엔드포인트를 절대 호출하지 않는다.
//    사용자가 Gmail 임시보관함에서 직접 검수 후 발송한다.
//
// POST https://www.googleapis.com/gmail/v1/users/me/drafts  { message: { raw } }

import {
  buildDraftRaw,
  type MimeAttachment,
  type MimeInlineImage,
} from "./mime";

// 초안 생성 엔드포인트(유일한 Gmail write 엔드포인트).
export const GMAIL_DRAFTS_ENDPOINT =
  "https://www.googleapis.com/gmail/v1/users/me/drafts";

export interface CreateDraftInput {
  to: string;
  subject: string;
  bodyHtml: string;
  // sales: 파일 첨부(multipart/mixed).
  attachments?: MimeAttachment[];
  // intern·activity: 성과 이미지 인라인(multipart/related + cid).
  inlineImage?: MimeInlineImage | null;
}

// Gmail drafts.create 응답(필요한 필드만).
export interface GmailDraftResponse {
  id?: string;
  message?: { id?: string; threadId?: string };
}

// 토큰 만료(401) — 재로그인 유도용.
export class GmailTokenExpiredError extends Error {
  constructor(message = "Google 로그인이 만료되었습니다. 다시 로그인해 주세요.") {
    super(message);
    this.name = "GmailTokenExpiredError";
  }
}

// 그 밖의 초안 생성 실패.
export class GmailDraftError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GmailDraftError";
    this.status = status;
  }
}

type FetchLike = typeof fetch;

// 초안을 임시보관함에 생성한다. fetchImpl 은 테스트에서 주입 가능.
export async function createDraft(
  token: string,
  input: CreateDraftInput,
  fetchImpl: FetchLike = fetch
): Promise<GmailDraftResponse> {
  const raw = buildDraftRaw({
    to: input.to,
    subject: input.subject,
    htmlBody: input.bodyHtml,
    attachments: input.attachments,
    inlineImage: input.inlineImage,
  });

  const res = await fetchImpl(GMAIL_DRAFTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw } }),
  });

  if (res.status === 401) {
    throw new GmailTokenExpiredError();
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new GmailDraftError(res.status, `${res.status} ${errBody}`.trim());
  }

  return (await res.json().catch(() => ({}))) as GmailDraftResponse;
}
