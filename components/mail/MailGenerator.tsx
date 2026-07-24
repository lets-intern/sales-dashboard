"use client";

// 제네릭 생성기 컨테이너. config 를 받아 컨트롤러를 구성하고
// 슬롯/제목/본문/폼/결과 UI 를 조립한다. (Gmail 초안 패널은 Push 5)

import "./mail.css";
import { useMailGenerator } from "./useMailGenerator";
import SlotBar from "./SlotBar";
import ValueForm from "./ValueForm";
import ResultPanel from "./ResultPanel";
import type { GeneratorConfig } from "@/lib/mail/configs/types";

interface MailGeneratorProps {
  config: GeneratorConfig;
  initialFieldValues?: Record<string, string>;
}

export default function MailGenerator({
  config,
  initialFieldValues,
}: MailGeneratorProps) {
  const ctrl = useMailGenerator(config, initialFieldValues);

  return (
    <div className="mg-root">
      <SlotBar ctrl={ctrl} />
      <ValueForm fields={config.fields} ctrl={ctrl} />
      <ResultPanel ctrl={ctrl} />
    </div>
  );
}
