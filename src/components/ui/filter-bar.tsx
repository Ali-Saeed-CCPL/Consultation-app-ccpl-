/* Filter bar for list pages — one row of labelled controls above a table:
   search, selects and segmented toggles, with Reset once anything's set.
   Used by the admin's consultation records and doctors lists. Every control is
   the same height (36px) with the same type, border and corners, so a row of
   them lines up; the date-range picker's trigger matches. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, RotateCcw, Search } from "lucide-react";

export function FilterBar({ children, onReset, active }: { children: ReactNode; onReset?: () => void; active?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3 shadow-(--shadow-sm)">
      {children}
      {onReset && active ? (
        <button
          type="button"
          onClick={onReset}
          className="ms-auto inline-flex h-9 items-center gap-1.5 self-end rounded-(--radius-md) px-2.5 text-[12px] font-semibold text-[var(--link)] hover:bg-[var(--tint)]"
        >
          <RotateCcw size={13} /> Reset filters
        </button>
      ) : null}
    </div>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--mute)]">{label}</span>
      {children}
    </div>
  );
}

export function SearchFilter({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-[240px]">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] pl-8 pr-3 text-[12.5px] font-semibold text-[var(--ink)] placeholder:font-normal placeholder:text-[var(--mute)] focus:border-[var(--link)]"
      />
    </div>
  );
}

export function SelectFilter<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`h-9 min-w-[160px] rounded-(--radius-md) border bg-[var(--white)] px-3 text-[12.5px] font-semibold focus:border-[var(--link)] ${
        value === options[0]?.key ? "border-[var(--border-input)] text-[var(--ink)]" : "border-[var(--link)] text-[var(--link)]"
      }`}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SegmentedFilter<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <div className="inline-flex h-9 rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] p-0.5 text-[12.5px] font-semibold">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-[6px] px-3 ${value === o.key ? "bg-[var(--link)] text-white" : "text-[var(--mute)] hover:text-[var(--ink)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A list-of-values dropdown with checkboxes: pick any number of options, with
    search, Select all and a minimum of one kept. The button reads "All doctors",
    the one name picked, or "2 of 5 doctors". */
export function MultiSelectFilter({
  options,
  selected,
  onChange,
  noun,
}: {
  options: { key: string; label: string; color?: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
  /** Plural, for the button: "doctors". */
  noun: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const all = selected.length === options.length;
  const label = all ? `All ${noun}` : selected.length === 1 ? (options.find((o) => o.key === selected[0])?.label ?? "1") : `${selected.length} of ${options.length} ${noun}`;
  const needle = q.trim().toLowerCase();
  const visible = options.filter((o) => !needle || o.label.toLowerCase().includes(needle));
  const toggle = (key: string) => {
    const on = selected.includes(key);
    if (on && selected.length === 1) return; // keep at least one
    onChange(on ? selected.filter((k) => k !== key) : options.map((o) => o.key).filter((k) => k === key || selected.includes(k)));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex h-9 min-w-[190px] items-center justify-between gap-2 rounded-(--radius-md) border bg-[var(--white)] px-3 text-[12.5px] font-semibold ${
          all ? "border-[var(--border-input)] text-[var(--ink)]" : "border-[var(--link)] text-[var(--link)]"
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {!all ? (
            <span className="flex -space-x-1">
              {options
                .filter((o) => selected.includes(o.key))
                .slice(0, 3)
                .map((o) => (
                  <span key={o.key} className="h-2.5 w-2.5 rounded-full ring-2 ring-[var(--white)]" style={{ background: o.color }} />
                ))}
            </span>
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-[260px] overflow-hidden rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-menu)"
        >
          {options.length > 6 ? (
            <div className="border-b border-[var(--hair)] p-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                placeholder={`Search ${noun}…`}
                className="h-8 w-full rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] px-2.5 text-[12.5px] text-[var(--ink)] placeholder:text-[var(--mute)] focus:border-[var(--link)]"
              />
            </div>
          ) : null}
          <div className="flex items-center justify-between border-b border-[var(--hair)] px-3 py-2 text-[12px]">
            <span className="text-[var(--mute)]">
              {selected.length} of {options.length} selected
            </span>
            <button type="button" disabled={all} onClick={() => onChange(options.map((o) => o.key))} className="font-semibold text-[var(--link)] hover:underline disabled:text-[var(--faint)] disabled:no-underline">
              Select all
            </button>
          </div>
          <ul className="max-h-[260px] overflow-y-auto py-1">
            {visible.map((o) => {
              const on = selected.includes(o.key);
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => toggle(o.key)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-[13px] text-[var(--ink)] hover:bg-[var(--sunken)]"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border ${
                        on ? "border-[var(--link)] bg-[var(--link)] text-white" : "border-[var(--border-input)] bg-[var(--white)]"
                      }`}
                    >
                      {on ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    {o.color ? <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: o.color }} /> : null}
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 ? <li className="px-3 py-3 text-[12.5px] text-[var(--mute)]">No matches.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
