import type { ReactNode } from "react";

/** A white panel with a title row — the ERP dashboard's "Enrollment pipeline" / "Needs attention" card. */
export default function Section({
  title,
  sub,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`min-w-0 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) shadow-(--shadow-sm) ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-(--color-ink)">{title}</h2>
          {sub ? <p className="mt-0.5 text-[12.5px] text-(--color-mute)">{sub}</p> : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </header>
      <div className={`px-5 pb-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
