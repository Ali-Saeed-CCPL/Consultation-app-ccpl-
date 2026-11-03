/* Date range picker — the CCPL calendar (EFU-Unified-PAS-Frontend's PasCalendarPicker):
   a trigger button that opens a popover with a month grid; month and year are
   dropdowns to jump anywhere. Click a day to start, a second day to end (or Apply
   after one click for a single date); Clear goes back to all time. Dates are
   YYYY-MM-DD; both empty means "All time". Restyled on this app's tokens so it
   follows light / dark. */

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const short = (s: string) => {
  const d = parse(s);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

/** "02 Nov 2026", "01 – 30 Nov 2026", "01 Jan – 02 Nov 2026" … */
function rangeLabel(start: string, end: string) {
  if (start === end) return short(start);
  const [s, e] = [parse(start), parse(end)];
  if (s.getFullYear() !== e.getFullYear()) return `${short(start)} – ${short(end)}`;
  const sm = MONTHS[s.getMonth()].slice(0, 3);
  const em = MONTHS[e.getMonth()].slice(0, 3);
  const sd = String(s.getDate()).padStart(2, "0");
  const ed = String(e.getDate()).padStart(2, "0");
  return sm === em ? `${sd} – ${ed} ${sm} ${e.getFullYear()}` : `${sd} ${sm} – ${ed} ${em} ${e.getFullYear()}`;
}

const SELECT =
  "cursor-pointer rounded-(--radius-sm) border border-[var(--line)] bg-[var(--white)] px-2 py-1 text-[12.5px] font-semibold text-[var(--ink)] hover:border-[var(--link)] focus:border-[var(--link)] focus:outline-none";

export default function DateRangePicker({
  start,
  end,
  onChange,
  today = new Date(),
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** "Today" for the presets and the ring in the grid — the clinic's day. */
  today?: Date;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [tmpStart, setTmpStart] = useState(start);
  const [tmpEnd, setTmpEnd] = useState(end);
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState(() => parse(end || start || iso(today)));
  const todayIso = iso(today);

  // Re-seed from the props every time it opens; close on a click outside.
  useEffect(() => {
    if (!open) return;
    setTmpStart(start);
    setTmpEnd(end);
    setPicking(false);
    setHover(null);
    setView(parse(end || start || todayIso));
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- seed once per opening

  const y = view.getFullYear();
  const m = view.getMonth();
  // ponytail: ten years back is plenty for consultation history; widen if older records arrive.
  const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - i);
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const cells = Array.from({ length: Math.ceil((lead + new Date(y, m + 1, 0).getDate()) / 7) * 7 }, (_, i) => new Date(y, m, i - lead + 1));

  const lo = picking && hover && hover < tmpStart ? hover : tmpStart;
  const hi = picking && hover ? (hover > tmpStart ? hover : tmpStart) : tmpEnd;

  const pickDay = (d: string) => {
    if (!picking) {
      setTmpStart(d);
      setTmpEnd(d);
      setPicking(true);
    } else {
      if (d < tmpStart) {
        setTmpEnd(tmpStart);
        setTmpStart(d);
      } else setTmpEnd(d);
      setPicking(false);
    }
  };
  const apply = (s: string, e: string) => {
    onChange(s, e);
    setOpen(false);
  };

  const unset = !start && !end;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex min-w-[230px] items-center gap-2 rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] px-3 py-2 text-[13px] text-[var(--ink)] shadow-(--shadow-xs) hover:border-[var(--link)] focus:border-[var(--link)] focus:shadow-[0_0_0_3px_var(--tint)] focus:outline-none"
      >
        <Calendar size={15} className="flex-shrink-0 text-[var(--link)]" />
        <span className={`flex-1 truncate text-start ${unset ? "text-[var(--mute)]" : "font-semibold"}`}>{unset ? "All time" : rangeLabel(start, end)}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-[var(--mute)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Select date range"
          className="line-in absolute end-0 top-[calc(100%+6px)] z-[60] w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] shadow-[0_20px_50px_rgba(16,40,90,0.18),0_4px_14px_rgba(0,0,0,0.08)]"
        >
          <header className="flex items-center justify-between border-b border-[var(--hair)] bg-[var(--sunken)] px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--ink)]">
              <Calendar size={14} className="text-[var(--link)]" /> Select date range
            </span>
            <span className="font-mono text-[11px] text-[var(--mute)]">{tmpStart ? rangeLabel(lo, hi) : "All time"}</span>
          </header>

          <div>
            <div className="flex flex-col gap-2 px-3.5 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <NavBtn label="Previous month" onClick={() => setView(new Date(y, m - 1, 1))}>
                  <ChevronLeft size={14} />
                </NavBtn>
                <span className="flex gap-1.5">
                  <select aria-label="Month" className={SELECT} value={m} onChange={(e) => setView(new Date(y, Number(e.target.value), 1))}>
                    {MONTHS.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select aria-label="Year" className={SELECT} value={y} onChange={(e) => setView(new Date(Number(e.target.value), m, 1))}>
                    {(years.includes(y) ? years : [y, ...years]).map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </span>
                <NavBtn label="Next month" onClick={() => setView(new Date(y, m + 1, 1))}>
                  <ChevronRight size={14} />
                </NavBtn>
              </div>
              <div className="grid grid-cols-7 text-center font-mono text-[10.5px] font-semibold uppercase text-[var(--mute)]">
                {WEEK.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-[3px]">
                {cells.map((d) => {
                  const k = iso(d);
                  const inMonth = d.getMonth() === m;
                  const edgeStart = tmpStart && k === lo;
                  const edgeEnd = tmpStart && k === hi;
                  const inRange = tmpStart && k > lo && k < hi;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!inMonth}
                      onClick={() => pickDay(k)}
                      onMouseEnter={() => picking && setHover(k)}
                      onMouseLeave={() => picking && setHover(null)}
                      className={`h-[30px] font-mono text-[12px] ${
                        !inMonth
                          ? "cursor-default text-[var(--faint)] opacity-40"
                          : edgeStart || edgeEnd
                            ? `bg-[var(--action)] font-bold text-white ${edgeStart ? "rounded-s-(--radius-sm)" : ""} ${edgeEnd ? "rounded-e-(--radius-sm)" : ""}`
                            : inRange
                              ? "bg-[var(--tint)] text-[var(--link)]"
                              : "rounded-(--radius-sm) text-[var(--ink)] hover:bg-[var(--tint)] hover:text-[var(--link)]"
                      } ${k === todayIso && inMonth ? "shadow-[inset_0_0_0_1.5px_var(--link)]" : ""}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <p className="pt-1 text-center text-[10.5px] text-[var(--mute)]">{picking ? "Click a second date to finish — or Apply for just this day" : "Click a day to start a range"}</p>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hair)] bg-[var(--sunken)] px-4 py-2.5">
            <span className="text-[11px] text-[var(--mute)]">
              Range: <span className="font-mono text-[11.5px] font-semibold text-[var(--ink)]">{tmpStart ? `${short(lo)} → ${short(hi)}` : "All time"}</span>
            </span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={() => apply("", "")}
                className="h-8 rounded-(--radius-md) px-2.5 text-[11.5px] font-semibold text-[var(--mute)] hover:text-[var(--link)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 rounded-(--radius-md) border border-[var(--line)] px-3 text-[11.5px] font-semibold text-[var(--body)] hover:border-[var(--link)] hover:bg-[var(--tint)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => apply(tmpStart, tmpEnd)}
                className="h-8 rounded-(--radius-md) bg-[var(--action)] px-3.5 text-[11.5px] font-semibold text-[var(--color-on-fill)] hover:brightness-110"
              >
                Apply range
              </button>
            </span>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[26px] w-[26px] items-center justify-center rounded-(--radius-sm) border border-[var(--line)] text-[var(--ink)] hover:border-[var(--link)] hover:bg-[var(--tint)] hover:text-[var(--link)]"
    >
      {children}
    </button>
  );
}
