import Link from "next/link";
import Badge from "@/components/Badge";
import RatingStars from "@/components/RatingStars";
import type { Restaurant } from "@/lib/types";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=60";

export default function RestaurantCard({
  r,
  avg,
  count,
}: {
  r: Restaurant & { region?: string | null };
  avg: number | null;
  count: number;
}) {
  const img = r.thumbnail_url || FALLBACK_IMG;

  return (
    <Link
      href={`/restaurants/${r.id}`}
      className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[16/9] overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={r.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-base font-semibold">{r.name}</div>
            <div className="text-sm text-gray-600 line-clamp-1">{r.address}</div>
          </div>
<Badge>{count} reviews</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {avg ? (
              <span className="inline-flex items-center gap-2">
                <RatingStars value={Math.round(avg)} />
                <span className="font-medium">{avg.toFixed(1)}</span>
              </span>
            ) : (
              <span className="text-gray-500">아직 평점 없음</span>
            )}
          </div>
          <span className="text-xs text-gray-500">상세 보기 →</span>
        </div>

        {r.description ? (
          <div className="text-sm text-gray-700 line-clamp-2">{r.description}</div>
        ) : null}
      </div>
    </Link>
  );
}