/* Live transcript — Urdu + English with speaker labels, saved to the record.
   Each speaker is a separate audio track, which is what keeps the Urdu-English
   code-switching clean; Urdu lines carry an English gloss underneath. */

import { useEffect, useRef } from "react";
import { Captions } from "lucide-react";
import { fmtDuration } from "@/lib/clinic";
import type { TranscriptLine } from "@/lib/types";

export default function TranscriptPanel({
  lines,
  live,
  startedAt,
  doctorName,
  patientName,
  className = "",
}: {
  lines: TranscriptLine[];
  live: boolean;
  startedAt?: number;
  doctorName: string;
  patientName: string;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  return (
    <section className={`flex min-h-0 flex-col rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--hair)] px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
          <Captions size={16} className="text-[var(--link)]" /> Live transcript
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">Urdu + English</span>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-[var(--red-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-red-ink)]">
              <span className="live-dot" /> Live
            </span>
          ) : (
            <span className="rounded-(--radius-pill) bg-[var(--green-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-green-ink)]">Saved</span>
          )}
        </span>
      </header>
      <div ref={scroller} className="slim-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {lines.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--mute)]">{live ? "Listening…" : "No transcript recorded."}</p>
        ) : (
          lines.map((l) => {
            const doctor = l.speaker === "doctor";
            return (
              <div key={l.id} className="line-in grid grid-cols-[64px_1fr] gap-2.5">
                <div className="pt-0.5">
                  <span
                    className={`block truncate rounded-(--radius-xs) px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${
                      doctor ? "bg-[var(--tint)] text-[var(--link)]" : "bg-[var(--teal-sec-tint,var(--color-teal-sec-tint))] text-[var(--color-teal-sec-ink)]"
                    }`}
                    title={doctor ? doctorName : patientName}
                  >
                    {doctor ? "Doctor" : "Patient"}
                  </span>
                  {startedAt ? <span className="mt-1 block text-center font-mono text-[10.5px] text-[var(--faint)]">{fmtDuration(l.at - startedAt)}</span> : null}
                </div>
                <div className="min-w-0">
                  {l.lang === "ur" ? (
                    <p lang="ur" dir="rtl" className="text-[15px] text-[var(--ink)]">
                      {l.text}
                    </p>
                  ) : (
                    <p className="text-[13.5px] leading-relaxed text-[var(--ink)]">{l.text}</p>
                  )}
                  {l.gloss ? <p className="mt-0.5 text-[12px] italic leading-snug text-[var(--mute)]">{l.gloss}</p> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
