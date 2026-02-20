"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Restaurant, Review } from "@/lib/types";
import RestaurantCard from "@/components/RestaurantCard";
import Badge from "@/components/Badge";

function getRegion(address: string) {
  // "Tokyo, Asakusa" → "Asakusa"
  const parts = address.split(",").map((s) => s.trim());
  return parts.length >= 2 ? parts[1] : address;
}

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState<string | null>(null);

useEffect(() => {
  let alive = true;

  (async () => {
    setLoading(true);
    setErr(null);
    try {
      const r1 = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const r2 = await supabase.from("reviews").select("*");

      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;

      if (!alive) return;
      setRestaurants((r1.data as Restaurant[]) ?? []);
      setReviews((r2.data as Review[]) ?? []);
    } catch (e: any) {
      console.error("HOME LOAD ERROR:", e);
      if (!alive) return;
      setErr(e?.message ?? String(e));
      setRestaurants([]);
      setReviews([]);
    } finally {
      if (!alive) return;
      setLoading(false);
    }
  })();

  return () => {
    alive = false;
  };
}, []);

  const regions = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => set.add(getRegion(r.address)));
    return ["ALL", ...Array.from(set).sort()];
  }, [restaurants]);

  const stats = useMemo(() => {
    // restaurant_id -> {sum, count}
    const m = new Map<number, { sum: number; count: number }>();
    for (const rv of reviews) {
      const cur = m.get(rv.restaurant_id) ?? { sum: 0, count: 0 };
      cur.sum += rv.rating;
      cur.count += 1;
      m.set(rv.restaurant_id, cur);
    }
    return m;
  }, [reviews]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return restaurants
      .map((r) => ({ ...r, _region: getRegion(r.address) }))
      .filter((r) => (region === "ALL" ? true : r._region === region))
      .filter((r) => {
        if (!qq) return true;
        return (
          r.name.toLowerCase().includes(qq) ||
          (r.description ?? "").toLowerCase().includes(qq) ||
          r.address.toLowerCase().includes(qq)
        );
      });
  }, [restaurants, q, region]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-gray-500">Demo • 발표용</div>
            <h1 className="mt-1 text-2xl font-semibold">도쿄 K-Food 맛집 리스트</h1>
            <p className="mt-2 text-sm text-gray-600">
              카드 → 상세 → 지도 확인 → 로그인 후 리뷰 작성/수정/삭제까지 한 흐름으로 데모
            </p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-xl border bg-gray-50 px-4 py-3 text-sm">
              <div className="text-gray-500">등록 맛집</div>
              <div className="font-semibold">{restaurants.length}</div>
            </div>
            <div className="rounded-xl border bg-gray-50 px-4 py-3 text-sm">
              <div className="text-gray-500">전체 리뷰</div>
              <div className="font-semibold">{reviews.length}</div>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색: 맛집명, 설명, 주소"
            className="w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-xl border bg-white px-4 py-3 text-sm"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r === "ALL" ? "전체 지역" : r}
              </option>
            ))}
          </select>
        </div>

        {/* region chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {regions.slice(0, 8).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                region === r ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
              }`}
            >
              {r === "ALL" ? "전체" : r}
            </button>
          ))}
          {regions.length > 8 ? <Badge>+ {regions.length - 8} more</Badge> : null}
        </div>
      </section>

      {/* Grid */}
      {err ? (
  <div className="glass rounded-2xl p-4 text-sm text-red-600">
    로딩 실패: {err}
  </div>
) : null}
      {loading ? (
        <div className="text-sm text-gray-500">불러오는 중...</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const st = stats.get(r.id);
            const avg = st ? st.sum / st.count : null;
            const count = st?.count ?? 0;
            return <RestaurantCard key={r.id} r={r} avg={avg} count={count} />;
          })}
        </section>
      )}
    </div>
  );
}