import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "err" | "neutral";

const toneClasses: Record<Tone, string> = {
  ok: "bg-(--color-green-tint) text-(--color-green-ink)",
  warn: "bg-(--color-amber-tint) text-(--color-amber-ink)",
  err: "bg-(--color-red-tint) text-(--color-red-ink)",
  neutral: "bg-(--color-chip) text-(--color-mute)",
};

export default function Tag({
  tone = "ok",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-(--radius-pill) px-2.5 py-[3px] font-(family-name:--font-ui) text-[12px] font-semibold ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
