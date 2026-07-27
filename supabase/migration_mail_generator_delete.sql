-- 세일즈 메일 템플릿 생성기 · 생성기 삭제 허용
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (몇 번을 재실행해도 OK)
--
-- 처음에는 "지우지 말고 감추자"는 생각으로 delete 정책을 두지 않았다. 그런데 RLS 는
-- 권한이 없어도 에러를 내지 않고 0건 삭제로 조용히 끝난다(PostgREST 는 204 를 준다).
-- 그래서 "지운 것 같은데 남아 있는" 상태가 만들어진다. 삭제를 허용하되 앱에서
-- 되돌릴 수 없음을 분명히 알리고, 삭제 후 실제로 사라졌는지 확인하는 쪽으로 바꾼다.
--
-- mail_slots / mail_defaults / mail_field_values 는 mail_schema.sql 에서 이미
-- "for all" 정책이라 삭제가 가능하다. 여기서는 mail_generators 만 연다.
--
-- mail_draft_logs 는 계속 삭제할 수 없다. 어디에 무엇을 보냈는지의 기록이라
-- 생성기를 지워도 남아야 한다.

drop policy if exists "anon delete mail_generators" on public.mail_generators;

create policy "anon delete mail_generators"
  on public.mail_generators for delete using (true);
