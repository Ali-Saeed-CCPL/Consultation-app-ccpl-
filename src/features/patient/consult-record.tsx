/* The record of one consultation for the patient — what was chosen at each
   step (who for, consent, symptoms and the red-flag check) and
   the conversation with the doctor: a short summary and the full transcript,
   with English renderings of Urdu lines. Shown under the prescription, or on
   its own while the doctor is still approving it. */

import { useState } from "react";
import { ChevronDown, ClipboardList, MessagesSquare } from "lucide-react";
import { AI_DRAFT, DURATIONS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtDuration, fmtTime } from "@/lib/clinic";
import { pick, useT, type StringKey } from "@/lib/i18n";
import type { Consultation, Doctor } from "@/lib/types";

export default function ConsultRecord({ consult, doctor }: { consult: Consultation; doctor?: Doctor }) {
  return (
    <>
      <IntakeRecord consult={consult} />
      <CallSummary consult={consult} doctor={doctor} />
    </>
  );
}

function IntakeRecord({ consult }: { consult: Consultation }) {
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
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
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

function CallSummary({ consult, doctor }: { consult: Consultation; doctor?: Doctor }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const lines = consult.transcript;
  // The scripted demo call has AI assist's summary; otherwise the doctor's notes stand in.
  const summary = consult.scripted
    ? AI_DRAFT.summary
    : [consult.notes.diagnosis, consult.notes.plan, consult.notes.followUp].filter(Boolean);
  const doctorName = doctor?.name ?? t("doctorLabel");

  return (
    <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hair)] px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
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

        {lines.length ? (
          <div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold !text-[var(--link)] hover:underline"
            >
              <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              {open ? t("recHideTranscript") : t("recShowTranscript", { n: lines.length })}
            </button>
            {open ? (
              <ol className="mt-3 grid gap-2.5">
                {lines.map((l) => {
                  const mine = l.speaker === "patient";
                  return (
                    <li key={l.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-(--radius-lg) px-3.5 py-2 ${
                          mine ? "bg-[var(--primary)] text-[var(--ink)]" : "border border-[var(--line)] bg-[var(--sunken)] text-[var(--ink)]"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-2 text-[11px] text-[var(--mute)]">
                          <span className="font-semibold">{mine ? t("you") : doctorName}</span>
                          <span className="font-mono" dir="ltr">
                            {fmtTime(l.at)}
                          </span>
                        </div>
                        <p lang={l.lang} dir={l.lang === "ur" ? "rtl" : "ltr"} className="text-[13.5px]">
                          {l.text}
                        </p>
                        {l.gloss && lang === "en" ? <p className="mt-0.5 text-[12px] italic text-[var(--mute)]">{l.gloss}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
