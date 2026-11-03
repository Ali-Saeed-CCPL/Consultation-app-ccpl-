/* View prescriptions & records — secure web access to the household's consultations,
   as a master–detail page: the list of consultations on the start side, the
   selected one's prescription (or its approval status), what was chosen at
   intake and a summary of the call, with the visit summary alongside. A prescription shows only once the consulting
   doctor has approved it. */

import { useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Download, FileText, Mail, Plus, Printer, Video } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import { PrimaryAction, SecondaryAction } from "@/features/patient/patient-step";
import RxDocument, { downloadRx, rxLabels } from "@/features/consult/rx-document";
import { CallSummary, IntakeRecord } from "@/features/patient/consult-record";
import { DURATIONS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtDuration } from "@/lib/clinic";
import { pick, useT } from "@/lib/i18n";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

export default function RecordsScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const phone = useSession((s) => s.patientPhone);
  const all = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"rx" | "intake" | "call">("rx");
  if (!phone) return <Navigate to="/login" />;

  const mine = all.filter((c) => c.householdPhone === phone && c.callStartedAt).sort((a, b) => b.createdAt - a.createdAt);
  const selected = mine.find((c) => c.id === selectedId) ?? mine[0];
  const released = selected && (selected.status === "approved" || selected.status === "closed");
  const doctor = (id?: string) => doctors.find((d) => d.id === id);

  return (
    <div className="line-in grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("recordsTitle")}</h1>
        </div>
        <PrimaryAction onClick={() => navigate({ to: "/patient/choose" })}>
          <Plus size={16} /> {t("newConsult")}
        </PrimaryAction>
      </div>

      {!selected ? (
        <p className="rounded-(--radius-card) border border-dashed border-[var(--sky-200)] bg-[var(--white)] px-5 py-16 text-center text-[14px] text-[var(--mute)]">
          {t("noRecords")}
        </p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid min-w-0 grid-cols-1 content-start gap-4 lg:sticky lg:top-[130px]">
          {/* ── List ─────────────────────────────────────────────────────── */}
          <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
            <header className="flex items-center justify-between border-b border-[var(--hair)] px-5 py-3.5">
              <span className="text-[14px] font-semibold text-[var(--ink)]">{t("recentTitle")}</span>
              <span className="font-mono text-[12px] text-[var(--mute)]">{mine.length}</span>
            </header>
            <ul className="max-h-[calc(100vh-520px)] min-h-[160px] overflow-y-auto p-2 slim-scrollbar">
              {mine.map((c) => {
                const complaint = complaintText(c.symptoms, lang);
                const on = c.id === selected.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setTab("rx");
                      }}
                      className={`flex w-full items-center gap-3 rounded-(--radius-md) px-3 py-2.5 text-start ${
                        on ? "bg-[var(--primary)]" : "hover:bg-[var(--sunken)]"
                      }`}
                    >
                      <Avatar initials={initialsOf(c.member.name)} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-[var(--ink)]">
                          {lang === "ur" ? c.member.nameUr : c.member.name}
                          {complaint ? <span className="font-normal text-[var(--mute)]"> · {complaint}</span> : null}
                        </span>
                        <span className="block font-mono text-[11px] text-[var(--mute)]" dir="ltr">
                          {c.id} · {fmtDateTime(c.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-5 shadow-(--shadow-sm)">
            <h2 className="section-title flex items-center gap-2">
              <FileText size={16} className="text-[var(--link)]" /> {t("visitSummary")}
            </h2>
            <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
              <dt className="text-[var(--mute)]">{t("patientLabel")}</dt>
              <dd className="font-semibold text-[var(--ink)]">{lang === "ur" ? selected.member.nameUr : selected.member.name}</dd>
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
                    className={`rounded-(--radius-pill) px-3.5 py-1.5 text-[13px] font-semibold ${
                      tab === k ? "bg-[var(--action)] text-white" : "text-[var(--mute)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "rx" && released ? (
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 text-[12.5px] text-[var(--mute)] xl:inline-flex">
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
      )}
    </div>
  );
}
