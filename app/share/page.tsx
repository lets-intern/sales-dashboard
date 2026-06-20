import type { Metadata } from "next";
import DocImage from "@/components/DocImage";
import { SUPPLIER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "렛츠커리어 사업자 정보",
  description: "렛츠커리어(아이엔지) 사업자등록증 · 통장 사본",
  robots: { index: false, follow: false },
};

export default function SharePage() {
  return (
    <div className="share-screen">
      <div className="share-card">
        <header className="share-head">
          <div className="share-brand">
            <span className="mark" />
            <b>렛츠커리어</b>
          </div>
          <h1 className="share-title">사업자 정보 안내</h1>
          <p className="share-sub">
            거래 및 세금계산서 발행에 필요한 사업자등록증과 입금 계좌 정보입니다.
          </p>
        </header>

        <section className="share-info">
          <div className="share-info-row">
            <span className="k">상호</span>
            <span className="v">{SUPPLIER.company}</span>
          </div>
          <div className="share-info-row">
            <span className="k">대표자</span>
            <span className="v">{SUPPLIER.ceo}</span>
          </div>
          <div className="share-info-row">
            <span className="k">사업자등록번호</span>
            <span className="v">{SUPPLIER.reg_no}</span>
          </div>
          <div className="share-info-row">
            <span className="k">업태 / 종목</span>
            <span className="v">
              {SUPPLIER.biz_type} / {SUPPLIER.biz_item}
            </span>
          </div>
          <div className="share-info-row">
            <span className="k">담당 연락처</span>
            <span className="v">{SUPPLIER.contact}</span>
          </div>
        </section>

        <section className="share-docs">
          <DocImage
            src="/docs/business-license.png"
            alt="렛츠커리어 사업자등록증"
            caption="사업자등록증"
          />
          <DocImage
            src="/docs/bankbook.png"
            alt="렛츠커리어 통장 사본"
            caption="통장 사본 (입금 계좌)"
          />
        </section>

        <footer className="share-foot">
          본 페이지는 거래 고객사 안내용으로, 기재된 정보는 세금계산서 발행 및 대금
          입금 용도로만 사용해 주세요.
        </footer>
      </div>
    </div>
  );
}
