"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=60";

// @lat,lng 파싱 (있으면 정확 핀, 없으면 null)
function extractLatLng(mapUrl: string): {
  lat: number | null;
  lng: number | null;
} {
  const m = mapUrl.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
  if (!m) return { lat: null, lng: null };
  const lat = Number(m[1]);
  const lng = Number(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return { lat: null, lng: null };
  return { lat, lng };
}

function mapEmbedUrl(mapUrl?: string | null, address?: string) {
  if (mapUrl) {
    const { lat, lng } = extractLatLng(mapUrl);
    if (lat != null && lng != null) {
      return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
    }
  }
  if (address) {
    const q = encodeURIComponent(address);
    return `https://www.google.com/maps?q=${q}&output=embed`;
  }
  return "";
}

function normalizeUrls(text: string) {
  // 콤마/줄바꿈/공백으로 분리해서 URL 배열 만들기
  const parts = text
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // 중복 제거
  return Array.from(new Set(parts));
}

const SAMPLE = {
  name: "고고치킨",
  address: "Tokyo, Asakusa",
  category: "한국식 치킨",
  description: "바삭한 튀김옷과 한국식 양념이 인기",
  thumbnailUrl:
    "https://tblg.k-img.com/restaurant/images/Rvw/233671/640x640_rect_caab78d6b2c12f297dc0f84a0675a790.jpg",
  mapUrl:
    "https://www.google.com/maps/place/%EC%95%84%EC%82%AC%EC%BF%A0%EC%82%AC+%EA%B3%A0%EA%B3%A0%EC%B9%98%ED%82%A8/@35.714765,139.796655,17z",
  mainMenu: "양념치킨, 간장치킨",
  features: "현지인에게도 인기, 포장 가능",
  phone: "+81-3-0000-0000",
  galleryText: `https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=60
https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=60`,
};

export default function Page() {
  const router = useRouter();

  // 필수
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  // 옵션
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [mainMenu, setMainMenu] = useState("");
  const [features, setFeatures] = useState("");
  const [phone, setPhone] = useState("");

  // 갤러리(여러 URL)
  const [galleryText, setGalleryText] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  const heroPreview = useMemo(() => {
    const u = thumbnailUrl.trim();
    return u ? u : FALLBACK_IMG;
  }, [thumbnailUrl]);

  const mapSrc = useMemo(() => {
    return mapEmbedUrl(mapUrl.trim() || null, address.trim());
  }, [mapUrl, address]);

  const mapLink = useMemo(() => {
    const m = mapUrl.trim();
    if (m) return m;
    const a = address.trim();
    if (!a) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
  }, [mapUrl, address]);

  function fillSample() {
    setName(SAMPLE.name);
    setAddress(SAMPLE.address);
    setCategory(SAMPLE.category);
    setDescription(SAMPLE.description);
    setThumbnailUrl(SAMPLE.thumbnailUrl);
    setMapUrl(SAMPLE.mapUrl);
    setMainMenu(SAMPLE.mainMenu);
    setFeatures(SAMPLE.features);
    setPhone(SAMPLE.phone);
    setGalleryText(SAMPLE.galleryText);
    setMsg("샘플 데이터를 채웠습니다. (발표용)");
  }

  async function save() {
    if (loading) return;
    setMsg(null);

    const n = name.trim();
    const a = address.trim();

    if (!n || !a) {
      setMsg("이름, 주소는 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;

      if (!uid) {
        setMsg("로그인이 만료되었습니다. 다시 로그인해주세요.");
        window.location.href = "/auth?mode=login";
        return;
      }

      const murl = mapUrl.trim();
      const { lat, lng } = murl
        ? extractLatLng(murl)
        : { lat: null, lng: null };

      const gallery_urls = normalizeUrls(galleryText);
      const payload = {
        name: n,
        address: a,
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,

        // 좌표/지도
        map_url: murl || null,
        lat,
        lng,

        category: category.trim() || null,
        main_menu: mainMenu.trim() || null,
        features: features.trim() || null,
        phone: phone.trim() || null,

        gallery_urls: gallery_urls.length ? gallery_urls : null,

        created_by: uid,
        // created_at은 DB default(now())로 처리 권장
      };

      const { error } = await supabase.from("restaurants").insert(payload);

      if (error) {
        const em = (error.message ?? "").toLowerCase();
        if (em.includes("duplicate") || em.includes("unique")) {
          setMsg("이미 등록된 맛집입니다. (중복)");
          return;
        }
        throw error;
      }

      setMsg("등록 완료! 홈으로 이동합니다…");
      setTimeout(() => router.push("/"), 350);
    } catch (e: any) {
      console.error("RESTAURANT INSERT ERROR:", e);
      setMsg(e?.message ?? "등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (checking)
    return <div className="text-sm text-gray-500">로그인 확인 중...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 헤더 */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Demo • Restaurants</div>
            <h1 className="mt-1 text-2xl font-semibold">맛집 추가</h1>
            <p className="mt-2 text-sm text-gray-600">
              대표사진/지도/상세정보/갤러리까지 입력 (발표용)
            </p>
          </div>

          <div className="flex flex-col gap-2">
  <button
    type="button"
    onClick={() => router.push("/")}
    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
  >
    취소
  </button>

  <button
    type="button"
    onClick={fillSample}
    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
  >
    샘플 자동 입력
  </button>
</div>
        </div>
      </section>

      {/* 기본 정보 */}
      <section className="glass rounded-3xl p-6">
        <div className="text-lg font-semibold">기본 정보</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="맛집 이름 *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="예: 고고치킨"
            />
          </Field>

          <Field label="카테고리">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="예: 한식/치킨/돈카츠"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="주소 *">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
                placeholder="예: Shinjuku, Tokyo"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="소개">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
                placeholder="예: 바삭한 한국식 양념치킨"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* 상세 정보 */}
      <section className="glass rounded-3xl p-6">
        <div className="text-lg font-semibold">상세 정보</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="대표 메뉴">
            <input
              value={mainMenu}
              onChange={(e) => setMainMenu(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="예: 양념치킨, 간장치킨"
            />
          </Field>

          <Field label="전화번호">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="예: +81-xx-xxxx-xxxx"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="특징">
              <input
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
                placeholder="예: 포차 감성, 웨이팅 적음"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* 이미지 + 지도 */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* 대표 이미지 */}
        <div className="lg:col-span-7 glass rounded-3xl p-6">
          <div className="text-lg font-semibold">대표 이미지</div>

          <Field label="대표 이미지 URL (thumbnail_url)">
            <input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="https://images.unsplash.com/..."
            />
          </Field>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroPreview}
              alt="preview"
              className="h-56 w-full object-cover"
            />
          </div>
        </div>

        {/* 지도 */}
        <div className="lg:col-span-5 glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">지도</div>
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Google 지도에서 보기 →
              </a>
            ) : null}
          </div>

          <Field label="Google 지도 URL (map_url)">
            <input
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
              placeholder="https://www.google.com/maps/.../@35.x,139.x,17z"
            />
          </Field>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white">
            {mapSrc ? (
              <iframe
                title="map"
                src={mapSrc}
                width="100%"
                height="260"
                loading="lazy"
              />
            ) : (
              <div className="grid h-[260px] place-items-center text-sm text-gray-500">
                주소/지도 링크를 입력하면 미리보기가 표시됩니다.
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            * URL에 <b>@위도,경도</b>가 있으면 lat/lng를 자동 저장합니다.
          </div>
        </div>
      </section>

      {/* 갤러리 */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">갤러리</div>
            <div className="text-sm text-gray-600">
              여러 이미지 URL을 줄바꿈/콤마로 입력
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {normalizeUrls(galleryText).length} urls
          </div>
        </div>

        <textarea
          value={galleryText}
          onChange={(e) => setGalleryText(e.target.value)}
          rows={4}
          className="mt-3 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/5"
          placeholder={`https://...\nhttps://...\nhttps://...`}
        />

        {normalizeUrls(galleryText).length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {normalizeUrls(galleryText)
              .slice(0, 12)
              .map((u) => (
                <div
                  key={u}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="g" className="h-24 w-full object-cover" />
                </div>
              ))}
          </div>
        ) : null}
      </section>

      {/* 저장 */}
      <section className="glass rounded-3xl p-6">
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
        >
          {loading ? "등록 중..." : "등록"}
        </button>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-gray-700">
            {msg}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}
