-- 세일즈 메일 템플릿 생성기 · 생성기 정의 저장
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (몇 번을 재실행해도 OK)
--
-- 생성기(콜드메일/무료공고/대외활동 …)를 코드가 아니라 데이터로 관리한다.
-- definition 은 lib/mail/generators/definition.ts 의 zod 스키마를 만족하는 JSON 이다.
-- 앱이 저장 전에 검증하지만, 잘못된 JSON 이 들어와도 다른 생성기는 계속 동작해야 하므로
-- DB 에는 형태 제약을 걸지 않는다(로드 시 개별 검증).

create table if not exists public.mail_generators (
  key        text primary key,
  definition jsonb not null,
  -- 탭 표시 순서. 작을수록 왼쪽.
  sort_order int not null default 0,
  -- 끄면 탭에서 감춘다. 지우지 않고 감추는 쪽을 기본으로 둔다 —
  -- 슬롯·기본값·저장 기록이 key 로 묶여 있어 삭제하면 되돌리기 어렵다.
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists mail_generators_order_idx
  on public.mail_generators (enabled, sort_order);

alter table public.mail_generators enable row level security;

drop policy if exists "anon read mail_generators"   on public.mail_generators;
drop policy if exists "anon write mail_generators"  on public.mail_generators;
drop policy if exists "anon update mail_generators" on public.mail_generators;

create policy "anon read mail_generators"
  on public.mail_generators for select using (true);
create policy "anon write mail_generators"
  on public.mail_generators for insert with check (true);
create policy "anon update mail_generators"
  on public.mail_generators for update using (true) with check (true);
