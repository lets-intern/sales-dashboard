import type { Metadata, Viewport } from "next";
import RoutineApp from "@/components/routine/RoutineApp";

// 브라우저에서 Supabase 클라이언트를 생성하므로 정적 프리렌더에서 제외.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "김은아 루틴",
  description: "매일의 루틴을 기록하는 개인 페이지",
  robots: { index: false, follow: false },
};

// 모바일(갤럭시 노트 등) 최적화 — 가로 꽉 차게, 입력 포커스 시 확대 방지
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f6f5f1",
};

export default function Page() {
  return <RoutineApp />;
}
