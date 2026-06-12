# 세일즈 운영 대시보드 · 렛츠커리어

Next.js (App Router) + Supabase 로 만든 세일즈 운영 대시보드입니다.
세일즈(딜) · 광고 항목 · 고객사 · 주간 캘린더를 한 화면에서 관리하고, 모든 인라인 편집이 Supabase 에 바로 저장됩니다.

## 기능

- **세일즈 대시보드** — 분기/유형/구분/상태/금액/기간/담당자 인라인 편집, 필터, 진행·완료 합계
- **항목 관리** — 채널/게시일/상태, 세일즈 연결 (이름 자동 생성)
- **고객사** — 담당자·연락처·메모 관리
- **캘린더** — 채널 × 요일 주간 보드 (항목에서 자동 생성)
- **상세 드로어** — 딜·고객사·연결 항목·커뮤니케이션 메모 편집

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 에 Supabase URL / anon key 입력

# 3. Supabase 테이블 생성
# Supabase 대시보드 → SQL Editor 에서
#   - supabase/schema.sql 실행 (테이블 + RLS)
#   - supabase/seed.sql 실행 (예시 데이터, 선택)

# 4. 개발 서버
npm run dev   # http://localhost:3000
```

## 기술 스택

- Next.js 15 (App Router) / React 19 / TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)

## 구조

```
app/                  레이아웃 · 페이지 · 글로벌 CSS
components/            SalesApp + 뷰(Deals/Items/Clients/Calendar) + Drawer + store
lib/                  타입 · 상수 · 유틸
utils/supabase/       브라우저 / 서버 / 미들웨어 클라이언트
supabase/             schema.sql · seed.sql
middleware.ts         세션 리프레시
```

> 참고: 현재는 로그인 없이 anon 키로 바로 접속하는 내부 도구 구성입니다.
> 외부 공개 시 Supabase Auth + 사용자별 RLS 정책으로 교체하세요.
