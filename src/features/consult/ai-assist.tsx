/* AI assist — reads the transcript as it grows and offers a summary, the
   next questions worth asking, and a draft plan + prescription. Everything here is a
   suggestion: the doctor copies it into the notes or ignores it. While the call is
   live it shows itself at work: a listening waveform, each new point typed in, and a
   shimmer where the next one is forming. */

import { useEffect, useState } from "react";
import { CornerDownLeft, ListChecks, MessageCircleQuestion, Pill, Sparkles, Stethoscope } from "lucide-react";
import { AI_DRAFT } from "@/data/seed";

/** Text already typed out once — switching tabs and back doesn't replay it. */
const typed = new Set<string>();
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Types `text` in, a couple of characters a tick, with a caret while it writes. */
function Typed({ text, speed = 16, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(() => (typed.has(text) || reduceMotion() ? text.length : 0));
  useEffect(() => {
    if (n >= text.length) {
      typed.add(text);
      onDone?.();
      return;
    }
    const id = setTimeout(() => setN((x) => Math.min(text.length, x + 2)), speed);
    return () => clearTimeout(id);
  }, [n, text, speed]); // eslint-disable-line react-hooks/exhaustive-deps -- onDone fires once at the end
  return <span className={n < text.length ? "ai-caret" : ""}>{text.slice(0, n)}</span>;
}

export function AiWave({ className = "" }: { className?: string }) {
  return (
    <span className={`ai-wave ${className}`} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

const HEAD = "mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]";

export default function AiAssist({
  heard,
  total,
  live,
  onUseDraft,
  className = "",
  bare,
}: {
  /** Inside a tab: no card chrome or header — the tab already says "AI assist". */
  bare?: boolean;
  /** Transcript lines so far. */
  heard: number;
  /** Lines in a full consult — how far through the summary can be. */
  total: number;
  live: boolean;
  onUseDraft?: () => void;
  className?: string;
}) {
  const progress = Math.min(1, heard / total);
  const summary = heard >= 3 ? AI_DRAFT.summary.slice(0, Math.max(1, Math.ceil(progress * AI_DRAFT.summary.length))) : [];
  const questions = AI_DRAFT.nextQuestions.slice(0, heard >= 6 ? 3 : heard >= 2 ? 2 : 1);
  const draftReady = heard >= Math.ceil(total * 0.7);
  const [planTyped, setPlanTyped] = useState(() => typed.has(AI_DRAFT.notes.plan));
  const thinking = live && !draftReady;
  const status = !live ? "Done" : heard < 3 ? "Listening…" : draftReady ? "Draft ready · still listening" : "Analysing the conversation…";

  return (
    <section className={`a-claims ${bare ? "" : "rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)"} ${className}`}>
      {bare ? null : (
        <header className="flex items-center justify-between gap-2 border-b border-[var(--hair)] px-4 py-3">
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
            <Sparkles size={16} className="text-[var(--accent)]" /> AI assist
          </span>
          <span className="rounded-(--radius-pill) bg-[var(--tint)] px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">
            Suggestions · doctor decides
          </span>
        </header>
      )}
      <div className={`grid gap-4 ${bare ? "" : "px-4 py-3.5"}`}>
        {live ? (
          <div className="overflow-hidden rounded-(--radius-md) border border-[var(--sky-200)] bg-[var(--tint)]">
            <div className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-semibold text-[var(--link)]">
              {draftReady ? <Sparkles size={14} /> : <AiWave />}
              <span className="flex-1">{status}</span>
              <span className="font-mono text-[11px] font-medium text-[var(--mute)]">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-[3px] bg-[var(--sky-200)]">
              <div className="h-full bg-[var(--action)] transition-[width] duration-700 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        ) : null}

        <div>
          <p className={HEAD}>
            <ListChecks size={13} /> Summary
          </p>
          <ul className="grid gap-1 text-[13px] leading-relaxed text-[var(--body)]">
            {summary.map((s) => (
              <li key={s} className="line-in flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" /> <Typed text={s} />
              </li>
            ))}
            {thinking ? (
              <li className="flex items-center gap-2 py-1">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--sky-300)]" />
                <span className="ai-shimmer w-2/3" />
              </li>
            ) : null}
          </ul>
        </div>

        {live ? (
          <div>
            <p className={HEAD}>
              <MessageCircleQuestion size={13} /> Ask next
            </p>
            <ul className="grid gap-1 text-[13px] text-[var(--body)]">
              {questions.map((q) => (
                <li key={q} className="line-in rounded-(--radius-sm) bg-[var(--tint)] px-2.5 py-1.5 text-[var(--accent-ink)]">
                  <Typed text={q} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className={HEAD}>
            <Stethoscope size={13} /> Draft plan
          </p>
          {draftReady ? (
            <div className="line-in ai-glow rounded-(--radius-md) border border-[var(--sky-300)] bg-[var(--white)] px-3.5 py-3 text-[13px] text-[var(--body)]">
              <p className="font-semibold text-[var(--ink)]">
                <Typed text={AI_DRAFT.notes.diagnosis} />
              </p>
              <p className="mt-1">
                <Typed text={AI_DRAFT.notes.plan} speed={10} onDone={() => setPlanTyped(true)} />
              </p>
              {planTyped ? (
                <>
                  <ul className="mt-2 grid gap-1">
                    {AI_DRAFT.rx.map((r, i) => (
                      <li key={r.drug} className="line-in flex items-center gap-2 text-[12.5px]" style={{ animationDelay: `${i * 120}ms` }}>
                        <Pill size={13} className="text-[var(--link)]" />
                        <span className="font-semibold text-[var(--ink)]">{r.drug}</span>
                        <span className="text-[var(--mute)]">
                          · {r.dose} · {r.frequency}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {onUseDraft ? (
                    <button
                      type="button"
                      onClick={onUseDraft}
                      className="line-in btn-royal mt-3 inline-flex items-center gap-1.5 rounded-(--radius-md) px-3.5 py-2 text-[13px] font-semibold text-white"
                    >
                      <CornerDownLeft size={14} /> Copy into notes & prescription
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : thinking ? (
            <div className="grid gap-2 rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-3.5 py-3">
              <span className="ai-shimmer w-1/2" />
              <span className="ai-shimmer w-5/6" />
              <span className="ai-shimmer w-2/3" />
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--faint)]">—</p>
          )}
        </div>
      </div>
    </section>
  );
}
