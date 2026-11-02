/* AI assist — reads the transcript as it grows and offers a summary, the
   next questions worth asking, and a draft plan + prescription. Everything here is a
   suggestion: the doctor copies it into the notes or ignores it. Uses the
   real teal section accent, as AI assessment does in the ERP. */

import { CornerDownLeft, ListChecks, MessageCircleQuestion, Sparkles } from "lucide-react";
import { AI_DRAFT } from "@/data/seed";

export default function AiAssist({
  heard,
  total,
  live,
  onUseDraft,
  className = "",
}: {
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
  const draftReady = heard >= Math.ceil(total * 0.7);

  return (
    <section className={`a-claims rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-[var(--hair)] px-4 py-3">
        <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
          <Sparkles size={16} className="text-[var(--accent)]" /> AI assist
        </span>
        <span className="rounded-(--radius-pill) bg-[var(--tint)] px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-ink)]">
          Suggestions · doctor decides
        </span>
      </header>
      <div className="grid gap-4 px-4 py-3.5">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">
            <ListChecks size={13} /> Summary
          </p>
          {summary.length ? (
            <ul className="grid gap-1 text-[13px] leading-relaxed text-[var(--body)]">
              {summary.map((s) => (
                <li key={s} className="line-in flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-[var(--faint)]">Builds as the conversation goes…</p>
          )}
        </div>

        {live ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">
              <MessageCircleQuestion size={13} /> Ask next
            </p>
            <ul className="grid gap-1 text-[13px] text-[var(--body)]">
              {AI_DRAFT.nextQuestions.slice(0, heard >= 6 ? 3 : heard >= 2 ? 2 : 1).map((q) => (
                <li key={q} className="rounded-(--radius-sm) bg-[var(--tint)] px-2.5 py-1.5 text-[var(--accent-ink)]">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Draft plan</p>
          {draftReady ? (
            <div className="rounded-(--radius-md) border border-dashed border-[var(--accent)] px-3 py-2.5 text-[13px] text-[var(--body)]">
              <p className="font-semibold text-[var(--ink)]">{AI_DRAFT.notes.diagnosis}</p>
              <p className="mt-1">{AI_DRAFT.notes.plan}</p>
              <p className="mt-1.5 text-[12.5px] text-[var(--mute)]">Prescription: {AI_DRAFT.rx.map((r) => r.drug).join(" · ")}</p>
              {onUseDraft ? (
                <button
                  type="button"
                  onClick={onUseDraft}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-(--radius-md) border border-[var(--accent)] bg-[var(--tint)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--accent-ink)] hover:brightness-95"
                >
                  <CornerDownLeft size={13} /> Copy into notes & prescription
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--faint)]">Appears once there's enough history.</p>
          )}
        </div>
      </div>
    </section>
  );
}
