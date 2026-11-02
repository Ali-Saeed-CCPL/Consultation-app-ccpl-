/* Module rail — the ERP's section navigation: a fixed 240px rail below the
   header, collapsing to 56px, mono uppercase group labels, 14px items, the
   --primary fill for the active one and a mono count on the right. */

import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Menu } from "lucide-react";
import { CHROME_H } from "@/components/layout/top-nav";
import type { RailItem } from "@/config/navigation";

export default function ModuleRail({
  title,
  items,
  counts,
  collapsed,
  onToggle,
}: {
  title: string;
  items: RailItem[];
  counts: Record<string, number>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useRouterState({ select: (s) => s.location });
  const view = (location.search as { view?: string }).view;
  const groups = Array.from(new Set(items.map((s) => s.group)));
  // The first item is the module's landing view when the URL carries none.
  const isActive = (item: RailItem) =>
    location.pathname === item.to && (item.search?.view ?? null) === (view ?? items[0].search?.view ?? null);

  return (
    <aside
      className={`module-rail fixed left-0 bottom-0 z-[40000] bg-[var(--chrome)] font-sans border-r border-[var(--line)] flex flex-col transition-all duration-300 ${
        collapsed ? "w-[56px]" : "w-[240px]"
      }`}
      style={{ top: CHROME_H }}
      aria-label="Section navigation"
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--hair)] min-h-[57px]">
        {!collapsed ? (
          <>
            <span className="text-[18px] font-semibold text-[var(--ink)] tracking-tight">{title}</span>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-full border border-[var(--line)] bg-[var(--white)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-[var(--mute)] flex items-center justify-center transition-colors"
              title="Close sidebar"
              aria-label="Collapse section navigation"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={onToggle}
              className="w-8 h-8 rounded-lg hover:bg-[var(--canvas)] text-[var(--mute)] hover:text-[var(--ink)] flex items-center justify-center transition-colors"
              title="Open sidebar"
              aria-label="Expand section navigation"
            >
              <Menu size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 custom-sidebar-scrollbar">
        {!collapsed ? (
          <div className="space-y-5 px-1">
            {groups.map((group) => (
              <div key={group}>
                <p className="px-3 pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">{group}</p>
                <div className="space-y-1">
                  {items
                    .filter((s) => s.group === group)
                    .map((s) => {
                      const active = isActive(s);
                      const count = counts[s.key];
                      return (
                        <Link
                          key={s.key}
                          to={s.to}
                          search={s.search as never}
                          className={`flex items-center justify-between px-3 py-2.5 transition-all text-[14px] rounded-lg ${
                            active
                              ? "bg-[var(--primary)] text-[var(--ink)] font-semibold"
                              : "text-[var(--body)] hover:bg-[var(--sunken)] hover:text-[var(--ink)]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <s.icon size={16} strokeWidth={1.9} className={`flex-shrink-0 ${active ? "text-[var(--link)]" : "text-[var(--mute)]"}`} />
                            <span className="truncate">{s.label}</span>
                          </span>
                          {count ? (
                            s.tone ? (
                              <span
                                className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  s.tone === "err"
                                    ? "bg-[var(--red-tint)] text-[var(--color-red-ink)]"
                                    : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
                                }`}
                              >
                                {count}
                              </span>
                            ) : (
                              <span className={`font-mono text-[12.5px] ${active ? "text-[var(--ink)] font-medium" : "text-[var(--mute)]"}`}>{count}</span>
                            )
                          ) : null}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 py-1">
            {groups.map((group, gi) => (
              <div key={group} className="flex flex-col items-center gap-2.5">
                {gi > 0 && <div className="w-6 h-px bg-[var(--hair)] my-1" />}
                {items
                  .filter((s) => s.group === group)
                  .map((s) => (
                    <Link
                      key={s.key}
                      to={s.to}
                      search={s.search as never}
                      title={s.label}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        isActive(s) ? "bg-[var(--primary)]" : "hover:bg-[var(--canvas)]"
                      }`}
                    >
                      <s.icon size={17} strokeWidth={1.9} className={isActive(s) ? "text-[var(--teal-deep)]" : "text-[var(--mute)]"} />
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
