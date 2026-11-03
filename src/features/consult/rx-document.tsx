/* The prescription as issued — laid out like a clinic's prescription slip:
   letterhead, the prescribing doctor, the patient, the diagnosis, the ℞ list,
   advice and follow-up, and the doctor's sign-off. The patient sees it only
   once the doctor approves; before that the doctor sees the exact version they
   are about to sign. Clinical content stays English, as Pakistani prescriptions
   are written; the labels follow the reader's language. The layout follows the
   slip's own width (@container): a slim slip in a side panel, wider on a page. */

import { BadgeCheck, CalendarClock, Info } from "lucide-react";
import { BRAND, LOGO_SRC } from "@/config/app.constants";
import { fmtDateTime } from "@/lib/clinic";
import type { useT } from "@/lib/i18n";
import { printElement } from "@/lib/print";
import type { Consultation, Doctor } from "@/lib/types";

/** The labels in the reader's language. */
export const rxLabels = (t: ReturnType<typeof useT>["t"]): RxLabels => ({
  diagnosis: t("diagnosis"),
  prescription: t("prescriptionLabel"),
  advice: t("advice"),
  followUp: t("followUp"),
  prescribedBy: t("prescribedBy"),
  draftedWith: t("draftedWith"),
  aiChecked: t("aiChecked"),
});

/** The prescription alone, light, in a print window — "Save as PDF" there gives the file. */
export const downloadRx = (consultId: string) => printElement(`rx-${consultId}`, `${consultId}-prescription`);

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

const LABEL = "font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--mute)]";

export default function RxDocument({
  consult,
  prescriber,
  labels = RX_LABELS_EN,
}: {
  consult: Consultation;
  prescriber?: Doctor;
  labels?: RxLabels;
}) {
  const doctor = prescriber;
  const issued = fmtDateTime(consult.approvedAt ?? consult.callEndedAt ?? consult.createdAt);

  return (
    <article
      id={`rx-${consult.id}`}
      dir="ltr"
      className="@container relative overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] shadow-(--shadow-sm)"
    >
      <div className="h-1 bg-gradient-to-r from-[var(--link)] to-[var(--sky-300)]" />

      {/* ── Letterhead ── */}
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 @3xl:px-8 @3xl:pt-5 @3xl:pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={LOGO_SRC} alt="" className="h-8 w-auto flex-shrink-0 @3xl:h-10" />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold leading-tight @3xl:text-[17px]">{BRAND}</div>
            <div className="text-[11.5px] text-[var(--mute)] @3xl:text-[12.5px]">e-Prescription</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-end">
          <span className="inline-flex items-center gap-1 rounded-(--radius-pill) bg-[var(--green-tint)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-green-ink)]">
            <BadgeCheck size={12} /> Approved
          </span>
          <div className="mt-1 font-mono text-[10.5px] text-[var(--mute)]">
            {consult.id} · v{consult.rxVersion}
          </div>
        </div>
      </header>

      {/* ── Doctor & patient ── */}
      <div className="mx-5 grid gap-2.5 rounded-(--radius-md) bg-[var(--sunken)] px-3.5 py-3 text-[12.5px] @3xl:mx-8 @3xl:gap-3.5 @3xl:px-5 @3xl:py-4 @3xl:text-[14px] @5xl:grid-cols-[minmax(0,1fr)_1px_minmax(0,2.2fr)] @5xl:items-center @5xl:gap-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold @3xl:text-[16px]">{doctor?.name ?? "—"}</div>
            <div className="text-[11.5px] text-[var(--mute)]">General practitioner{doctor ? ` · ${doctor.pmdc}` : ""}</div>
          </div>
          <div className="flex-shrink-0 text-end text-[11.5px] text-[var(--mute)]">{issued}</div>
        </div>
        <div className="h-px bg-[var(--line)] @5xl:h-full" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 @md:grid-cols-4">
          <Meta k="Patient" v={consult.member.name} strong />
          <Meta k="Age / sex" v={`${consult.member.age} · ${consult.member.gender === "M" ? "Male" : "Female"}`} />
          <Meta k="MRN" v={consult.member.mrn} mono />
          <Meta k="Consulted" v={consult.callStartedAt ? fmtDateTime(consult.callStartedAt) : "—"} />
        </dl>
      </div>

      <div className="grid gap-4 px-5 pt-4 pb-5 @3xl:gap-4 @3xl:px-8 @3xl:pt-4 @3xl:pb-4">
        {/* ── Diagnosis ── */}
        <section>
          <p className={LABEL}>{labels.diagnosis}</p>
          <p className="mt-1 text-[14.5px] font-semibold leading-snug @3xl:text-[17px]">{consult.notes.diagnosis || "—"}</p>
        </section>

        {/* ── ℞ ── */}
        <section>
          <div className="flex items-center gap-2">
            <span className="font-serif text-[24px] font-semibold italic leading-none text-[var(--link)] @3xl:text-[30px]" aria-hidden>
              ℞
            </span>
            <p className={LABEL}>
              {labels.prescription} · {consult.rx.length}
            </p>
          </div>
          {consult.rx.length ? (
            <ol className="mt-2 grid gap-2 @3xl:grid-cols-2 @3xl:gap-3 @6xl:grid-cols-3">
              {consult.rx.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[22px_1fr] gap-2.5 rounded-(--radius-md) border border-[var(--line)] px-3 py-2.5 @3xl:grid-cols-[28px_1fr] @3xl:gap-3 @3xl:px-4 @3xl:py-3">
                  <span className="mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--tint)] font-mono text-[11px] font-semibold text-[var(--link)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold leading-snug @3xl:text-[15.5px]">{r.drug}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[r.dose, r.frequency, r.duration].filter(Boolean).map((v) => (
                        <span key={v} className="rounded-(--radius-sm) bg-[var(--sunken)] px-2 py-0.5 text-[12px] text-[var(--body)] @3xl:text-[13px]">
                          {v}
                        </span>
                      ))}
                    </div>
                    {r.instructions ? (
                      <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-[var(--mute)] @3xl:mt-2 @3xl:text-[13.5px]">
                        <Info size={12} className="mt-0.5 flex-shrink-0" /> {r.instructions}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1.5 text-[13px] text-[var(--mute)]">No medicines — advice only.</p>
          )}
        </section>

        {/* ── Advice & follow-up ── */}
        <div className="grid gap-2 @md:grid-cols-2">
          <Note label={labels.advice}>{consult.notes.plan || "—"}</Note>
          <Note label={labels.followUp} icon={<CalendarClock size={13} />}>
            {consult.notes.followUp || "—"}
          </Note>
        </div>
      </div>

      {/* ── Sign-off ── */}
      <footer className="flex items-end justify-between gap-4 border-t border-dashed border-[var(--line)] px-5 py-4 @3xl:px-8 @3xl:py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[var(--mute)]">{labels.prescribedBy}</p>
          {doctor ? (
            <>
              <p className="mt-1 truncate font-serif text-[18px] italic leading-tight text-[var(--ink)] @3xl:text-[19px]">{doctor.name}</p>
              <p className="mt-0.5 border-t border-[var(--line)] pt-0.5 font-mono text-[10.5px] text-[var(--mute)]">Digitally signed · {doctor.pmdc}</p>
            </>
          ) : (
            <p className="mt-1 text-[13px] italic text-[var(--faint)]">—</p>
          )}
        </div>
        <div className="flex-shrink-0 text-end text-[11px] leading-snug text-[var(--mute)]">
          {labels.draftedWith}
          <br />
          <span className="text-[var(--body)]">{labels.aiChecked}</span>
        </div>
      </footer>

    </article>
  );
}

function Meta({ k, v, mono, strong }: { k: string; v: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] text-[var(--mute)]">{k}</dt>
      <dd className={`truncate ${strong ? "font-semibold" : "font-medium"} ${mono ? "font-mono text-[11.5px]" : ""}`}>{v}</dd>
    </div>
  );
}

function Note({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-(--radius-md) border border-[var(--hair)] bg-[var(--sunken)] px-3 py-2.5 @3xl:px-5 @3xl:py-4">
      <p className={`${LABEL} flex items-center gap-1.5`}>
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--body)] @3xl:mt-1.5 @3xl:text-[14.5px]">{children}</p>
    </section>
  );
}
