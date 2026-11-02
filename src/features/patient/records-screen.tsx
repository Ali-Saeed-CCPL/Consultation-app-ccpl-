/* View prescriptions & records — secure web access to the household's consultations,
   as a master–detail page: the list of consultations on the start side, the
   selected one's prescription (or its approval status), what was chosen at
   intake and a summary of the call, with the visit summary alongside. A prescription shows only once the consulting
   doctor has approved it. */

import { useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, FileText, Hourglass, Mail, Plus, Printer, ShieldCheck } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import StatusTag from "@/components/ui/status-tag";
import { PrimaryAction, SecondaryAction } from "@/features/patient/patient-step";
import RxDocument from "@/features/consult/rx-document";
import ConsultRecord from "@/features/patient/consult-record";
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
  if (!phone) return <Navigate to="/login" />;

  const mine = all.filter((c) => c.householdPhone === phone && c.callStartedAt).sort((a, b) => b.createdAt - a.createdAt);
  const selected = mine.find((c) => c.id === selectedId) ?? mine[0];
  const labels = { diagnosis: t("diagnosis"), prescription: t("prescriptionLabel"), advice: t("advice"), followUp: t("followUp"), prescribedBy: t("prescribedBy"), draftedWith: t("draftedWith"), aiChecked: t("aiChecked") };
  const released = selected && (selected.status === "approved" || selected.status === "closed");
  const doctor = (id?: string) => doctors.find((d) => d.id === id);

  return (
    <div className="line-in grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[var(--teal-deep)]">{t("recordsTitle")}</h1>
          <p className="mt-1 text-[14px] text-[var(--body)]">{t("recordsLede")}</p>
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
        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)_340px]">
          {/* ── List ─────────────────────────────────────────────────────── */}
          <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) lg:sticky lg:top-[130px]">
            <header className="flex items-center justify-between border-b border-[var(--hair)] px-5 py-3.5">
              <span className="text-[14px] font-semibold text-[var(--ink)]">{t("recentTitle")}</span>
              <span className="font-mono text-[12px] text-[var(--mute)]">{mine.length}</span>
            </header>
            <ul className="max-h-[calc(100vh-260px)] overflow-y-auto p-2 slim-scrollbar">
              {mine.map((c) => {
                const complaint = complaintText(c.symptoms, lang);
                const on = c.id === selected.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
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
                      <StatusTag status={c.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Prescription ────────────────────────────────────────────── */}
          <div className="grid min-w-0 content-start gap-3">
            {released ? (
              <>
                <RxDocument consult={selected} prescriber={doctor(selected.prescriberId)} labels={labels} />
                <div className="flex flex-wrap items-center gap-2.5">
                  <SecondaryAction onClick={() => toast("PDF download comes with the ccpl-api document service.")}>
                    <Download size={15} /> {t("download")}
                  </SecondaryAction>
                  <SecondaryAction onClick={() => window.print()}>
                    <Printer size={15} /> {t("print")}
                  </SecondaryAction>
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--mute)]">
                    <Mail size={14} /> {t("emailed")}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-4 rounded-(--radius-card) border border-[var(--line)] bg-[var(--amber-tint)] px-6 py-8">
                <Hourglass size={26} className="flex-shrink-0 text-[var(--amber)]" />
                <div>
                  <p className="text-[16px] font-semibold text-[var(--amber-ink)]">{t("awaitingReview")}</p>
                  <p className="mt-1 max-w-[560px] text-[13.5px] leading-relaxed text-[var(--amber-ink)]">{t("consent4")}</p>
                </div>
              </div>
            )}
            <div className="mt-2 grid gap-5">
              <ConsultRecord key={selected.id} consult={selected} doctor={doctor(selected.prescriberId)} />
            </div>
          </div>

          {/* ── Visit summary ───────────────────────────────────────────── */}
          <aside className="grid content-start gap-5 lg:col-start-2 2xl:col-start-auto 2xl:sticky 2xl:top-[130px]">
            <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-5 shadow-(--shadow-sm)">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
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
            <section className="flex items-start gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--tint)] p-5">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-[var(--link)]" />
              <div>
                <p className="text-[13.5px] font-semibold text-[var(--ink)]">{t("infoDoctorApproved")}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--body)]">
                  {released
                    ? `${t("prescribedBy")} ${doctor(selected.prescriberId)?.name ?? "—"} · ${t("draftedWith")} ${t("aiChecked")}`
                    : t("consent4")}
                </p>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
