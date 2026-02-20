"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mode = "login" | "signup";

function normalizeAuthError(msg?: string) {
  if (!msg) return "오류가 발생했습니다.";
  if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (msg.includes("User already registered")) return "이미 가입된 이메일입니다. 로그인으로 진행하세요.";
  if (msg.includes("Email not confirmed")) return "이메일 인증이 필요합니다. 받은메일함을 확인하세요.";
  return msg;
}

async function waitForSession(timeoutMs = 2000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    // 짧게 양보
    await new Promise((r) => setTimeout(r, 120));
  }

  return null;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("123@email.com");
const [password, setPassword] = useState("123456");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const title = useMemo(() => (mode === "login" ? "로그인" : "회원가입"), [mode]);

  

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMsg(null);
    setLoading(true);

    try {
      const em = email.trim();
      if (!em || !password.trim()) {
        setMsg("이메일/비밀번호를 입력하세요.");
        return;
      }
      if (password.length < 6) {
        setMsg("비밀번호는 6자 이상이어야 합니다.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: em, password });
        if (error) throw error;

        setMsg("회원가입 완료. 이메일 인증이 필요할 수 있습니다. (인증 후 로그인)");
        setMode("login");
        return;
      }

      // 로그인
      setMsg("처리중... 세션 확인 중");
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) throw error;

      // 세션이 실제로 잡혔는지 확인 후 이동
      const session = await waitForSession(2200);

      if (!session) {
        // 세션 확인이 늦으면 안내하고 "수동 이동 버튼" 제공
        setMsg("로그인은 되었는데 세션 확인이 지연됩니다. 아래 버튼으로 이동하세요.");
        return;
      }

      setMsg("로그인 완료! 이동합니다...");
      // 발표용 안정: 하드 이동이 가장 확실
      window.location.assign("/");
    } catch (err: any) {
      console.error("AUTH ERROR:", err);
      setMsg(normalizeAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className="glass rounded-3xl p-7">
        <div className="text-xs text-gray-500">Demo • Auth</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">발표용 MVP: 로그인 후 리뷰 작성/수정/삭제 가능</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setMode("login");
            }}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              mode === "login"
                ? "border-black/10 bg-black text-white"
                : "border-black/5 bg-white/70 text-gray-700 hover:bg-white"
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMsg(null);
              setMode("signup");
            }}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
              mode === "signup"
                ? "border-black/10 bg-black text-white"
                : "border-black/5 bg-white/70 text-gray-700 hover:bg-white"
            }`}
          >
            회원가입
          </button>
        </div>
      </section>

      <section className="glass rounded-3xl p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <div className="text-sm font-medium text-gray-800">이메일</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/5"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-800">비밀번호</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자"
              type="password"
              className="mt-1 w-full rounded-2xl border border-black/5 bg-white/80 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/5"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          <button
  disabled={loading}
  className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
>
  {loading ? "로그인 중..." : mode === "login" ? "로그인" : "회원가입"}
</button>

          {msg ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-700">
              {msg}
              {msg.includes("아래 버튼") ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => window.location.assign("/")}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    홈으로 이동
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="text-xs text-gray-500">
            * 이메일 인증(Verification)이 켜져 있으면 회원가입 후 메일 인증이 필요합니다.
          </div>
        </form>
      </section>
    </div>
  );
}