/* One member's prescriptions & records, inside the Members page: their visits
   on the start side, the selected one's prescription (or its approval status),
   what was chosen at intake and a summary of the call, with the visit summary
   alongside. A prescription shows only once the consulting doctor has approved it. */

import { useState } from "react";
import { Download, FileText, Mail, Printer, Video } from "lucide-react";
import { SecondaryAction } from "@/features/patient/patient-step";
import RxDocument, { downloadRx, rxLabels } from "@/features/consult/rx-document";
import { CallSummary, IntakeRecord } from "@/features/patient/consult-record";
import { DURATIONS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtDuration } from "@/lib/clinic";
import { pick, useT } from "@/lib/i18n";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";
import type { Consultation, Member } from "@/lib/types";

/** The member's consultations that reached a doctor, newest first. */
export function useMemberVisits(memberId: string): Consultation[] {
  const phone = useSession((s) => s.patientPhone);
  const all = usePlatform((s) => s.consultations);
  return all.filter((c) => c.householdPhone === phone && c.member.id === memberId && c.callStartedAt).sort((a, b) => b.createdAt - a.createdAt);
}

export default function MemberRecords({ member, visitId, onVisit }: { member: Member; visitId?: string; onVisit: (id: string) => void }) {
  const { t, lang } = useT();
  const doctors = usePlatform((s) => s.doctors);
  const visits = useMemberVisits(member.id);
  const [tab, setTab] = useState<"rx" | "intake" | "call">("rx");
  const selected = visits.find((c) => c.id === visitId) ?? visits[0];
  const released = selected && (selected.status === "approved" || selected.status === "closed");
  const doctor = (id?: string) => doctors.find((d) => d.id === id);

  if (!selected)
    return (
      <div className="grid place-items-center gap-2 rounded-(--radius-card) border border-dashed border-[var(--sky-200)] bg-[var(--white)] px-5 py-16 text-center">
        <FileText size={26} className="text-[var(--faint)]" />
        <p className="text-[14px] text-[var(--mute)]">{t("noVisitsFor", { name: lang === "ur" ? member.nameUr : member.name })}</p>
      </div>
    );

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="grid min-w-0 content-start gap-4 xl:sticky xl:top-[130px]">
        {/* ── Visits ───────────────────────────────────────────────────── */}
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
          <header className="flex items-center justify-between border-b border-[var(--hair)] px-4 py-3">
            <span className="text-[13.5px] font-semibold text-[var(--ink)]">{t("visitsTitle")}</span>
            <span className="font-mono text-[12px] text-[var(--mute)]">{visits.length}</span>
          </header>
          <ul className="max-h-[360px] overflow-y-auto p-2 slim-scrollbar">
            {visits.map((c) => {
              const on = c.id === selected.id;
              const rx = c.status === "approved" || c.status === "closed";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onVisit(c.id);
                      setTab("rx");
                    }}
                    className={`relative w-full rounded-(--radius-md) px-3 py-2.5 text-start ${
                      on ? "bg-[var(--tint)] before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-[var(--action)]" : "hover:bg-[var(--sunken)]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{complaintText(c.symptoms, lang) || "—"}</span>
                      <span
                        className={`flex-shrink-0 rounded-(--radius-pill) px-2 py-px text-[10.5px] font-semibold ${
                          rx ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--sunken)] text-[var(--mute)]"
                        }`}
                      >
                        {rx ? (c.rx.length ? t("prescriptionLabel") : t("adviceOnly")) : t("inProgress")}
                      </span>
                    </span>
                    <span className="block font-mono text-[11px] text-[var(--mute)]" dir="ltr">
                      {fmtDateTime(c.createdAt)} · {c.id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-4 shadow-(--shadow-sm)">
          <h2 className="section-title flex items-center gap-2 !text-[14px]">
            <FileText size={15} className="text-[var(--link)]" /> {t("visitSummary")}
          </h2>
          <dl className="mt-3 grid grid-cols-[96px_1fr] gap-y-2 text-[13px]">
            <dt className="text-[var(--mute)]">{t("doctorLabel")}</dt>
            <dd className="text-[var(--ink)]">{doctor(selected.prescriberId)?.name ?? "—"}</dd>
            <dt className="text-[var(--mute)]">{t("complaintLabel")}</dt>
            <dd className="text-[var(--ink)]">
              {(() => {
                const d = DURATIONS.find((x) => x.key === selected.symptoms?.duration);
                return [complaintText(selected.symptoms, lang), d && pick(d, lang)].filter(Boolean).join(" · ") || "—";
              })()}
            </dd>
            <dt className="text-[var(--mute)]">{t("callLength")}</dt>
            <dd className="font-mono text-[12.5px] text-[var(--ink)]" dir="ltr">
              {selected.callStartedAt && selected.callEndedAt ? fmtDuration(selected.callEndedAt - selected.callStartedAt) : "—"}
            </dd>
            <dt className="text-[var(--mute)]">{t("refLabel")}</dt>
            <dd className="font-mono text-[12.5px] text-[var(--ink)]" dir="ltr">
              {selected.id} · v{selected.rxVersion}
            </dd>
          </dl>
        </section>
      </div>

      {/* ── The selected visit, one tab at a time (prescription / what you told us / call summary) ── */}
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div role="tablist" className="flex gap-1 rounded-(--radius-pill) border border-[var(--line)] bg-[var(--white)] p-1 shadow-(--shadow-xs)">
            {(
              [
                ["rx", t("prescriptionLabel")],
                ["intake", t("recIntakeTitle")],
                ["call", t("recSummary")],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-(--radius-pill) px-3.5 py-1.5 text-[13px] font-semibold ${tab === k ? "bg-[var(--action)] text-white" : "text-[var(--mute)] hover:text-[var(--ink)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "rx" && released ? (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-[12.5px] text-[var(--mute)] 2xl:inline-flex">
                <Mail size={14} /> {t("emailed")}
              </span>
              <SecondaryAction onClick={() => downloadRx(selected.id)}>
                <Download size={15} /> {t("download")}
              </SecondaryAction>
              <SecondaryAction onClick={() => downloadRx(selected.id)}>
                <Printer size={15} /> {t("print")}
              </SecondaryAction>
            </div>
          ) : null}
        </div>

        {tab === "rx" ? (
          released ? (
            <RxDocument consult={selected} prescriber={doctor(selected.prescriberId)} labels={rxLabels(t)} />
          ) : (
            <div className="flex items-center gap-4 rounded-(--radius-card) border border-[var(--line)] bg-[var(--tint)] px-6 py-8">
              <Video size={26} className="flex-shrink-0 text-[var(--link)]" />
              <p className="text-[16px] font-semibold text-[var(--ink)]">{t("visitNow")}</p>
            </div>
          )
        ) : tab === "intake" ? (
          <IntakeRecord consult={selected} />
        ) : (
          <CallSummary consult={selected} doctor={doctor(selected.prescriberId)} />
        )}
      </div>
    </div>
  );
}
