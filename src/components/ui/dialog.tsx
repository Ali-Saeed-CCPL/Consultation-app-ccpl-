/* Modal dialog shared by every portal — the browser's own <dialog> (focus trap,
   Esc to close, backdrop) in the app's card styling: a title row, the body, and
   a footer of actions on the sunken band. */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Max width in px (the body scrolls when taller than the screen). */
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      style={{ width: `min(${width}px, calc(100vw - 32px))` }}
      className="m-auto max-h-[calc(100vh-48px)] overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-0 text-[var(--ink)] shadow-(--shadow-lg) backdrop:bg-[var(--color-scrim)]"
    >
      {open ? (
        <>
          <header className="flex items-center justify-between gap-3 border-b border-[var(--hair)] px-5 py-4">
            <h2 className="section-title !text-[16px]">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-[var(--mute)] hover:bg-[var(--hair)]">
              <X size={16} />
            </button>
          </header>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-5 py-5 slim-scrollbar">{children}</div>
          {footer ? <footer className="flex justify-end gap-2 border-t border-[var(--hair)] bg-[var(--sunken)] px-5 py-3.5">{footer}</footer> : null}
        </>
      ) : null}
    </dialog>
  );
}
