"use client";

import { useState } from "react";

// public/ 에 이미지가 있으면 표시, 없으면 안내 박스로 대체
export default function DocImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="doc-fig">
      <figcaption className="doc-cap">{caption}</figcaption>
      {failed ? (
        <div className="doc-missing">이미지 준비 중입니다.</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="doc-img"
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
        />
      )}
    </figure>
  );
}
