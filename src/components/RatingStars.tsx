"use client";

import { cx } from "@/lib/ui";

export default function RatingStars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const s = size === "md" ? "text-base" : "text-sm";
  return (
    <span className={cx("inline-flex items-center gap-1", s)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cx(i < value ? "text-yellow-500" : "text-gray-300")}>★</span>
      ))}
    </span>
  );
}