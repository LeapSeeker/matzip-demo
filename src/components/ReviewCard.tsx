import RatingStars from "@/components/RatingStars";

export default function ReviewCard({
  rating,
  comment,
  createdAt,
  mine,
}: {
  rating: number;
  comment: string;
  createdAt: string;
  mine?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RatingStars value={rating} />
          <span className="text-sm font-medium">{rating}/5</span>
          {mine ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">내 리뷰</span> : null}
        </div>
        <div className="text-xs text-gray-500">{new Date(createdAt).toLocaleString()}</div>
      </div>
      <div className="mt-2 text-sm text-gray-800">{comment}</div>
    </div>
  );
}