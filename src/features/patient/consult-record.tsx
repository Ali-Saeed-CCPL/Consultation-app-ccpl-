/* The record of one consultation for the patient, as two tabs on the records
   page: what was chosen at each step (who for, consent, symptoms and the
   red-flag check), and a short summary of the call. The transcript itself is
   kept on the record but never shown to the patient. */

import { ClipboardList, MessagesSquare } from "lucide-react";
import { AI_DRAFT, DURATIONS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtDuration, fmtTime } from "@/lib/clinic";
import { pick, useT, type StringKey } from "@/lib/i18n";
import type { Consultation, Doctor } from "@/lib/types";

export function IntakeRecord({ consult }: { consult: Consultation }) {
  const { t, lang } = useT();
  const s = consult.symptoms;
  const m = consult.member;
  const duration = DURATIONS.find((d) => d.key === s?.duration);
  const flags = (s?.redFlags ?? []).map((k) => RED_FLAGS.find((f) => f.key === k)).filter(Boolean);
  const severity = s?.severity ?? 0;

  const rows: { k: string; v: React.ReactNode }[] = [
    { k: t("patientLabel"), v: `${lang === "ur" ? m.nameUr : m.name} · ${t(`rel_${m.relation}` as StringKey)} · ${t("years", { n: m.age })}` },
    { k: t("recMember"), v: <span className="font-mono text-[12px]" dir="ltr">{m.mrn}</span> },
    { k: t("recConsent"), v: consult.consentAt ? `${t("j_consentNote")} · ${fmtTime(consult.consentAt)}` : "—" },
    { k: t("recLanguage"), v: consult.lang === "ur" ? "اردو" : "English" },
    { k: t("complaintLabel"), v: complaintText(s, lang) || "—" },
    { k: t("recDuration"), v: duration ? pick(duration, lang) : "—" },
    {
      k: t("qSeverityShort"),
      v: (
        <span className="inline-flex items-center gap-2.5">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--sunken)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${severity * 10}%`, background: severity >= 7 ? "var(--red)" : severity >= 4 ? "var(--amber)" : "var(--green)" }}
            />
          </span>
          <span className="font-mono text-[12px]" dir="ltr">
            {severity}/10
          </span>
        </span>
      ),
    },
    { k: t("recWords"), v: s?.details ? `“${s.details}”` : "—" },
    { k: t("recRedFlags"), v: flags.length ? flags.map((f) => pick(f!, lang)).join(" · ") : t("recNoRedFlags") },
  ];

  return (
    <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--hair)] px-5 py-3.5">
        <h2 className="section-title flex items-center gap-2">
          <ClipboardList size={16} className="text-[var(--link)]" /> {t("recIntakeTitle")}
        </h2>
        <span className="font-mono text-[11.5px] text-[var(--mute)]" dir="ltr">
          {fmtDateTime(consult.createdAt)}
        </span>
      </header>
      <dl className="px-5 py-1.5 text-[13px]">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[150px_1fr] gap-3 border-b border-[var(--hair)] py-2.5 last:border-b-0">
            <dt className="text-[var(--mute)]">{r.k}</dt>
            <dd className="min-w-0 text-[var(--ink)]">{r.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CallSummary({ consult, doctor }: { consult: Consultation; doctor?: Doctor }) {
  const { t } = useT();
  // The scripted demo call has AI assist's summary; otherwise the doctor's notes stand in.
  const summary = consult.scripted
    ? AI_DRAFT.summary
    : [consult.notes.diagnosis, consult.notes.plan, consult.notes.followUp].filter(Boolean);
  const doctorName = doctor?.name ?? t("doctorLabel");

  return (
    <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hair)] px-5 py-3.5">
        <h2 className="section-title flex items-center gap-2">
          <MessagesSquare size={16} className="text-[var(--link)]" /> {t("recCallTitle")}
        </h2>
        <span className="font-mono text-[11.5px] text-[var(--mute)]" dir="ltr">
          {doctorName}
          {consult.callStartedAt ? ` · ${fmtTime(consult.callStartedAt)}` : ""}
          {consult.callStartedAt && consult.callEndedAt ? ` · ${fmtDuration(consult.callEndedAt - consult.callStartedAt)}` : ""}
        </span>
      </header>
      <div className="grid gap-4 px-5 py-4">
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">{t("recSummary")}</p>
          {summary.length ? (
            <ul className="grid gap-1.5 text-[13.5px] leading-relaxed text-[var(--body)]" dir="ltr">
              {summary.map((s) => (
                <li key={s} className="flex gap-2.5">
                  <span className="mt-[8px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--link)]" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--mute)]">{t("recNoSummary")}</p>
          )}
        </div>
        {/* The transcript stays on the record for the doctor and the system; patients get the summary only. */}
      </div>
    </section>
  );
}
