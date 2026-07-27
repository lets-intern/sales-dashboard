// Gmail 패널의 상태/버튼 노출 결정 로직(순수 함수, 단위 테스트 대상).
// React 컴포넌트(GmailPanel)에서 이 순수 함수를 호출해 "임시보관함에 저장" 버튼의
// 활성/비활성을 결정한다. sales(검증 대상)와 intern·activity(단순 수신자)를 나눈다.

import { computeSalesCanSave, isValidRecipientEmail } from "../configs/sales";

export interface DraftGateInput {
  // 로그인 + 토큰 유효 여부(deriveTokenState 결과에서).
  loggedIn: boolean;
  // config.recipient.validated — sales 만 true.
  validated: boolean;
  // intern·activity 패널 자체 수신자 입력값.
  recipient: string;
  // sales 폼 값(recipientEmail/programName 등) — 게이트 계산에 사용.
  fieldValues: Record<string, string>;
}

// "임시보관함에 저장" 버튼을 누를 수 있는가.
export function computeCanSaveDraft(input: DraftGateInput): boolean {
  if (!input.loggedIn) return false;
  if (input.validated) {
    // sales: 받는사람 이메일 형식 + 교육프로그램명에 이메일 없음.
    return computeSalesCanSave(input.fieldValues);
  }
  // intern·activity: 수신자 이메일이 유효 형식이어야 한다.
  return isValidRecipientEmail(input.recipient);
}

// sales 는 폼의 recipientEmail, 그 외는 패널 자체 입력에서 받는사람을 취한다.
export function resolveRecipient(input: {
  validated: boolean;
  recipient: string;
  fieldValues: Record<string, string>;
}): string {
  const raw = input.validated
    ? (input.fieldValues.recipientEmail ?? "")
    : input.recipient;
  return raw.trim();
}
