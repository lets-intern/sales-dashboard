// 생성기 config 타입. 3종(콜드메일/무료공고/대외활동)의 차이를 이 객체로 뽑고,
// 엔진(치환/조사/포맷/sanitize/복사)과 UI(슬롯/폼/결과)는 공용으로 둔다.
// 생성기 추가 = GeneratorConfig 하나 추가.

import type { GeneratorKey } from "../types";

// 폼 필드 타입. select 는 options 필수.
export type FieldType = "text" | "date" | "select" | "email";

export interface FieldOption {
  // 저장/치환에 쓰이는 값(예: 선정이유 문장)
  value: string;
  // 화면 표시 라벨(예: "마케팅") — computeValues 에서 파생 플레이스홀더로 쓸 수 있다.
  label: string;
}

export interface FieldDef {
  // state 키 + 폼 input id
  id: string;
  // 폼 라벨
  label: string;
  type: FieldType;
  placeholder?: string;
  // select 전용 옵션 목록
  options?: FieldOption[];
  // 좁은 입력칸(날짜/짧은 텍스트)을 compact 로 표시
  compact?: boolean;
}

export interface GeneratorConfig {
  key: GeneratorKey;
  // 서브탭 라벨
  label: string;
  // 저장 네임스페이스(프로토타입 호환용 식별자)
  storagePrefix: string;
  // 공장 기본 제목(불변)
  factorySubject: string;
  // 공장 기본 본문 HTML(불변, 프로토타입에서 verbatim 이식)
  factoryBody: string;
  // 조사 자동 처리 대상 변수명
  josaVars: string[];
  // 본문에서 HTML 그대로 삽입할 키(sales: 관심사문구). intern 은 없음.
  rawHtmlKeys: string[];
  // 폼 필드 정의
  fields: FieldDef[];
  // 폼 값(state, 필드 id 기준) → 플레이스홀더(한글 키) 파생값 계산.
  computeValues: (state: Record<string, string>) => Record<string, string>;
  // 수신자 입력 위치/검증 여부
  recipient: { placement: "panel" | "gmail"; validated: boolean };
  // 첨부 종류 + 본문 내 이미지 placeholder 문구
  attachment: { kind: "files" | "image" | null; placeholderText?: string };
}
