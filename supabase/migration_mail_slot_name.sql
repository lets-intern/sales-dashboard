-- 세일즈 메일 템플릿 생성기 · 슬롯 이름 + 가변 슬롯 지원
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (몇 번을 재실행해도 OK)
--
-- 변경 내용
-- 1) mail_slots.name  — 템플릿 이름(사용자 변경 가능). 비어 있으면 UI 가 "템플릿 N" 으로 표시한다.
-- 2) 슬롯 번호는 1~5 고정에서 가변으로 바뀐다. slot 은 이미 int 라 스키마 변경은 없고,
--    "행이 존재하면 그 템플릿이 존재한다" 는 규칙으로 목록을 판단한다.
--    빈 템플릿도 행이 있어야 이름을 붙일 수 있으므로 생성은 명시적 insert 로 처리한다.

alter table public.mail_slots
  add column if not exists name text not null default '';

-- 슬롯 번호는 1 이상만 허용한다(음수/0 방지).
alter table public.mail_slots
  drop constraint if exists mail_slots_slot_positive;
alter table public.mail_slots
  add constraint mail_slots_slot_positive check (slot >= 1);
