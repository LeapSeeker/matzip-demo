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
        variant === "solid"
          ? "bg-white/12 text-white border border-white/10"
          : "text-white/85 border border-white/10 bg-white/6"
      )}
    >
      {children}
    </span>
  );
}