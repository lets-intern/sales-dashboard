-- 세일즈 메일 템플릿 생성기 · 성과 이미지 Storage 버킷
-- intern/activity 생성기의 "성과 이미지 1장"을 저장하고 URL(또는 초안 MIME의 cid)로 참조한다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. (재실행해도 OK)
--
-- 버킷명: mail-assets (공개 버킷). 내부 도구용이라 anon 키로 업로드/조회를 허용한다.

-- 1) 버킷 생성 (public = true → 공개 URL로 바로 접근 가능)
insert into storage.buckets (id, name, public)
  values ('mail-assets', 'mail-assets', true)
  on conflict (id) do update set public = excluded.public;

-- 2) 접근 정책: mail-assets 버킷 한정, anon 전체 접근 (딜/항목 테이블과 동일 톤)
--    storage.objects 에 RLS 는 기본 활성화되어 있으므로 정책만 추가한다.
drop policy if exists "anon read mail-assets"   on storage.objects;
drop policy if exists "anon insert mail-assets" on storage.objects;
drop policy if exists "anon update mail-assets" on storage.objects;
drop policy if exists "anon delete mail-assets" on storage.objects;

create policy "anon read mail-assets" on storage.objects
  for select using (bucket_id = 'mail-assets');

create policy "anon insert mail-assets" on storage.objects
  for insert with check (bucket_id = 'mail-assets');

create policy "anon update mail-assets" on storage.objects
  for update using (bucket_id = 'mail-assets') with check (bucket_id = 'mail-assets');

create policy "anon delete mail-assets" on storage.objects
  for delete using (bucket_id = 'mail-assets');

-- ─────────────────────────────────────────────────────────────
-- 검증 절차 (업로드 → 공개 URL 획득 확인)
-- 코드에서: lib/mail/storage.ts 의 uploadPerformanceImage / getPerformanceImageUrl
-- SQL/대시보드에서:
--   1) 위 스크립트 실행 후 Storage → mail-assets 버킷 존재 확인
--      select id, name, public from storage.buckets where id = 'mail-assets';
--   2) 정책 확인
--      select policyname from pg_policies
--        where schemaname = 'storage' and tablename = 'objects'
--          and policyname like '%mail-assets%';
--   3) 대시보드 UI 또는 anon 키 클라이언트로 아무 이미지 업로드 후
--      공개 URL(https://<project>.supabase.co/storage/v1/object/public/mail-assets/<path>)
--      이 200으로 열리는지 확인.
