"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Badge from "@/components/Badge";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 로그인 상태 읽기
  async function refresh() {
    try {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    } catch {
      setEmail(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

  // 로그아웃
  async function logout() {
  try {
    // 2초 넘으면 타임아웃
    await withTimeout(supabase.auth.signOut(), 2000);
  } catch (e) {
    console.warn("signOut slow/failed, forcing cleanup:", e);
  } finally {
    // ✅ 락/토큰 꼬임 강제 정리
    try {
      localStorage.removeItem("sb-auth"); // storageKey를 sb-auth로 썼다면
      // 만약 기본 키를 쓰고 있으면 아래도 같이:
      // localStorage.removeItem("sb-cbtlwwputusypcdqbtrn-auth-token");
    } catch {}
    window.location.assign("/");
  }
}

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-white/70 backdrop-blur border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white border border-black/5 grid place-items-center shadow-sm">
              🍜
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Tokyo K-Food Map
              </div>
              <div className="text-xs text-gray-500">
                demo • reviews • maps
              </div>
            </div>
          </Link>

          {/* 오른쪽 메뉴 */}
          <nav className="flex items-center gap-2">

            <Link
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              href="/"
            >
              홈
            </Link>

            <Link
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              href="/restaurants/new"
            >
              맛집 추가
            </Link>

            <Link
              className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              href="/me"
            >
              내 리뷰
            </Link>

            {/* 로그인 / 로그아웃 버튼 */}
            {loading ? null : email ? (

              <button
                onClick={logout}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                로그아웃
              </button>

            ) : (

              <Link
                href="/auth"
                className="rounded-xl border border-black/10 bg-black px-3 py-2 text-sm text-white hover:bg-gray-900"
              >
                로그인
              </Link>

            )}

            {/* 이메일 Badge */}
            <Badge>
              {email ?? "Guest"}
            </Badge>

          </nav>
        </div>

        {/* 하단 라인 */}
        <div
          className="h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(168,85,247,.3), rgba(59,130,246,.3), rgba(16,185,129,.3))",
          }}
        />

      </div>
    </header>
  );
}