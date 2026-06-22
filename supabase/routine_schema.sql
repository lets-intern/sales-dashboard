-- 김은아 루틴 기록 스키마
-- 세일즈·마케팅과 분리된 "별도 Supabase 프로젝트" 에 실행하세요.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행.

-- 하루에 한 행. 날짜(date)가 기본키 → 같은 날 다시 저장하면 덮어씁니다(upsert).
create table if not exists public.rtn_days (
  date date primary key,                       -- 기록 날짜 (YYYY-MM-DD)
  checks jsonb not null default '{}'::jsonb,    -- 체크리스트 토글 { "walk": true, ... }
  times  jsonb not null default '{}'::jsonb,    -- 시각 입력 { "wake": "07:30", "sleep": "23:10" }
  nums   jsonb not null default '{}'::jsonb,    -- 숫자 입력 { "bike_min": 30 }
  texts  jsonb not null default '{}'::jsonb,    -- 메뉴 등 자유 입력 { "brunch_menu": "샐러드" }
  todos  jsonb not null default '[]'::jsonb,    -- 오늘의 투두 [{ "id", "text", "done" }]
  mood   text not null default '',              -- 기분 선택 (great/good/ok/down/bad)
  body   text not null default '',              -- 몸 컨디션 (light/normal/heavy/sick)
  morning_note text not null default '',        -- 아침 글쓰기
  night_note   text not null default '',        -- 자기 전 짧은 일기
  created_at timestamptz not null default now()
);

-- 이미 만든 테이블에도 새 컬럼을 안전하게 추가 (이 파일은 몇 번을 재실행해도 OK).
alter table public.rtn_days add column if not exists body         text not null default '';
alter table public.rtn_days add column if not exists morning_note text not null default '';
alter table public.rtn_days add column if not exists night_note   text not null default '';
alter table public.rtn_days add column if not exists texts        jsonb not null default '{}'::jsonb;
alter table public.rtn_days add column if not exists todos        jsonb not null default '[]'::jsonb;

-- RLS: 익명(anon) 키로 전체 접근 허용 (한 사람용 개인 도구).
alter table public.rtn_days enable row level security;
drop policy if exists "anon all rtn_days" on public.rtn_days;
create policy "anon all rtn_days" on public.rtn_days for all using (true) with check (true);
