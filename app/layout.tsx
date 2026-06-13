import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "렛츠커리어 세일즈 어드민",
  description: "렛츠커리어 세일즈 어드민 대시보드",
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
