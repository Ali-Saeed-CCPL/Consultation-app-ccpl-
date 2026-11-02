/* Page hero — the ERP's page header: a --tint -> --canvas gradient with a
   --line base rule, a breadcrumb of 11px labels, and a 22px semibold
   --teal-deep title, actions on the right. */

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function PageHero({
  crumb,
  title,
  sub,
  actions,
}: {
  crumb: { label: string; to?: string }[];
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 bg-gradient-to-b from-[var(--tint)] to-[var(--canvas)] border-b border-[var(--line)] px-6 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--mute)] mb-1">
          {crumb.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={11} className="text-[var(--faint)]" />}
              {c.to ? (
                <Link to={c.to} className="text-[var(--mute)] hover:text-[var(--teal-deep)] hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className={i === crumb.length - 1 ? "text-[var(--teal-deep)] font-semibold" : undefined}>{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="text-[22px] font-semibold text-[var(--teal-deep)] tracking-tight leading-snug">{title}</h1>
        {sub ? <p className="mt-0.5 text-[13px] text-[var(--body)]">{sub}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-shrink-0 mt-1">{actions}</div> : null}
    </div>
  );
}
