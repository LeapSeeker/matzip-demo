import { cx } from "@/lib/ui";

export default function Button({
  children,
  kind="primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "ghost" | "danger";
}) {
  const base =
    "rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
  const map = {
    primary:
      "text-white bg-white/10 border border-white/12 hover:bg-white/14 shadow-[0_10px_30px_rgba(0,0,0,.35)]",
    ghost:
      "text-white/85 bg-transparent border border-white/10 hover:bg-white/6",
    danger:
      "text-rose-200 bg-rose-500/10 border border-rose-400/20 hover:bg-rose-500/14",
  }[kind];

  return (
    <button className={cx(base, map, className)} {...props}>
      {children}
    </button>
  );
}