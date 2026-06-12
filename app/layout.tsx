import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "세일즈 운영 · 렛츠커리어",
  description: "렛츠커리어 세일즈 운영 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
