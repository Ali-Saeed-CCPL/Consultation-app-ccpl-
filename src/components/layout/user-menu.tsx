/* Account menu — the ERP top bar's avatar button and dropdown: a 32px
   initials disc, then a 248px card with the user's name, their id in mono
   and a role pill, the menu items, and a red "Sign out" last. Shared by the
   doctor portal and the patient app. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export interface UserMenuItem {
  label: string;
  /** In-app route, or… */
  to?: string;
  /** …an action. */
  onClick?: () => void;
}

export default function UserMenu({
  initials,
  name,
  id,
  role,
  items,
  extra,
  signOutLabel = "Sign out",
  onSignOut,
}: {
  initials: string;
  name: string;
  /** Mono line under the name — username, PMDC number, policy … */
  id: ReactNode;
  role: string;
  items: UserMenuItem[];
  /** Extra block between the items and Sign out (e.g. the demo doctor switcher). */
  extra?: (close: () => void) => ReactNode;
  signOutLabel?: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "block w-full border-b border-[var(--hair)] px-4 py-3 text-start text-[13px] font-semibold !text-[var(--ink)] transition-colors hover:bg-[var(--hair)]";

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        title={`${name} · ${role}`}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink)] text-[11.5px] font-mono font-semibold border border-[var(--sky-300)] transition-shadow hover:shadow-(--shadow-md)"
        style={{ background: "var(--primary)" }}
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+8px)] z-[60000] w-[248px] overflow-hidden rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-menu)"
        >
          <div className="border-b border-[var(--hair)] px-4 py-3">
            <div className="text-[13px] font-semibold text-[var(--ink)]">{name}</div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--mute)]" dir="ltr">
              {id}
            </div>
            <div className="mt-1.5 inline-flex items-center rounded-(--radius-pill) bg-[var(--teal-tint)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]">
              {role}
            </div>
          </div>
          {items.map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to} role="menuitem" onClick={close} className={itemClass}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onClick?.();
                }}
                className={itemClass}
              >
                {item.label}
              </button>
            ),
          )}
          {extra?.(close)}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className="block w-full px-4 py-3 text-start text-[13px] font-semibold text-[var(--red)] transition-colors hover:bg-[var(--red-tint)]"
          >
            {signOutLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
