/** Initials disc in the ERP avatar treatment (primary fill, sky-300 ring, mono initials). */
export default function Avatar({ initials, size = 32, className = "" }: { initials: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full border border-[var(--sky-300)] bg-[var(--primary)] font-mono font-semibold text-[var(--ink)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.\s*/, "")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
