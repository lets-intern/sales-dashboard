-- 세일즈 메일 템플릿 생성기 · 임시보관함 저장 로그
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (몇 번을 재실행해도 OK)
--
-- Gmail 초안(drafts.create)이 성공할 때마다 한 줄 남긴다.
-- "어느 고객사에 / 어떤 생성기의 / 어떤 템플릿으로 보냈는지"를 나중에 조회하기 위한 기록이며,
-- 발송 기록이 아니라 임시보관함 저장 기록이다(이 앱은 메일을 보내지 않는다).

create table if not exists public.mail_draft_logs (
  id           bigint generated always as identity primary key,
  -- 어떤 생성기로 만들었는지 (sales/intern/activity 또는 이후 추가되는 key)
  generator    text not null,
  generator_label text not null default '',
  -- 어떤 템플릿(슬롯)으로 만들었는지. 슬롯이 지워져도 기록은 남아야 하므로 FK 를 걸지 않고
  -- 그 시점의 이름을 함께 박아 둔다.
  slot         int,
  slot_name    text not null default '',
  -- 상대 이름(고객사명 / 회사명 / 기관명). 목록에서 가장 많이 찾는 값이라 컬럼으로 뺀다.
  counterparty text not null default '',
  -- 받는사람 주소와 완성된 제목
  recipient    text not null default '',
  subject      text not null default '',
  -- 그때 입력했던 폼 값 전체(상세 확인용)
  field_values jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- 목록은 항상 최신순 + 상대 이름/생성기로 좁혀 본다.
create index if not exists mail_draft_logs_created_idx
  on public.mail_draft_logs (created_at desc);
create index if not exists mail_draft_logs_generator_idx
  on public.mail_draft_logs (generator, created_at desc);
create index if not exists mail_draft_logs_counterparty_idx
  on public.mail_draft_logs (counterparty);

-- 내부 도구라 anon 키로 접근한다(다른 mail_* 테이블과 동일한 정책 톤).
-- 기록은 지우지 않는다 — delete 정책을 두지 않아 삭제를 막는다.
alter table public.mail_draft_logs enable row level security;

drop policy if exists "anon read mail_draft_logs"   on public.mail_draft_logs;
drop policy if exists "anon insert mail_draft_logs" on public.mail_draft_logs;

create policy "anon read mail_draft_logs"
  on public.mail_draft_logs for select using (true);
create policy "anon insert mail_draft_logs"
  on public.mail_draft_logs for insert with check (true);
