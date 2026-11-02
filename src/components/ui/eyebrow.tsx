import type { ReactNode } from "react";

export default function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-(family-name:--font-mono) text-[11px] font-semibold uppercase tracking-[.12em] text-(--color-mute) ${className}`}
    >
      {children}
    </span>
  );
}
