/* Consent — video call with a live transcript, AI-drafted notes and the doctor's approval. */

import { useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Bot, Captions, ShieldCheck, Video } from "lucide-react";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import { useT, type StringKey } from "@/lib/i18n";
import { LoadFailed, Loading, actionError } from "@/features/patient/load-state";
import { useConsultation, usePatientActions } from "@/features/patient/patient-data";
import { useSession } from "@/store/session-store";

const POINTS: { icon: typeof Video; key: StringKey }[] = [
  { icon: Video, key: "consent1" },
  { icon: Captions, key: "consent2" },
  { icon: Bot, key: "consent3" },
  { icon: ShieldCheck, key: "consent4" },
];

export default function ConsentScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const { data: consult, loading, error: loadError } = useConsultation(consultId);
  const { consent } = usePatientActions();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  if (loadError) return <LoadFailed error={loadError} />;
  if (loading) return <Loading />;
  if (!consult || consult.status !== "intake") return <Navigate to="/patient/choose" />;

  return (
    <PatientStep
      step="consent"
      back="/patient/choose"
      title={t("consentTitle")}
      footer={
        <>
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-[var(--color-red-ink)]">
              {error}
            </p>
          ) : null}
          <PrimaryAction
            disabled={!agreed || consent.isPending}
            onClick={async () => {
              setError("");
              try {
                await consent.mutateAsync({ id: consult.id, lang });
                navigate({ to: "/patient/symptoms" });
              } catch (e) {
                setError(actionError(e, t("actionFailed")));
              }
            }}
          >
            {t("continue")}
          </PrimaryAction>
        </>
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
