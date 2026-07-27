// Gmail 초안(drafts.create)용 MIME 빌더 (순수 함수, 단위 테스트 대상).
// 프로토타입(sales.js / intern.js / activity.js)의 buildMimeText / buildDraftRaw /
// encodeMimeHeaderUtf8 / base64url 로직을 1:1 이식하되, deprecated 한 unescape 대신
// TextEncoder 기반으로 UTF-8 바이트를 만들어 base64 로 인코딩한다.
//
// 지원 형태:
//  - 단순 text/html (첨부/이미지 없음)
//  - multipart/mixed (sales: 다중 파일 첨부)
//  - multipart/related + Content-ID cid (intern·activity: 성과 이미지 인라인)
//
// ⛔ 이 모듈은 초안 원문(raw)만 만든다. 발송(send)과 무관하다.

// ── 인코딩 헬퍼 ───────────────────────────────────────────────

// 바이트 배열 → latin1 바이너리 문자열. 큰 입력에서 인자 개수 제한에 걸리지 않도록
// 청크 단위로 String.fromCharCode 를 호출한다(프로토타입 blobToBase64 와 동일 전략).
function bytesToBinaryString(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return binary;
}

// 바이트 → base64 (표준).
export function base64FromBytes(bytes: Uint8Array): string {
  return btoa(bytesToBinaryString(bytes));
}

// UTF-8 문자열 → base64 (표준). 본문/헤더 인코딩에 쓴다.
export function base64Utf8(str: string): string {
  return base64FromBytes(new TextEncoder().encode(str));
}

// 표준 base64 → base64url (Gmail API가 요구하는 raw 인코딩).
export function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// RFC 2047: 헤더에 비-ASCII(한글 등)가 있으면 =?UTF-8?B?...?= 로 감싼다.
export function encodeMimeHeaderUtf8(text: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(text)) return text;
  return `=?UTF-8?B?${base64Utf8(text)}?=`;
}

// RFC 5987: 파일명이 순수 ASCII 면 그대로 따옴표로, 한글 등이 섞이면 filename*=UTF-8''...
export function encodeMimeFilenameParam(name: string): string {
  const asciiSafe = /^[\x20-\x7E]*$/.test(name);
  if (asciiSafe) return `filename="${name.replace(/"/g, "")}"`;
  return `filename*=UTF-8''${encodeURIComponent(name)}`;
}

// ── 본문 내 성과 이미지 placeholder → cid 인라인 이미지 치환 ──────
// 프로토타입 applyPerformanceImage(html, forMime=true) 이식. 초안 본문 전용(cid 참조).
export const PERFORMANCE_IMAGE_CID = "performanceImage";

export function applyInlineImageCid(
  html: string,
  placeholder: string,
  alt = "렛츠커리어 JOB 인스타그램 최근 2주 성과",
  contentId: string = PERFORMANCE_IMAGE_CID
): string {
  if (!placeholder || !html.includes(placeholder)) return html;
  const imgTag = `<img src="cid:${contentId}" alt="${alt}" style="max-width:100%;" />`;
  return html.split(placeholder).join(imgTag);
}

// ── MIME 원문 빌더 ───────────────────────────────────────────

// 첨부 파일 1개(내용은 이미 base64 로 인코딩됨).
export interface MimeAttachment {
  name: string;
  type: string; // 예: application/pdf
  base64: string;
}

// 인라인 이미지(성과 이미지). base64 는 순수 페이로드(data URL prefix 제외).
export interface MimeInlineImage {
  base64: string;
  type?: string; // 기본 image/png
  filename?: string; // 기본 performance.png
  contentId?: string; // 기본 performanceImage
}

export interface BuildMimeParams {
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: MimeAttachment[];
  inlineImage?: MimeInlineImage | null;
  // 테스트 결정성을 위해 boundary 를 주입할 수 있게 한다(미지정 시 시간 기반 생성).
  boundary?: string;
}

function makeBoundary(): string {
  return `mailtool_${Date.now().toString(36)}`;
}

// RFC 2822 메일 원문 텍스트 생성.
export function buildMimeText(params: BuildMimeParams): string {
  const { to, subject, htmlBody } = params;
  const attachments = params.attachments ?? [];
  const inlineImage = params.inlineImage ?? null;

  let mime = "";
  mime += `To: ${to}\r\n`;
  mime += `Subject: ${encodeMimeHeaderUtf8(subject)}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;

  if (attachments.length > 0) {
    // sales: 다중 파일 → multipart/mixed
    const boundary = params.boundary ?? makeBoundary();
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += `${base64Utf8(htmlBody)}\r\n\r\n`;
    for (const att of attachments) {
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: ${att.type}\r\n`;
      mime += `Content-Transfer-Encoding: base64\r\n`;
      mime += `Content-Disposition: attachment; ${encodeMimeFilenameParam(att.name)}\r\n\r\n`;
      mime += `${att.base64}\r\n\r\n`;
    }
    mime += `--${boundary}--`;
  } else if (inlineImage) {
    // intern·activity: 성과 이미지 인라인 → multipart/related + Content-ID
    const boundary = params.boundary ?? makeBoundary();
    const cid = inlineImage.contentId ?? PERFORMANCE_IMAGE_CID;
    const type = inlineImage.type ?? "image/png";
    const filename = inlineImage.filename ?? "performance.png";
    mime += `Content-Type: multipart/related; boundary="${boundary}"\r\n\r\n`;
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += `${base64Utf8(htmlBody)}\r\n\r\n`;
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: ${type}\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n`;
    mime += `Content-ID: <${cid}>\r\n`;
    mime += `Content-Disposition: inline; filename="${filename}"\r\n\r\n`;
    mime += `${inlineImage.base64}\r\n\r\n`;
    mime += `--${boundary}--`;
  } else {
    // 단순 본문
    mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += base64Utf8(htmlBody);
  }

  return mime;
}

// Gmail API의 message.raw 값(base64url).
export function buildDraftRaw(params: BuildMimeParams): string {
  return toBase64Url(base64Utf8(buildMimeText(params)));
}
