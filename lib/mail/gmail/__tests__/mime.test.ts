import { describe, it, expect } from "vitest";
import {
  base64Utf8,
  base64FromBytes,
  toBase64Url,
  encodeMimeHeaderUtf8,
  encodeMimeFilenameParam,
  applyInlineImageCid,
  buildMimeText,
  buildDraftRaw,
} from "../mime";

// UTF-8 문자열을 base64 → 다시 디코드해서 라운드트립을 확인하는 헬퍼.
function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function decodeBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return decodeBase64Utf8(b64 + pad);
}

describe("base64/base64url 인코딩", () => {
  it("한글 본문 base64 라운드트립", () => {
    const src = "안녕하세요 렛츠커리어 <b>테스트</b> 🚀";
    expect(decodeBase64Utf8(base64Utf8(src))).toBe(src);
  });

  it("base64FromBytes 는 바이트를 표준 base64 로 인코딩한다", () => {
    // "Hi" = 0x48 0x69 → "SGk="
    expect(base64FromBytes(new Uint8Array([0x48, 0x69]))).toBe("SGk=");
  });

  it("toBase64Url 은 +,/ 를 -,_ 로 바꾸고 패딩을 제거한다", () => {
    expect(toBase64Url("ab+/cd==")).toBe("ab-_cd");
  });
});

describe("encodeMimeHeaderUtf8 (RFC 2047)", () => {
  it("ASCII 제목은 그대로 둔다", () => {
    expect(encodeMimeHeaderUtf8("Hello World")).toBe("Hello World");
  });

  it("한글 제목은 =?UTF-8?B?...?= 로 감싸고 디코드하면 원문이다", () => {
    const subject = "[오늘의공고 1회 편성 안내] 렛츠커리어";
    const encoded = encodeMimeHeaderUtf8(subject);
    expect(encoded.startsWith("=?UTF-8?B?")).toBe(true);
    expect(encoded.endsWith("?=")).toBe(true);
    const b64 = encoded.slice("=?UTF-8?B?".length, -"?=".length);
    expect(decodeBase64Utf8(b64)).toBe(subject);
  });
});

describe("encodeMimeFilenameParam (RFC 5987)", () => {
  it("ASCII 파일명은 filename=\"...\" 로", () => {
    expect(encodeMimeFilenameParam("report.pdf")).toBe('filename="report.pdf"');
  });

  it("한글 파일명은 filename*=UTF-8'' 로 인코딩", () => {
    expect(encodeMimeFilenameParam("상품안내서.pdf")).toBe(
      `filename*=UTF-8''${encodeURIComponent("상품안내서.pdf")}`
    );
  });
});

describe("applyInlineImageCid — placeholder → cid img 치환", () => {
  const placeholder = "[렛츠커리어 JOB 인스타그램 최근 2주 성과 이미지 삽입]";

  it("placeholder 를 cid:performanceImage img 태그로 치환한다", () => {
    const html = `<div>위</div><div>${placeholder}</div><div>아래</div>`;
    const out = applyInlineImageCid(html, placeholder);
    expect(out).toContain('src="cid:performanceImage"');
    expect(out).not.toContain(placeholder);
  });

  it("placeholder 가 없으면 원문을 그대로 반환한다", () => {
    const html = "<div>본문</div>";
    expect(applyInlineImageCid(html, placeholder)).toBe(html);
  });
});

describe("buildMimeText — 단순 본문", () => {
  it("첨부/이미지 없으면 text/html 단일 파트", () => {
    const mime = buildMimeText({
      to: "hr@company.com",
      subject: "제목",
      htmlBody: "<div>본문</div>",
    });
    expect(mime).toContain("To: hr@company.com\r\n");
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(mime).not.toContain("multipart");
  });
});

describe("buildMimeText — multipart/mixed (sales 파일 첨부)", () => {
  it("boundary 와 각 첨부 파트, Content-Disposition 을 포함한다", () => {
    const mime = buildMimeText({
      to: "hr@company.com",
      subject: "제안",
      htmlBody: "<div>본문</div>",
      boundary: "BND",
      attachments: [
        { name: "상품안내서.pdf", type: "application/pdf", base64: "QUJD" },
        { name: "spec.xlsx", type: "application/vnd.ms-excel", base64: "REVG" },
      ],
    });
    expect(mime).toContain('Content-Type: multipart/mixed; boundary="BND"');
    expect(mime).toContain("--BND\r\n");
    expect(mime).toContain("Content-Disposition: attachment; filename*=UTF-8''");
    expect(mime).toContain('Content-Disposition: attachment; filename="spec.xlsx"');
    expect(mime).toContain("QUJD");
    expect(mime).toContain("REVG");
    expect(mime.trimEnd().endsWith("--BND--")).toBe(true);
  });
});

describe("buildMimeText — multipart/related (intern·activity 인라인 이미지)", () => {
  it("Content-ID cid 파트와 inline 이미지를 포함한다", () => {
    const mime = buildMimeText({
      to: "hr@company.com",
      subject: "편성 안내",
      htmlBody: '<div><img src="cid:performanceImage" /></div>',
      boundary: "REL",
      inlineImage: { base64: "SU1H" },
    });
    expect(mime).toContain('Content-Type: multipart/related; boundary="REL"');
    expect(mime).toContain("Content-ID: <performanceImage>");
    expect(mime).toContain("Content-Type: image/png");
    expect(mime).toContain('Content-Disposition: inline; filename="performance.png"');
    expect(mime).toContain("SU1H");
    expect(mime.trimEnd().endsWith("--REL--")).toBe(true);
  });

  it("첨부가 있으면 이미지보다 multipart/mixed 가 우선한다", () => {
    const mime = buildMimeText({
      to: "a@b.com",
      subject: "x",
      htmlBody: "<div>x</div>",
      boundary: "B",
      attachments: [{ name: "f.pdf", type: "application/pdf", base64: "Zg==" }],
      inlineImage: { base64: "SU1H" },
    });
    expect(mime).toContain("multipart/mixed");
    expect(mime).not.toContain("multipart/related");
  });
});

describe("buildDraftRaw — base64url 라운드트립", () => {
  it("raw 를 디코드하면 buildMimeText 원문과 같다", () => {
    const params = {
      to: "hr@company.com",
      subject: "한글 제목 테스트",
      htmlBody: "<div>안녕하세요 렛츠커리어</div>",
      boundary: "BND",
    };
    const raw = buildDraftRaw(params);
    expect(raw).not.toMatch(/[+/=]/); // base64url: +,/,= 없음
    expect(decodeBase64Url(raw)).toBe(buildMimeText(params));
  });
});
