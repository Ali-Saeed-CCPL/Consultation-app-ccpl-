/* A list in pages: usePage slices the items, Pager shows "1–5 of 8" with previous /
   next. Hidden when everything fits on one page. */

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function usePage<T>(items: T[], size: number) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  // A list that shrank (a call ended, a follow-up passed) never leaves us past the end.
  const p = Math.min(page, pages - 1);
  return {
    rows: items.slice(p * size, (p + 1) * size),
    page: p,
    pages,
    setPage,
    from: items.length ? p * size + 1 : 0,
    to: Math.min(items.length, (p + 1) * size),
    total: items.length,
  };
}

export default function Pager({ page, pages, setPage, from, to, total }: Omit<ReturnType<typeof usePage>, "rows">) {
  if (pages <= 1) return null;
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] text-[var(--ink)] hover:border-[var(--link)] hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border-input)] disabled:hover:bg-[var(--white)]";
  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <span className="font-mono text-[12.5px] text-[var(--body)]">
        {from}–{to} of {total}
      </span>
      <span className="flex items-center gap-1.5">
        <button type="button" className={btn} aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[48px] text-center font-mono text-[12.5px] text-[var(--body)]">
          {page + 1} / {pages}
        </span>
        <button type="button" className={btn} aria-label="Next page" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>
          <ChevronRight size={16} />
        </button>
      </span>
    </div>
  );
}
