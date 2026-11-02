/* Consent — video call with a live transcript, AI-drafted notes and the doctor's approval. */

import { useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Bot, Captions, ShieldCheck, Video } from "lucide-react";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import { useT, type StringKey } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

const POINTS: { icon: typeof Video; key: StringKey }[] = [
  { icon: Video, key: "consent1" },
  { icon: Captions, key: "consent2" },
  { icon: Bot, key: "consent3" },
  { icon: ShieldCheck, key: "consent4" },
];

export default function ConsentScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  const giveConsent = usePlatform((s) => s.giveConsent);
  const [agreed, setAgreed] = useState(false);
  if (!consult || consult.status !== "intake") return <Navigate to="/patient/choose" />;

  return (
    <PatientStep
      step="consent"
      title={t("consentTitle")}
      lede={t("consentLede")}
      footer={
        <PrimaryAction
          disabled={!agreed}
          onClick={() => {
            giveConsent(consult.id);
            navigate({ to: "/patient/symptoms" });
          }}
        >
          {t("continue")}
        </PrimaryAction>
      }
    >
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
        {POINTS.map(({ icon: Icon, key }) => (
          <li key={key} className="flex gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-(--radius-md) bg-[var(--tint)] text-[var(--link)]">
              <Icon size={16} />
            </span>
            <span className="text-[14px] leading-relaxed text-[var(--body)]">{t(key)}</span>
          </li>
        ))}
      </ul>
      <label className="mt-4 flex cursor-pointer gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3.5">
        <input type="checkbox" className="mt-1 h-4 w-4 flex-shrink-0 accent-[var(--link)]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span className="text-[14px] font-medium text-[var(--ink)]">{t("consentAgree")}</span>
      </label>
    </PatientStep>
  );
}
