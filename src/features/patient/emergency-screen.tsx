/* Emergency guidance — go to the nearest ER now. Shown instead of the queue
   whenever a red flag is ticked. */

import { Navigate, useNavigate } from "@tanstack/react-router";
import { Ambulance, Hospital, Phone, Siren } from "lucide-react";
import PatientStep, { SecondaryAction } from "@/features/patient/patient-step";
import { RED_FLAGS } from "@/data/seed";
import { pick, useT } from "@/lib/i18n";
import { useConsult } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

export default function EmergencyScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  if (!consult || consult.status !== "emergency") return <Navigate to="/patient/choose" />;
  const flags = RED_FLAGS.filter((f) => consult.symptoms?.redFlags.includes(f.key));

  return (
    <PatientStep
      step="symptoms"
      title={
        <span className="flex items-start gap-2.5 text-[var(--color-red-ink)]">
          <Siren size={28} className="mt-0.5 flex-shrink-0 text-[var(--red)]" />
          {t("erTitle")}
        </span>
      }
      lede={t("erLede")}
      footer={<SecondaryAction onClick={() => navigate({ to: "/patient/symptoms" })}>{t("erMistake")}</SecondaryAction>}
    >
      <div className="flex flex-wrap gap-2">
        {flags.map((f) => (
          <span key={f.key} className="rounded-(--radius-pill) bg-[var(--red-tint)] px-3 py-1 text-[13px] font-semibold text-[var(--color-red-ink)]">
            {pick(f, lang)}
          </span>
        ))}
      </div>
      <a
        href="tel:1122"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-(--radius-md) border border-[var(--red)] bg-[var(--red)] px-4 py-3.5 text-[16px] font-semibold !text-[var(--color-on-fill)] hover:brightness-110"
      >
        <Phone size={18} /> {t("erCall")}
      </a>
      <ul className="mt-4 divide-y divide-[var(--hair)] rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)]">
        <li className="flex gap-3 px-4 py-3.5 text-[14px] text-[var(--body)]">
          <Ambulance size={18} className="mt-0.5 flex-shrink-0 text-[var(--red)]" /> {t("erDont")}
        </li>
        <li className="flex gap-3 px-4 py-3.5 text-[14px] text-[var(--body)]">
          <Hospital size={18} className="mt-0.5 flex-shrink-0 text-[var(--link)]" /> {t("erPanel")}
        </li>
      </ul>
    </PatientStep>
  );
}
