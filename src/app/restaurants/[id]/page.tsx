"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Restaurant, Review } from "@/lib/types";
import RatingStars from "@/components/RatingStars";
import Badge from "@/components/Badge";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=60";

function mapEmbedUrl(mapUrl?: string | null, address?: string) {
  if (mapUrl) {
    const m = mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (m) {
      const lat = m[1];
      const lng = m[2];

      return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
    }
  }

  if (address) {
    const q = encodeURIComponent(address);

    return `https://www.google.com/maps?q=${q}&output=embed`;
  }

  return "";
}

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const rid = Number(params.id);

  const [meId, setMeId] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  // 리뷰 작성/수정 박스 토글
  const [openEditor, setOpenEditor] = useState(false);

  // 내 리뷰 폼
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [photoText, setPhotoText] = useState("");

  // 저장/삭제 중복 클릭 방지
  const [savingReview, setSavingReview] = useState(false);

  function openPhoto(i: number) {
    setPhotoIdx(i);
    setPhotoOpen(true);
  }

  function closePhoto() {
    setPhotoOpen(false);
  }

  function prevPhoto(total: number) {
    setPhotoIdx((p) => (p - 1 + total) % total);
  }

  function nextPhoto(total: number) {
    setPhotoIdx((p) => (p + 1) % total);
  }

  async function refreshAuthOnce() {
    try {
      // getUser() 대신 getSession(): 락 경합 조금 덜함
      const { data } = await supabase.auth.getSession();
      setMeId(data.session?.user?.id ?? null);
    } catch {
      setMeId(null);
    }
  }

  async function loadAll() {
    setLoading(true);
    setMsg(null);
    try {
      const r1 = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", rid)
        .maybeSingle();

      if (r1.error) throw r1.error;
      setRestaurant((r1.data as Restaurant) ?? null);

      const r2 = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", rid)
        .order("created_at", { ascending: false });

      if (r2.error) throw r2.error;
      setReviews((r2.data as Review[]) ?? []);
    } catch (e: any) {
      console.error("DETAIL LOAD ERROR:", e);
      setRestaurant(null);
      setReviews([]);
      setMsg(e?.message ?? "불러오기에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 리뷰만 가볍게 새로고침 (save/delete 후)
  async function reloadReviews() {
    const r2 = await supabase
      .from("reviews")
      .select("*")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false });

    if (r2.error) throw r2.error;
    setReviews((r2.data as Review[]) ?? []);
  }

  useEffect(() => {
    refreshAuthOnce();
  }, []);

  useEffect(() => {
    if (!Number.isFinite(rid)) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  const myReview = useMemo(
    () => (meId ? (reviews.find((r) => r.user_id === meId) ?? null) : null),
    [reviews, meId],
  );

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
      setPhotoText((myReview.photo_urls ?? []).join("\n"));
    } else {
      setRating(5);
      setComment("");
      setPhotoText("");
    }
  }, [myReview]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: null as number | null, count: 0 };
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return {
      avg: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }, [reviews]);

  // 내 리뷰를 최상단 고정
  const pinnedAndOthers = useMemo(() => {
    if (!myReview) return { pinned: null as Review | null, others: reviews };
    return {
      pinned: myReview,
      others: reviews.filter((r) => r.id !== myReview.id),
    };
  }, [reviews, myReview]);

  const galleryPhotos = useMemo(() => {
    return (restaurant?.gallery_urls ?? []).filter(Boolean);
  }, [restaurant]);

  useEffect(() => {
    if (!photoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePhoto();
      if (e.key === "ArrowLeft") prevPhoto(galleryPhotos.length);
      if (e.key === "ArrowRight") nextPhoto(galleryPhotos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoOpen, galleryPhotos.length]);

  async function upsertMyReview() {
    if (savingReview) return;

    setMsg(null);
    if (!meId) return setMsg("로그인이 필요합니다.");

    const c = comment.trim();
    if (!c) return setMsg("한줄평을 입력하세요.");
    if (c.length > 120) return setMsg("한줄평은 120자 이내로 작성해주세요.");

    setSavingReview(true);
    try {
      const { error } = await supabase.from("reviews").upsert(
        {
          restaurant_id: rid,
          user_id: meId,
          rating,
          comment: c,
        },
        { onConflict: "restaurant_id,user_id" },
      );

      if (error) throw error;

      // ✅ 전체 재로딩(loadAll) 말고 리뷰만
      await reloadReviews();

      setOpenEditor(false);
      setMsg(myReview ? "수정 저장 완료." : "작성 저장 완료.");
    } catch (e: any) {
      console.error("UPSERT ERROR:", e);
      setMsg(e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSavingReview(false);
    }
  }

  async function deleteMyReview() {
    if (savingReview) return;

    setMsg(null);
    if (!meId) return setMsg("로그인이 필요합니다.");
    if (!myReview) return;

    setSavingReview(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("restaurant_id", rid)
        .eq("user_id", meId);

      if (error) throw error;

      await reloadReviews();

      setOpenEditor(false);
      setMsg("삭제 완료.");
    } catch (e: any) {
      console.error("DELETE ERROR:", e);
      setMsg(e?.message ?? "삭제에 실패했습니다.");
    } finally {
      setSavingReview(false);
    }
  }

  if (loading)
    return <div className="text-sm text-gray-500">불러오는 중...</div>;

  if (!restaurant) {
    return (
      <div className="space-y-3">
        <div className="glass rounded-2xl p-5">
          <div className="text-lg font-semibold">맛집을 찾을 수 없습니다.</div>
          <div className="mt-1 text-sm text-gray-600">
            홈으로 돌아가 다시 선택해주세요.
          </div>
          {msg ? <div className="mt-3 text-sm text-red-600">{msg}</div> : null}
        </div>
        <Link className="text-sm underline" href="/">
          ← 홈으로
        </Link>
      </div>
    );
  }

  const heroImg = restaurant.thumbnail_url || FALLBACK_IMG;

  return (
    <div className="space-y-6">
      {/* Hero: 이름 + 대표 이미지 */}
      <section className="overflow-hidden rounded-3xl border border-black/5 bg-white/80 shadow-[0_12px_40px_rgba(15,23,42,.08)]">
        <div className="relative aspect-[21/9] min-h-[220px] bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImg}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <Link href="/" className="text-xs text-white/80 hover:text-white">
              ← 리스트로
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {restaurant.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {restaurant.category ? (
                <Badge>{restaurant.category}</Badge>
              ) : null}
              <Badge>
                {stats.avg ? (
                  <span className="inline-flex items-center gap-2">
                    <RatingStars value={Math.round(stats.avg)} />
                    <span className="font-medium">{stats.avg.toFixed(1)}</span>
                    <span className="text-gray-500">({stats.count})</span>
                  </span>
                ) : (
                  <span className="text-gray-700">평점 없음</span>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 1) 상세정보 + 지도 (나란히) */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* 상세정보 */}
        <div className="lg:col-span-7 glass rounded-3xl p-6">
          <div className="text-lg font-semibold">상세 정보</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoItem label="위치" value={restaurant.address} />
            <InfoItem
              label="음식 카테고리"
              value={restaurant.category ?? "-"}
            />
            <InfoItem label="대표 메뉴" value={restaurant.main_menu ?? "-"} />
            <InfoItem label="특징" value={restaurant.features ?? "-"} />
            <InfoItem label="전화번호" value={restaurant.phone ?? "-"} />
            <InfoItem label="소개" value={restaurant.description ?? "-"} />
          </div>
        </div>

        {/* 지도 */}
        <div className="lg:col-span-5 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">지도</div>

            <a
              href={
                restaurant.map_url ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  restaurant.address,
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Google 지도에서 보기 →
            </a>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white">
            <iframe
              title="map"
              src={mapEmbedUrl(restaurant.map_url, restaurant.address)}
              width="100%"
              height="340"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold">매장 사진</div>
            <div className="text-sm text-gray-600">등록된 매장 추가 사진</div>
          </div>
          <Badge>{galleryPhotos.length}장</Badge>
        </div>

        {galleryPhotos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-600">
            추가된 매장 사진이 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {galleryPhotos.map((u, idx) => (
              <button
                type="button"
                key={`${u}-${idx}`}
                onClick={() => openPhoto(idx)}
                className="group overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow-sm focus:outline-none"
                aria-label={`매장 사진 ${idx + 1} 크게 보기`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt={`gallery-${idx}`}
                  className="h-28 w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3) 전체 리뷰 */}
      <section className="glass rounded-3xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">
                {restaurant.name} 리뷰
              </div>
              <Badge>{reviews.length}개</Badge>
            </div>
            <div className="text-sm text-gray-600">사용자 한줄평</div>
          </div>

          <button
            onClick={async () => {
              // 상세에서 auth 감시 안 하므로, 여기서 한 번 갱신
              await refreshAuthOnce();
              if (!meId) return (window.location.href = "/auth?mode=login");
              setOpenEditor(true);
              setMsg(null);
            }}
            className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            {meId
              ? myReview
                ? "리뷰 수정"
                : "리뷰 작성"
              : "로그인 후 리뷰 작성"}
          </button>
        </div>

        {/* 리뷰 에디터(박스) */}
        {openEditor ? (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                {myReview ? "내 리뷰 수정" : "내 리뷰 작성"}
              </div>
              <button
                onClick={() => setOpenEditor(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>

            <label className="mt-3 block text-sm">
              만족도(1~5)
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-sm"
                disabled={savingReview}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-sm">
              한줄평 (최대 120자)
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="예: 분위기 좋고 양 많음, 재방문!"
                className="mt-1 w-full rounded-xl border border-black/5 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5"
                disabled={savingReview}
              />
            </label>

            <div className="mt-3 flex gap-2">
              <button
                disabled={savingReview}
                onClick={upsertMyReview}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
              >
                {savingReview ? "저장 중..." : "저장"}
              </button>

              {myReview ? (
                <button
                  disabled={savingReview}
                  onClick={deleteMyReview}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-60"
                >
                  {savingReview ? "처리 중..." : "삭제"}
                </button>
              ) : null}
            </div>

            {msg ? (
              <div className="mt-3 rounded-xl border border-black/5 bg-white p-3 text-sm text-gray-700">
                {msg}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 리뷰 리스트 */}
        <div className="mt-4 space-y-3">
          {pinnedAndOthers.pinned ? (
            <ReviewItem
              review={pinnedAndOthers.pinned}
              mine
              onEdit={async () => {
                await refreshAuthOnce();
                if (!meId) return (window.location.href = "/auth?mode=login");
                setOpenEditor(true);
                setMsg(null);
              }}
            />
          ) : null}

          {pinnedAndOthers.others.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-gray-600">
              아직 리뷰가 없습니다.
            </div>
          ) : (
            pinnedAndOthers.others.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))
          )}
        </div>
      </section>

      {photoOpen && galleryPhotos.length > 0 ? (
  <div
    className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
    onClick={closePhoto}
    role="dialog"
    aria-modal="true"
  >
    <div
      className="mx-auto flex h-full max-w-5xl items-center justify-center px-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        {/* 상단 바 */}
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div className="text-sm font-medium">
            매장 사진 <span className="text-gray-500">{photoIdx + 1} / {galleryPhotos.length}</span>
          </div>
          <button
            type="button"
            onClick={closePhoto}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            닫기 (ESC)
          </button>
        </div>

        {/* 이미지 */}
        <div className="relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={galleryPhotos[photoIdx]}
            alt={`gallery-large-${photoIdx}`}
            className="max-h-[75vh] w-full object-contain"
          />

          {/* 좌/우 버튼 */}
          {galleryPhotos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => prevPhoto(galleryPhotos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-2xl bg-white/90 px-3 py-2 text-sm shadow hover:bg-white"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => nextPhoto(galleryPhotos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-2xl bg-white/90 px-3 py-2 text-sm shadow hover:bg-white"
              >
                →
              </button>
            </>
          ) : null}
        </div>

        {/* 하단 썸네일 스트립 (있으면 발표용 더 좋아짐) */}
        {galleryPhotos.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-t border-black/5 bg-white px-4 py-3">
            {galleryPhotos.slice(0, 12).map((u, i) => (
              <button
                type="button"
                key={`${u}-${i}`}
                onClick={() => setPhotoIdx(i)}
                className={`h-16 w-24 overflow-hidden rounded-xl border ${
                  i === photoIdx ? "border-black/30" : "border-black/10"
                }`}
                aria-label={`썸네일 ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`thumb-${i}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </div>
) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">
        {value?.trim() ? value : "-"}
      </div>
    </div>
  );
}

function ReviewItem({
  review,
  mine,
  onEdit,
}: {
  review: Review;
  mine?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white/70 p-4 shadow-sm ${mine ? "border-black/10" : "border-black/5"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mine ? (
            <span className="rounded-full bg-black/5 px-2 py-1 text-xs text-gray-700">
              내 리뷰
            </span>
          ) : null}
          <RatingStars value={review.rating} />
          <span className="text-sm font-medium">{review.rating}/5</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {new Date(review.updated_at ?? review.created_at).toLocaleString()}
          </div>
          {mine && onEdit ? (
            <button
              onClick={onEdit}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs hover:bg-gray-50"
            >
              수정
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-800">{review.comment}</div>

      {(review.photo_urls?.length ?? 0) > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {review.photo_urls!.slice(0, 8).map((u, idx) => (
            <div
              key={`${u}-${idx}`}
              className="overflow-hidden rounded-xl border border-black/5 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt={`rv-${idx}`}
                className="h-16 w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
