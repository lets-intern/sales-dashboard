"use client";

import { useState } from "react";
import { fmtWon, parseWon } from "@/lib/utils";

export default function AmountInput({
  value,
  onChange,
  className,
  placeholder = "₩0",
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const display = focused ? text : value ? fmtWon(value) : "";
  return (
    <input
      className={className}
      placeholder={placeholder}
      inputMode="numeric"
      value={display}
      onFocus={() => {
        setFocused(true);
        setText(value ? String(value) : "");
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseWon(e.target.value));
      }}
    />
  );
}
