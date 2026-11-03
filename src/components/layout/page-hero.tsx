/* Page header shared by the doctor and admin portals: a white band under the
   module bar with a 12px breadcrumb, the 24px navy page title (.page-title) and
   an optional subtitle, actions aligned to the title's baseline on the right.
   The breadcrumb shows only when there is a level above this page (a lone crumb
   would just repeat the title). Detail pages pass `back`: an arrow beside the
   title that returns to the previous page, or to `back` when opened directly. */

import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";

export default function PageHero({
  crumb,
  title,
  sub,
  actions,
  back,
}: {
  crumb: { label: string; to?: string; search?: Record<string, string> }[];
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  /** Where the back arrow goes when there is no previous page in this tab. */
  back?: string;
}) {
  const router = useRouter();
  // The page's own name is already the title — the trail shows only what is above it.
  const trail = crumb.length > 1 && crumb[crumb.length - 1].label === title ? crumb.slice(0, -1) : crumb;
  const goBack = () =>
    router.history.canGoBack()
      ? router.history.back()
      : router.navigate({ to: back });
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 hero-band border-b border-[var(--line)] px-6 py-5">
      <div className="flex min-w-0 items-start gap-3">
        {back ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            title="Back"
            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] shadow-(--shadow-xs) hover:border-[var(--sky-300)] hover:bg-[var(--sunken)]"
          >
            <ArrowLeft size={17} />
          </button>
        ) : null}
        <div className="min-w-0">
          {crumb.length > 1 ? (
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-[var(--mute)]">
              {trail.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <ChevronRight size={11} className="text-[var(--faint)]" />
                  )}
                  {c.to ? (
                    <Link
                      to={c.to}
                      search={c.search as never}
                      className="text-[var(--mute)] hover:text-[var(--teal-deep)] hover:underline"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        i === trail.length - 1
                          ? "text-[var(--teal-deep)] font-semibold"
                          : undefined
                      }
                    >
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : null}
          <h1 className="page-title">{title}</h1>
          {sub ? (
            <p className="mt-0.5 text-[13px] text-[var(--body)]">{sub}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
