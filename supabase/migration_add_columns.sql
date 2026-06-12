-- 기능 추가 마이그레이션
-- 이미 schema.sql 로 테이블을 만든 프로젝트에서, 새 컬럼만 추가합니다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. (여러 번 실행해도 안전합니다.)

-- deals: 계산서 발행 상태 (예정 / 완료 / 카드 결제)
alter table public.deals
  add column if not exists invoice_status text not null default '예정';

-- items: 담당자 + 상세 메모
alter table public.items
  add column if not exists owner text not null default '';
alter table public.items
  add column if not exists notes text not null default '';

-- deals: 거래명세서 데이터 (영수일/항목/금액/결제방법 등 JSON)
alter table public.deals
  add column if not exists statement jsonb;

-- clients: 사업자등록번호 + 세금계산서 발행 메일
alter table public.clients
  add column if not exists biz_reg_no text not null default '';
alter table public.clients
  add column if not exists tax_email text not null default '';
