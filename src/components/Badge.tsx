import { cx } from "@/lib/ui";

export default function Badge({
  children,
  variant = "soft",
}: {
  children: React.ReactNode;
  variant?: "soft" | "solid";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs",
        variant === "solid"
          ? "bg-white/12 text-white border border-white/10"
          : "text-white/85 border border-white/10 bg-white/6"
      )}
    >
      {children}
    </span>
  );
}