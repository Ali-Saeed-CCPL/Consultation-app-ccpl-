/* Consultation progress — the signed-in doctor's day at a glance: how far today's
   calls have got (answered → prescription released → call ended), and when they
   came in, one bar per clinic hour. Ringing calls aren't here: they take the
   dashboard's blue card and the incoming-call prompt. */

import { Link } from "@tanstack/react-router";
import Section from "@/components/ui/section";
import { CLINIC_HOURS, karachiHour } from "@/lib/clinic";
import type { Consultation } from "@/lib/types";

/** Clinic opening hours as bar slots: 9 → "9–10", … 17 → "5–6". */
const HOURS = Array.from({ length: CLINIC_HOURS.close - CLINIC_HOURS.open }, (_, i) => CLINIC_HOURS.open + i);
const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });
const h12 = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? " AM" : " PM"}`;

export default function ConsultProgress({ consultations, doctorId, now }: { consultations: Consultation[]; doctorId: string; now: number }) {
  const today = dayOf(now);
  const mine = consultations.filter((c) => c.prescriberId === doctorId && c.callStartedAt && dayOf(c.callStartedAt) === today);
  const answered = mine.length;
  const stages = [
    { label: "Answered", n: answered },
    { label: "Prescription released", n: mine.filter((c) => c.approvedAt).length },
    { label: "Call ended", n: mine.filter((c) => c.callEndedAt).length },
  ];

  const perHour = HOURS.map((h) => ({ h, n: mine.filter((c) => karachiHour(c.callStartedAt!) === h).length }));
  const peak = Math.max(1, ...perHour.map((b) => b.n));
  const peakHour = perHour.find((b) => b.n === peak && b.n > 0)?.h;
  const nowHour = karachiHour(now);

  return (
    <Section
      title="Consultation progress"
      sub={`Today · ${answered} call${answered === 1 ? "" : "s"} answered`}
      action={
        <Link to="/portal/consultations" search={{ view: "history" }} className="text-[13px] font-semibold">
          History →
        </Link>
      }
    >
      {/* Where today's calls have got to — each bar is a share of the calls answered. */}
      <ol className="grid gap-3 sm:grid-cols-3">
        {stages.map((s, i) => (
          <li key={s.label} className="rounded-(--radius-md) border border-[var(--hair)] bg-[var(--sunken)] px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--body)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--white)] font-mono text-[10.5px] font-semibold text-[var(--link)]">{i + 1}</span>
                {s.label}
              </span>
              <span className="font-mono text-[18px] font-bold text-[var(--ink)]">{s.n}</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full bg-[var(--action)] transition-[width] duration-500" style={{ width: answered ? `${(s.n / answered) * 100}%` : "0%" }} />
            </div>
          </li>
        ))}
      </ol>

      {/* When they came in — one bar per clinic hour; hover a bar for its count. */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Calls by hour</p>
        <div className="relative">
          <div className="flex h-[132px] items-end gap-[2px] border-b border-[var(--line)]" role="list" aria-label="Calls answered per hour today">
            {perHour.map((b) => {
              const label = `${h12(b.h)}–${h12(b.h + 1)}: ${b.n} call${b.n === 1 ? "" : "s"}`;
              return (
                <div key={b.h} role="listitem" aria-label={label} className="group relative flex h-full flex-1 items-end justify-center">
                  {/* Hit target is the whole column, bigger than the bar. */}
                  <span
                    className={`w-full max-w-[34px] rounded-t-[4px] ${b.n ? "bg-[var(--action)] group-hover:bg-[var(--color-action-hover)]" : "bg-[var(--line)]"}`}
                    style={{ height: b.n ? `${Math.max(6, (b.n / peak) * 100)}%` : "2px" }}
                  />
                  {b.h === peakHour ? (
                    <span className="absolute font-mono text-[11px] font-semibold text-[var(--ink)]" style={{ bottom: `calc(${(b.n / peak) * 100}% + 4px)` }}>
                      {b.n}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-(--radius-sm) bg-[var(--ink)] px-2 py-1 text-[11.5px] font-medium text-[var(--white)] shadow-(--shadow-md) group-hover:block">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          {answered === 0 ? <p className="absolute inset-x-0 top-10 text-center text-[13px] text-[var(--mute)]">No calls answered yet today.</p> : null}
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {perHour.map((b) => (
            <span key={b.h} className={`flex-1 text-center font-mono text-[10.5px] ${b.h === nowHour ? "font-bold text-[var(--link)]" : "text-[var(--mute)]"}`}>
              {h12(b.h).replace(" ", "").toLowerCase()}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
