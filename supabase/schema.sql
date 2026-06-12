-- 세일즈 운영 대시보드 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  contact_person text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  type text not null default '광고 대행',
  segment text not null default 'B2B',
  name text not null default '',
  status text not null default '시작 전',
  amount bigint not null default 0,
  owner text not null default '',
  paid boolean not null default false,
  quarter text not null default '',
  period_start date,
  period_end date,
  comm_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  channel text not null default '',
  date date,
  status text not null default '시작 전',
  created_at timestamptz not null default now()
);

-- RLS: 익명(anon) 키로 전체 접근 허용 (내부 도구용).
-- 외부 공개 시에는 Supabase Auth 기반 정책으로 교체하세요.
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.items enable row level security;

drop policy if exists "anon all clients" on public.clients;
drop policy if exists "anon all deals" on public.deals;
drop policy if exists "anon all items" on public.items;

create policy "anon all clients" on public.clients for all using (true) with check (true);
create policy "anon all deals" on public.deals for all using (true) with check (true);
create policy "anon all items" on public.items for all using (true) with check (true);
