// /mail 이하 전체에 알림·확인 창 호스트를 하나 띄운다.
// 이게 있어야 훅·컴포넌트 어디서든 confirmDialog/alertDialog 를 부를 수 있다.

import { DialogHost } from "@/components/mail/dialog";

export default function MailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <DialogHost />
    </>
  );
}
