"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Page() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [checking, setChecking] = useState(true); // ✅ 로그인 체크 중
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [mapUrl, setMapUrl] = useState("");

  // ✅ 진입 시 로그인 확인 (발표용: 조용히 리다이렉트)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        if (!data.session) {
          window.location.href = "/auth?mode=login";
          return;
        }
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    if (loading) return;

    setMsg(null);

    const n = name.trim();
    const a = address.trim();
    const c = category.trim();
    const d = description.trim();

    if (!n || !a) {
      setMsg("이름, 주소는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      // ✅ 저장 시점에도 세션 재확인 (중요)
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;

      if (!uid) {
        setMsg("로그인이 만료되었습니다. 다시 로그인해주세요.");
        window.location.href = "/auth?mode=login";
        return;
      }

      const { error } = await supabase.from("restaurants").insert({
        name: n,
        address: a,
        category: c || null,
        description: d || null,
        created_by: uid, // ✅ 핵심: 내가 쓴 맛집 표시/삭제권한용
         map_url: mapUrl
      });

      if (error) {
        // (옵션) 중복 방지 정책/unique가 걸려있을 때 메시지 예쁘게
        const m = error.message?.toLowerCase() ?? "";
        if (m.includes("duplicate") || m.includes("unique")) {
          setMsg("이미 등록된 맛집입니다. (중복)");
          return;
        }
        throw error;
      }

      // ✅ 발표용: 안내 후 이동
      setMsg("등록 완료! 홈으로 이동합니다…");
      setTimeout(() => router.push("/"), 350);
    } catch (e: any) {
      console.error("RESTAURANT INSERT ERROR:", e);
      setMsg(e?.message ?? "등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="text-sm text-gray-500">로그인 확인 중...</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">맛집 추가</h1>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            placeholder="맛집 이름 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
          />

          <input
            placeholder="주소 * (지도에 표시될 주소)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
          />

          <input
placeholder="Google 지도 링크 붙여넣기"
value={mapUrl}
onChange={e=>setMapUrl(e.target.value)}
className="w-full border rounded-xl px-4 py-3"
/>

          <input
            placeholder="카테고리 (예: 한식/치킨/돈카츠)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
          />

          <input
            placeholder="설명 (짧게 한 줄)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
          />

          <button
            type="button"
            onClick={save}
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {loading ? "등록 중..." : "등록"}
          </button>

          {msg ? (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-gray-700">
              {msg}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}