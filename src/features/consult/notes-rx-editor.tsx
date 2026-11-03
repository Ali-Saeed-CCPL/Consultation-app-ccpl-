/* Notes & prescription draft — diagnosis, plan, follow-up and the medicines. Every
   edit saves to the consultation straight away (a draft, invisible to the
   patient until the consulting doctor approves it). */

import { Plus, Trash2 } from "lucide-react";
import type { ClinicalNotes, RxItem } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 9);
export const emptyRxItem = (): RxItem => ({ id: uid(), drug: "", dose: "", frequency: "", duration: "", instructions: "" });

/** What's missing before the doctor can approve and release the draft. */
export function draftProblems(notes: ClinicalNotes, rx: RxItem[]): string[] {
  const problems: string[] = [];
  if (!notes.diagnosis.trim()) problems.push("Add a diagnosis");
  if (!notes.plan.trim()) problems.push("Add the plan / advice");
  if (rx.some((r) => !r.drug.trim() || !r.frequency.trim())) problems.push("Every medicine needs a name and frequency");
  return problems;
}

export default function NotesRxEditor({
  notes,
  rx,
  onChange,
  disabled,
}: {
  notes: ClinicalNotes;
  rx: RxItem[];
  onChange: (notes: ClinicalNotes, rx: RxItem[]) => void;
  disabled?: boolean;
}) {
  const setNote = (k: keyof ClinicalNotes, v: string) => onChange({ ...notes, [k]: v }, rx);
  const setItem = (id: string, k: keyof RxItem, v: string) => onChange(notes, rx.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">Diagnosis *</span>
          <input className="field-input" value={notes.diagnosis} disabled={disabled} onChange={(e) => setNote("diagnosis", e.target.value)} placeholder="e.g. Acute viral pharyngitis (J02.9)" />
        </label>
        <label>
          <span className="field-label">Plan / advice *</span>
          <textarea className="field-input min-h-[72px] resize-y" value={notes.plan} disabled={disabled} onChange={(e) => setNote("plan", e.target.value)} />
        </label>
        <label>
          <span className="field-label">Follow-up</span>
          <textarea className="field-input min-h-[72px] resize-y" value={notes.followUp} disabled={disabled} onChange={(e) => setNote("followUp", e.target.value)} />
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Prescription · {rx.length} item{rx.length === 1 ? "" : "s"}</span>
          {!disabled ? (
            <button type="button" onClick={() => onChange(notes, [...rx, emptyRxItem()])} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--link)]">
              <Plus size={14} /> Add medicine
            </button>
          ) : null}
        </div>
        {rx.length === 0 ? (
          <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-3 py-4 text-center text-[12.5px] text-[var(--mute)]">No medicines — advice only.</p>
        ) : (
          <div className="overflow-hidden rounded-(--radius-md) border border-[var(--line)]">
            {/* Column names once, like a prescription pad — not repeated as placeholders in every row. */}
            <div className="hidden grid-cols-[20px_1fr_32px] gap-2 bg-[var(--sunken)] px-2.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)] sm:grid">
              <span />
              <span className="grid grid-cols-[2fr_1fr_1.4fr_1fr] gap-2">
                <span>Medicine</span>
                <span>Dose</span>
                <span>Frequency</span>
                <span>Duration</span>
              </span>
            </div>
            <div className="divide-y divide-[var(--hair)]">
            {rx.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[20px_1fr_32px] items-start gap-2 px-2.5 py-2">
                <span className="pt-2 font-mono text-[12px] text-[var(--faint)]">{i + 1}.</span>
                <div className="grid gap-1.5 sm:grid-cols-[2fr_1fr_1.4fr_1fr]">
                  <input className="field-input py-1.5 text-[13px] font-semibold" placeholder="Medicine & strength" value={r.drug} disabled={disabled} onChange={(e) => setItem(r.id, "drug", e.target.value)} />
                  <input className="field-input py-1.5 text-[13px]" placeholder="Dose" value={r.dose} disabled={disabled} onChange={(e) => setItem(r.id, "dose", e.target.value)} />
                  <input className="field-input py-1.5 text-[13px]" placeholder="Frequency" value={r.frequency} disabled={disabled} onChange={(e) => setItem(r.id, "frequency", e.target.value)} />
                  <input className="field-input py-1.5 text-[13px]" placeholder="Duration" value={r.duration} disabled={disabled} onChange={(e) => setItem(r.id, "duration", e.target.value)} />
                  <input
                    className="field-input border-transparent bg-transparent px-1 py-1 text-[12.5px] text-[var(--body)] shadow-none sm:col-span-4"
                    placeholder="+ Instructions (optional)"
                    value={r.instructions}
                    disabled={disabled}
                    onChange={(e) => setItem(r.id, "instructions", e.target.value)}
                  />
                </div>
                {!disabled ? (
                  <button
                    type="button"
                    aria-label={`Remove ${r.drug || "medicine"}`}
                    onClick={() => onChange(notes, rx.filter((x) => x.id !== r.id))}
                    className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-(--radius-md) text-[var(--mute)] hover:bg-[var(--red-tint)] hover:text-[var(--red)]"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
