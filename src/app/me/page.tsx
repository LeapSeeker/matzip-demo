"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RatingStars from "@/components/RatingStars";
import Badge from "@/components/Badge";
import type { Review, Restaurant } from "@/lib/types";

type MyReviewRow = Review & { restaurants?: Restaurant | null };
type MyRestaurantRow = Restaurant;

export default function MyManagePage() {
  const [meId, setMeId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [myReviews, setMyReviews] = useState<MyReviewRow[]>([]);
  const [myRestaurants, setMyRestaurants] = useState<MyRestaurantRow[]>([]);

  // 리뷰 편집 상태
  const [openReviewEditor, setOpenReviewEditor] = useState(false);
  const [editingReview, setEditingReview] = useState<MyReviewRow | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // 맛집 삭제 상태
  const [deletingRestaurantId, setDeletingRestaurantId] = useState<number | null>(null);

  async function requireLogin() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    setMeId(uid);
    if (!uid) {
      window.location.href = "/auth?mode=login";
      return null;
    }
    return uid;
  }

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    try {
      const uid = await requireLogin();
      if (!uid) return;

      // 내 리뷰 (restaurant join)
      const r1 = await supabase
        .from("reviews")
        .select(`*, restaurants(*)`)
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      if (r1.error) throw r1.error;
      setMyReviews((r1.data as MyReviewRow[]) ?? []);

      // 내가 등록한 맛집
      const r2 = await supabase
        .from("restaurants")
        .select("*")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });

      if (r2.error) throw r2.error;
      setMyRestaurants((r2.data as MyRestaurantRow[]) ?? []);
    } catch (e: any) {
      console.error("ME LOAD ERROR:", e);
      setMsg(e?.message ?? "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reviewCount = myReviews.length;
  const myRestCount = myRestaurants.length;

  // 리뷰 편집 열기
  function openEditReview(r: MyReviewRow) {
    setEditingReview(r);
    setRating(r.rating);
    setComment(r.comment);
    setOpenReviewEditor(true);
    setMsg(null);
  }

  function closeEditReview() {
    setOpenReviewEditor(false);
    setEditingReview(null);
  }

  async function saveReview() {
    if (savingReview) return;
    setMsg(null);

    const uid = meId ?? (await requireLogin());
    if (!uid) return;

    if (!editingReview) return setMsg("수정할 리뷰를 선택해주세요.");
    const c = comment.trim();
    if (!c) return setMsg("한줄평을 입력하세요.");
    if (c.length > 120) return setMsg("한줄평은 120자 이내로 작성해주세요.");

    setSavingReview(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: c,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingReview.id)
        .eq("user_id", uid); // ✅ 본인 것만

      if (error) throw error;

      // ✅ 전체 리로드 대신 내 리뷰만 가볍게 갱신
      const r1 = await supabase
        .from("reviews")
        .select(`*, restaurants(*)`)
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      if (r1.error) throw r1.error;
      setMyReviews((r1.data as MyReviewRow[]) ?? []);

      setMsg("리뷰 수정 완료.");
      closeEditReview();
    } catch (e: any) {
      console.error("REVIEW UPDATE ERROR:", e);
      setMsg(e?.message ?? "리뷰 수정 실패");
    } finally {
      setSavingReview(false);
    }
  }

  async function deleteReview(reviewId: number) {
    if (savingReview) return;
    setMsg(null);

    const uid = meId ?? (await requireLogin());
    if (!uid) return;

    setSavingReview(true);
    try {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", uid);
      if (error) throw error;

      setMyReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setMsg("리뷰 삭제 완료.");
      if (editingReview?.id === reviewId) closeEditReview();
    } catch (e: any) {
      console.error("REVIEW DELETE ERROR:", e);
      setMsg(e?.message ?? "리뷰 삭제 실패");
    } finally {
      setSavingReview(false);
    }
  }

  async function deleteRestaurant(restaurantId: number) {
    if (deletingRestaurantId) return; // 하나씩만
    setMsg(null);

    const uid = meId ?? (await requireLogin());
    if (!uid) return;

    setDeletingRestaurantId(restaurantId);
    try {
      // ✅ RLS가 최종 방어 (created_by = auth.uid() 아니면 실패)
      const { error } = await supabase.from("restaurants").delete().eq("id", restaurantId);
      if (error) throw error;

      setMyRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
      setMsg("맛집 삭제 완료.");
    } catch (e: any) {
      console.error("RESTAURANT DELETE ERROR:", e);
      setMsg(e?.message ?? "맛집 삭제 실패");
    } finally {
      setDeletingRestaurantId(null);
    }
  }

  const avgMyRating = useMemo(() => {
    if (myReviews.length === 0) return null as number | null;
    const sum = myReviews.reduce((a, r) => a + r.rating, 0);
    return Math.round((sum / myReviews.length) * 10) / 10;
  }, [myReviews]);

  if (loading) {
    return <div className="text-sm text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 상단 요약 */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs text-gray-500">My Page • Manage</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">내 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              내 리뷰 수정/삭제 + 내가 등록한 맛집 삭제까지 한 화면에서 관리합니다.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm">
              <div className="text-gray-500">내 리뷰</div>
              <div className="font-semibold">{reviewCount}</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm">
              <div className="text-gray-500">내가 등록한 맛집</div>
              <div className="font-semibold">{myRestCount}</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm">
              <div className="text-gray-500">내 평균 평점</div>
              <div className="font-semibold">{avgMyRating ? avgMyRating.toFixed(1) : "-"}</div>
            </div>
          </div>
        </div>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-700">
            {msg}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        {/* 왼쪽: 내 리뷰 */}
        <div className="lg:col-span-7 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">내 리뷰</div>
            <Badge>{myReviews.length}개</Badge>
          </div>

          {myReviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-600">
              아직 작성한 리뷰가 없습니다.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {myReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/restaurants/${r.restaurant_id}`}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {r.restaurants?.name ?? `맛집 #${r.restaurant_id}`}
                        </Link>
                        <Badge>{r.rating}/5</Badge>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 line-clamp-2">{r.comment}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(r.updated_at ?? r.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => openEditReview(r)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-gray-50"
                      >
                        수정
                      </button>
                      <button
                        disabled={savingReview}
                        onClick={() => deleteReview(r.id)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-red-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <RatingStars value={r.rating} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 내가 등록한 맛집 */}
        <div className="lg:col-span-5 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">내가 등록한 맛집</div>
            <Badge>{myRestaurants.length}개</Badge>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            * 삭제는 내가 등록한 항목에만 가능합니다.
          </div>

          {myRestaurants.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-600">
              내가 등록한 맛집이 없습니다.{" "}
              <Link href="/restaurants/new" className="underline">
                맛집 추가
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {myRestaurants.map((r) => (
                <div key={r.id} className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/restaurants/${r.id}`} className="font-semibold text-gray-900 hover:underline">
                        {r.name}
                      </Link>
                      <div className="mt-1 text-sm text-gray-700 line-clamp-1">{r.address}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {r.category ? `#${r.category}` : ""}
                      </div>
                    </div>

                    <button
                      disabled={deletingRestaurantId === r.id}
                      onClick={() => deleteRestaurant(r.id)}
                      className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-red-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {deletingRestaurantId === r.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      상세 보기
                    </Link>
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      리뷰 보러가기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 리뷰 편집 모달 */}
      {openReviewEditor && editingReview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,.20)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">리뷰 수정</div>
                <div className="mt-1 text-lg font-semibold">
                  {editingReview.restaurants?.name ?? `맛집 #${editingReview.restaurant_id}`}
                </div>
              </div>
              <button
                onClick={closeEditReview}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                만족도(1~5)
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  disabled={savingReview}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                한줄평 (최대 120자)
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={savingReview}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                />
              </label>

              <div className="flex gap-2">
                <button
                  onClick={saveReview}
                  disabled={savingReview}
                  className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {savingReview ? "저장 중..." : "저장"}
                </button>

                <button
                  onClick={() => deleteReview(editingReview.id)}
                  disabled={savingReview}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </div>

            {msg ? (
              <div className="mt-4 rounded-2xl border border-black/10 bg-gray-50 p-4 text-sm text-gray-700">
                {msg}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}