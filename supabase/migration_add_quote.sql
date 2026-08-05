-- 견적서 데이터 컬럼 추가
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. (여러 번 실행해도 안전합니다.)

-- deals: 견적서 데이터 (거래명세서와 동일 구조의 JSON)
alter table public.deals
  add column if not exists quote jsonb;
