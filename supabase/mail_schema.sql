-- 세일즈 메일 템플릿 생성기 스키마
-- 슬롯(제목/본문) · 기본값(override/backup) · 폼 값을 팀 공용 1벌로 저장한다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (몇 번을 재실행해도 OK)
--
-- generator: 'sales' | 'intern' | 'activity' (생성기 종류)

-- 생성기 × 슬롯(1~5)별 제목/본문(서식 포함). PK (generator, slot).
create table if not exists public.mail_slots (
  generator  text not null,
  slot       int  not null,
  subject    text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (generator, slot)
);

-- 기본값 시스템: 공장 기본값(코드 상수)과 별개로 사용자 override + 1단계 backup 저장.
-- kind: 'subject' | 'body'. PK (generator, kind).
create table if not exists public.mail_defaults (
  generator  text not null,
  kind       text not null,
  override   text,
  backup     text,
  updated_at timestamptz not null default now(),
  primary key (generator, kind)
);

-- 폼 값 1벌(슬롯 공용). values 는 { placeholder: value } jsonb. PK (generator).
create table if not exists public.mail_field_values (
  generator  text not null,
  values     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (generator)
);

-- RLS: 익명(anon) 키로 전체 접근 허용 (내부 도구용 · 딜/항목 테이블과 동일 패턴).
-- 앱 진입이 공용 비번 게이트이므로 팀 공용 1벌로 취급하며 유저별 분리는 하지 않는다.
alter table public.mail_slots        enable row level security;
alter table public.mail_defaults     enable row level security;
alter table public.mail_field_values enable row level security;

drop policy if exists "anon all mail_slots"        on public.mail_slots;
drop policy if exists "anon all mail_defaults"     on public.mail_defaults;
drop policy if exists "anon all mail_field_values" on public.mail_field_values;

create policy "anon all mail_slots"        on public.mail_slots        for all using (true) with check (true);
create policy "anon all mail_defaults"     on public.mail_defaults     for all using (true) with check (true);
create policy "anon all mail_field_values" on public.mail_field_values for all using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 검증 절차 (SQL Editor 또는 anon 키로 실행해 라운드트립 확인)
-- 아래 블록의 주석을 풀어 순서대로 실행한다.
-- ─────────────────────────────────────────────────────────────
-- 1) 테이블/정책 생성 확인
--   select table_name from information_schema.tables
--     where table_schema = 'public' and table_name like 'mail_%';
--   select tablename, policyname from pg_policies
--     where schemaname = 'public' and tablename like 'mail_%';
--
-- 2) UPSERT → SELECT 라운드트립 (슬롯)
--   insert into public.mail_slots (generator, slot, subject, body)
--     values ('sales', 1, 'T', '<p>hi</p>')
--     on conflict (generator, slot) do update
--       set subject = excluded.subject, body = excluded.body, updated_at = now();
--   select * from public.mail_slots where generator = 'sales' and slot = 1;
--
-- 3) 기본값 override/backup 라운드트립
--   insert into public.mail_defaults (generator, kind, override, backup)
--     values ('sales', 'subject', 'ov', 'bk')
--     on conflict (generator, kind) do update
--       set override = excluded.override, backup = excluded.backup, updated_at = now();
--   select * from public.mail_defaults where generator = 'sales';
--
-- 4) 폼 값(jsonb) 라운드트립
--   insert into public.mail_field_values (generator, values)
--     values ('sales', '{"회사명":"렛츠커리어"}'::jsonb)
--     on conflict (generator) do update
--       set values = excluded.values, updated_at = now();
--   select * from public.mail_field_values where generator = 'sales';
--
-- 5) 정리
--   delete from public.mail_slots        where generator = 'sales' and slot = 1;
--   delete from public.mail_defaults     where generator = 'sales';
--   delete from public.mail_field_values where generator = 'sales';
