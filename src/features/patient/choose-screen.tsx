/* Choose patient — the policyholder or one of their dependants. Everyone on
   the policy is eligible for now, so Continue opens the consultation and goes
   straight to consent (no cover check). */

import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Check, FileText } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import { HOUSEHOLD } from "@/data/seed";
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
  if (!phone) return <Navigate to="/login" />;

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
      title={t("chooseTitle")}
      lede={t("chooseLede", { policy: HOUSEHOLD.policy })}
      footer={
        <>
          <PrimaryAction disabled={!memberId} onClick={next}>
            {t("continue")}
          </PrimaryAction>
          <Link
            to="/patient/records"
            className="inline-flex items-center justify-center gap-1.5 py-2 text-[13.5px] font-semibold text-[var(--link)] sm:order-first sm:me-auto"
          >
            <FileText size={15} /> {t("recordsTitle")}
          </Link>
        </>
      }
    >
      <div role="radiogroup" className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {HOUSEHOLD.members.map((m) => {
          const selected = memberId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMemberId(m.id)}
              className={`flex items-center gap-3.5 rounded-(--radius-card) border bg-[var(--white)] px-4 py-3.5 text-start ${
                selected ? "border-[var(--link)] shadow-[0_0_0_3px_var(--tint)]" : "border-[var(--line)] hover:border-[var(--sky-300)]"
              }`}
            >
              <Avatar initials={initialsOf(m.name)} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[var(--ink)]">{lang === "ur" ? m.nameUr : m.name}</span>
                <span className="block text-[12.5px] text-[var(--mute)]">
                  {t(`rel_${m.relation}` as StringKey)} · {t("years", { n: m.age })} ·{" "}
                  <span className="font-mono" dir="ltr">
                    {m.mrn}
                  </span>
                </span>
              </span>
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-[var(--link)] bg-[var(--link)] text-[var(--color-on-fill)]" : "border-[var(--border-input)]"
                }`}
              >
                {selected ? <Check size={12} strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </PatientStep>
  );
}
