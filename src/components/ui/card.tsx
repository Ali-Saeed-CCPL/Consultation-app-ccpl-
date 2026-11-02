import type { HTMLAttributes } from "react";

export default function Card({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 shadow-(--shadow-sm) ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
