import { createBrowserClient } from "@supabase/ssr";

// 김은아 루틴 페이지는 세일즈·마케팅과 분리된 별도 Supabase 프로젝트를 사용합니다.
const url = process.env.NEXT_PUBLIC_RTN_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_RTN_SUPABASE_ANON_KEY;

// 환경변수(.env.local)에 RTN 프로젝트 값이 채워졌는지 여부
export const rtnConfigured = Boolean(url && key);

// 미설정 상태에서도 페이지가 흰 화면으로 죽지 않도록 null 반환
export const createRtnClient = () =>
  url && key ? createBrowserClient(url, key) : null;
