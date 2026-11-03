/* Choose patient — the policyholder or one of their dependants. Everyone on
   the policy is eligible for now, so Continue opens the consultation and goes
   straight to consent (no cover check). */

import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Check, FileText, History } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import { HOUSEHOLD } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime } from "@/lib/clinic";
import { useT, type StringKey } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useIntakeDraft } from "@/store/intake-draft";
import { useSession } from "@/store/session-store";

export default function ChooseScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const phone = useSession((s) => s.patientPhone);
  // Shared so the side column can show the chosen person straight away.
  const memberId = useIntakeDraft((s) => s.memberId);
  const setMemberId = useIntakeDraft((s) => s.setMember);
  const consultId = useSession((s) => s.consultId);
  const setConsult = useSession((s) => s.setConsult);
  const current = useConsult(consultId ?? undefined);
  const startConsultation = usePlatform((s) => s.startConsultation);
  const consultations = usePlatform((s) => s.consultations);
  if (!phone) return <Navigate to="/login" />;
  /** Each person's most recent consultation, to help pick the right one. */
  const lastVisit = (id: string) =>
    consultations
      .filter((c) => c.householdPhone === phone && c.member.id === id && c.callStartedAt)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

  const next = () => {
    const member = HOUSEHOLD.members.find((m) => m.id === memberId);
    if (!member) return;
    // Back here from consent for the same person: carry on with that consultation, don't open another.
    if (!(current && current.status === "intake" && current.member.id === member.id)) {
      setConsult(startConsultation(phone, member, lang).id);
    }
    navigate({ to: "/patient/consent" });
  };

  return (
    <PatientStep
      step="choose"
      even
      title={t("chooseTitle")}
      lede={t("chooseLede", { policy: HOUSEHOLD.policy })}
      footer={
        <>
          <PrimaryAction disabled={!memberId} onClick={next}>
            {t("continue")}
          </PrimaryAction>
          <Link
            to="/patient/members"
            className="inline-flex items-center justify-center gap-1.5 py-2 text-[13.5px] font-semibold text-[var(--link)] sm:order-first sm:me-auto"
          >
            <FileText size={15} /> {t("recordsTitle")}
          </Link>
        </>
      }
    >
      <div role="radiogroup" className="grid gap-3.5 sm:grid-cols-2">
        {HOUSEHOLD.members.map((m) => {
          const selected = memberId === m.id;
          const last = lastVisit(m.id);
          const complaint = last ? complaintText(last.symptoms, lang) : "";
          const visit = last ? t("lastVisit", { when: [fmtDateTime(last.createdAt), complaint].filter(Boolean).join(" · ") }) : t("noVisitsYet");
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMemberId(m.id)}
              className={`flex flex-col rounded-(--radius-card) border bg-[var(--white)] text-start transition-[border-color,box-shadow] ${
                selected ? "border-[var(--action)] shadow-[0_0_0_3px_var(--tint)]" : "border-[var(--line)] hover:border-[var(--sky-300)] hover:shadow-(--shadow-sm)"
              }`}
            >
              <span className="flex items-center gap-4 px-5 py-4">
                <Avatar initials={initialsOf(m.name)} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-[var(--ink)]">{lang === "ur" ? m.nameUr : m.name}</span>
                  <span className="mt-0.5 block text-[13px] text-[var(--body)]">
                    {t(`rel_${m.relation}` as StringKey)} · {t("years", { n: m.age })}
                  </span>
                  <span className="mt-0.5 block font-mono text-[12px] text-[var(--mute)]" dir="ltr">
                    {m.mrn}
                  </span>
                </span>
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-[var(--action)] bg-[var(--action)] text-white" : "border-[var(--border-input)]"
                  }`}
                >
                  {selected ? <Check size={14} strokeWidth={3} /> : null}
                </span>
              </span>
              <span
                className={`mt-auto flex items-center gap-3 rounded-b-(--radius-card) border-t px-5 py-2.5 text-[12.5px] ${
                  selected ? "border-[var(--sky-200)] bg-[var(--tint)]" : "border-[var(--hair)] bg-[var(--sunken)]"
                }`}
              >
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[var(--mute)]">
                  <History size={14} className="flex-shrink-0" />
                  <span className="truncate" title={visit}>
                    {visit}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </PatientStep>
  );
}
