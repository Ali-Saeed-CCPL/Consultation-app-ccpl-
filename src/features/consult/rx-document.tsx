/* The prescription as issued — diagnosis, advice, medicines, and the doctor
   who approved it. The patient sees it only once the doctor approves; before
   that the doctor sees the exact version they are about to sign. Clinical content stays English, as Pakistani
   prescriptions are written; the labels follow the reader's language. */

import { BRAND, LOGO_SRC } from "@/config/app.constants";
import { fmtDateTime } from "@/lib/clinic";
import type { Consultation, Doctor } from "@/lib/types";

export interface RxLabels {
  diagnosis: string;
  prescription: string;
  advice: string;
  followUp: string;
  prescribedBy: string;
  draftedWith: string;
  aiChecked: string;
}

export const RX_LABELS_EN: RxLabels = {
  diagnosis: "Diagnosis",
  prescription: "Prescription",
  advice: "Advice",
  followUp: "Follow-up",
  prescribedBy: "Prescribed & approved by",
  draftedWith: "Drafted with",
  aiChecked: "AI assist, checked by the doctor",
};

export default function RxDocument({
  consult,
  prescriber,
  labels = RX_LABELS_EN,
  draft = false,
}: {
  consult: Consultation;
  prescriber?: Doctor;
  labels?: RxLabels;
  /** Watermarks an unapproved version. */
  draft?: boolean;
}) {
  return (
    <article className="relative overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--hair)] px-5 py-3.5" dir="ltr">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_SRC} alt="" className="h-7 w-auto" />
          <div>
            <div className="text-[13.5px] font-semibold text-[var(--ink)]">{BRAND} · e-Prescription</div>
            <div className="font-mono text-[11px] text-[var(--mute)]">
              {consult.id} · v{consult.rxVersion} · {fmtDateTime(consult.approvedAt ?? consult.callEndedAt ?? consult.createdAt)}
            </div>
          </div>
        </div>
        {draft ? (
          <span className="rounded-(--radius-pill) bg-[var(--amber-tint)] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--amber-ink)]">
            Not yet approved
          </span>
        ) : (
          <span className="rounded-(--radius-pill) bg-[var(--green-tint)] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-green-ink)]">
            Approved
          </span>
        )}
      </header>

      <div className="grid gap-4 px-5 py-4" dir="ltr">
        <div className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
          <Meta k="Patient" v={consult.member.name} />
          <Meta k="Age / sex" v={`${consult.member.age} · ${consult.member.gender}`} />
          <Meta k="MRN" v={consult.member.mrn} mono />
          <Meta k="Consulted" v={consult.callStartedAt ? fmtDateTime(consult.callStartedAt) : "—"} />
        </div>

        <Block label={labels.diagnosis}>{consult.notes.diagnosis || "—"}</Block>

        <div>
          <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">{labels.prescription}</div>
          {consult.rx.length ? (
            <ol className="divide-y divide-[var(--hair)] rounded-(--radius-md) border border-[var(--hair)]">
              {consult.rx.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[22px_1fr] gap-2 px-3 py-2.5">
                  <span className="font-mono text-[12px] text-[var(--faint)]">{i + 1}.</span>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--ink)]">{r.drug}</div>
                    <div className="text-[12.5px] text-[var(--body)]">
                      {[r.dose, r.frequency, r.duration].filter(Boolean).join(" · ")}
                    </div>
                    {r.instructions ? <div className="mt-0.5 text-[12px] text-[var(--mute)]">{r.instructions}</div> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-[var(--mute)]">No medicines — advice only.</p>
          )}
        </div>

        <Block label={labels.advice}>{consult.notes.plan || "—"}</Block>
        <Block label={labels.followUp}>{consult.notes.followUp || "—"}</Block>

        <div className="grid gap-3 border-t border-[var(--hair)] pt-3 sm:grid-cols-2">
          <Signer label={labels.prescribedBy} doctor={draft ? undefined : prescriber} pending={draft} />
          <div>
            <div className="text-[11px] text-[var(--mute)]">{labels.draftedWith}</div>
            <div className="text-[13px] text-[var(--ink)]">{labels.aiChecked}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--mute)]">{k}</div>
      <div className={`truncate text-[var(--ink)] font-medium ${mono ? "font-mono text-[12px]" : ""}`}>{v}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">{label}</div>
      <p className="text-[13.5px] leading-relaxed text-[var(--ink)]">{children}</p>
    </div>
  );
}

function Signer({ label, doctor, pending }: { label: string; doctor?: Doctor; pending?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-[var(--mute)]">{label}</div>
      {doctor ? (
        <>
          <div className="text-[13.5px] font-semibold text-[var(--ink)]">{doctor.name}</div>
          <div className="font-mono text-[11px] text-[var(--mute)]">{doctor.pmdc}</div>
        </>
      ) : (
        <div className="text-[13px] italic text-[var(--faint)]">{pending ? "Awaiting the doctor's approval" : "—"}</div>
      )}
    </div>
  );
}
