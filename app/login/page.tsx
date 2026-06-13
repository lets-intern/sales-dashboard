"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "로그인에 실패했어요.");
        setLoading(false);
      }
    } catch {
      setErr("네트워크 오류가 발생했어요. 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="mark" />
          <b>렛츠커리어 세일즈 어드민</b>
        </div>
        <p className="login-sub">접속하려면 비밀번호를 입력하세요.</p>
        <input
          type="password"
          className="login-input"
          placeholder="비밀번호"
          value={pw}
          autoFocus
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <div className="login-err">{err}</div>}
        <button type="submit" className="login-btn" disabled={loading || !pw}>
          {loading ? "확인 중…" : "입장"}
        </button>
      </form>
    </div>
  );
}
