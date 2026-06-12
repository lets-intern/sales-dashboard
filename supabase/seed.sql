-- 미리보기와 동일한 예시 데이터. schema.sql 실행 후 한 번만 실행하세요.
do $$
declare
  c_mega uuid; c_code uuid; c_maion uuid; c_nobr uuid;
  c_lev uuid; c_leaf uuid; c_ulsan uuid; c_kgu uuid;
  d1 uuid; d2 uuid; d3 uuid; d4 uuid; d10 uuid;
begin
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('메가존클라우드','김윤정','kimyj39@megazone.com','') returning id into c_mega;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('코드부트캠프(딩코)','안도현 총괄이사','support@codebootcamp.com','') returning id into c_code;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('마이온컴퍼니','이지완 매니저','jw.lee@myown.kr','') returning id into c_maion;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('노브레이크','박조은','','070-4108-8881') returning id into c_nobr;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('레브잇','구자민','jamin.koo@ilevit.com','') returning id into c_lev;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('리프마케팅','김소연 대표','','') returning id into c_leaf;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('울산대학교','박다영 컨설턴트','','') returning id into c_ulsan;
  insert into public.clients (name, contact_person, contact_email, contact_phone)
  values ('경기대학교','','','') returning id into c_kgu;

  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter,period_start,period_end,comm_notes)
  values (c_maion,'광고 대행','B2B','[마이온컴퍼니] 인턴10:패션 브랜드 마케팅 실무과정 광고','사업 진행 중',1260000,'황준호',false,'2026-2Q','2026-06-14','2026-06-17',
    E'6/3 이지완 매니저 킥오프 콜.\n- 6/16 카카오 채널 DM + 쥬디 톡방 동시 송출 합의\n- 소재는 6/13까지 회신 예정') returning id into d1;
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter,period_start,period_end)
  values (c_code,'광고 대행','B2B','[코드캠프(딩코)] 클로드코드 부트캠프 교육 2건 광고','사업 진행 중',3145000,'황준호',true,'2026-2Q','2026-06-15','2026-06-25') returning id into d2;
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter,period_start,period_end,comm_notes)
  values (c_mega,'광고 대행','B2B','[메가존클라우드] 부산시 하이브리드 교육 2건 광고','사업 진행 중',3060000,'황준호',true,'2026-2Q','2026-06-11','2026-06-15',
    '클보/클엔 두 계정 동시 진행. 인스타 피드+스토리 6/12 송출.') returning id into d3;
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter,period_start,period_end)
  values (c_nobr,'광고 대행','B2B','[노브레이크] AI활용 핀테크 서비스 기획자 (중랑2기) 광고','사업 진행 중',900000,'황준호',true,'2026-2Q','2026-06-11','2026-06-19') returning id into d4;
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter)
  values (c_leaf,'광고 대행','B2B','[리프마케팅] 잇다채 7기 (용산)','완료',600000,'송다예',true,'2026-2Q');
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter,period_start,period_end)
  values (c_kgu,'취업 교육','B2U','[경기대학교] 취업 교육 현직자 특강','완료',1818182,'임호정',false,'2026-2Q','2026-05-14','2026-05-14');
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter)
  values (c_lev,'광고 대행','B2B','[레브잇] 채용공고 광고','완료',270000,'송다예',true,'2026-2Q');
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter)
  values (c_ulsan,'취업 교육','B2U','[울산대학교] AI 활용 취업 준비 특강 4회차','Drop',0,'송다예',false,'2026-2Q');
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter)
  values (null,'광고 대행','B2B','[에이블런] 챗GPT 교육 광고 및 RS','시작 전',0,'송다예',false,'2026-2Q');
  insert into public.deals (client_id,type,segment,name,status,amount,owner,paid,quarter)
  values (c_mega,'광고 대행','B2B','[메가존] 통합 캠페인','논의 진행 중',0,'황준호',false,'2026-2Q') returning id into d10;

  insert into public.items (deal_id,channel,date,status,owner) values
    (d3,'인스타 @official 피드','2026-06-12','시작 전','황준호'),
    (d3,'인스타 @official 스토리','2026-06-12','시작 전','황준호'),
    (d10,'오픈채팅방 #쥬디QNA','2026-06-13','시작 전','황준호'),
    (d4,'오픈채팅방 #쥬디QNA','2026-06-11','완료','황준호'),
    (d4,'오픈채팅방 #오공고','2026-06-15','시작 전','황준호'),
    (d4,'MMS 광고','2026-06-12','시작 전','황준호'),
    (d4,'카카오 채널 DM','2026-06-16','시작 전','황준호'),
    (d1,'카카오 채널 DM','2026-06-16','시작 전','황준호'),
    (d1,'오픈채팅방 #쥬디QNA','2026-06-16','시작 전','황준호'),
    (d2,'인스타 @official 피드','2026-06-15','시작 전','황준호'),
    (d2,'웹사이트 상단 배너','2026-06-15','시작 전','황준호');
end $$;
