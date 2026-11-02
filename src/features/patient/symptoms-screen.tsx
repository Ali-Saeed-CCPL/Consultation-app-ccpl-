/* Describe symptoms — guided questions in the patient's language, then the
   red-flag check. Any red flag goes to emergency guidance, never the queue. */

import { useEffect, type ReactNode } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import { COMPLAINTS, DURATIONS, RED_FLAGS } from "@/data/seed";
import { pick, useT } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useIntakeDraft } from "@/store/intake-draft";
import { useSession } from "@/store/session-store";

export default function SymptomsScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  const submitSymptoms = usePlatform((s) => s.submitSymptoms);

  // Answers live in the shared draft so the side column can summarise them as they're given.
  const draftFor = useIntakeDraft((s) => s.consultId);
  const ensureFor = useIntakeDraft((s) => s.ensureFor);
  const patch = useIntakeDraft((s) => s.patch);
  const { complaint, other, duration, severity, details, redFlags } = useIntakeDraft((s) => s.symptoms);
  useEffect(() => {
    if (consult) ensureFor(consult.id, consult.symptoms);
  }, [consult?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- seed once per consultation

  // Reachable from intake, and from emergency guidance ("ticked one by mistake").
  // Once submitted the status moves on, and the queue screen takes over.
  if (consult && ["queued", "ringing", "callback", "in_call"].includes(consult.status)) return <Navigate to="/patient/queue" />;
  if (!consult || !consult.consentAt || !["intake", "emergency"].includes(consult.status)) return <Navigate to="/patient/choose" />;

  if (draftFor !== consult.id) return null;

  const needsOther = complaint === "other";
  const ready = complaint && (!needsOther || other.trim()) && duration && redFlags !== null;
  const toggleFlag = (key: string) => {
    const list = redFlags ?? [];
    patch({ redFlags: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] });
  };

  const submit = () => {
    if (!ready) return;
    submitSymptoms(consult.id, {
      complaint,
      other: needsOther ? other.trim() : undefined,
      duration,
      severity,
      details: details.trim(),
      redFlags: redFlags!,
    });
    navigate({ to: redFlags!.length ? "/patient/emergency" : "/patient/queue" });
  };

  return (
    <PatientStep
      step="symptoms"
      title={t("sympTitle")}
      lede={t("sympLede")}
      footer={
        <PrimaryAction disabled={!ready} onClick={submit}>
          {t("findDoctor")}
        </PrimaryAction>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Question label={t("qComplaint")}>
          <Chips options={COMPLAINTS.map((c) => ({ key: c.key, label: pick(c, lang) }))} value={complaint} onChange={(k) => patch({ complaint: k })} />
          {needsOther ? (
            <label className="mt-3 block line-in">
              <span className="field-label">{t("qOther")} *</span>
              <input
                className="field-input"
                value={other}
                maxLength={120}
                autoFocus
                placeholder={t("qOtherHint")}
                onChange={(e) => patch({ other: e.target.value })}
              />
            </label>
          ) : null}
        </Question>
        <Question label={t("qDuration")}>
          <Chips options={DURATIONS.map((d) => ({ key: d.key, label: pick(d, lang) }))} value={duration} onChange={(k) => patch({ duration: k })} />
        </Question>
        <Question label={t("qSeverity")}>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-[var(--mute)]">{t("mild")}</span>
            <input
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => patch({ severity: Number(e.target.value) })}
              className="flex-1 accent-[var(--link)]"
              aria-label={t("qSeverity")}
            />
            <span className="text-[12.5px] text-[var(--mute)]">{t("severe")}</span>
            <span className="w-12 rounded-(--radius-sm) bg-[var(--tint)] py-1 text-center font-mono text-[13px] font-semibold text-[var(--ink)]" dir="ltr">
              {severity}/10
            </span>
          </div>
        </Question>
        <Question label={t("qDetails")}>
          <textarea className="field-input min-h-[56px] resize-y" value={details} onChange={(e) => patch({ details: e.target.value })} />
        </Question>

        <div className="rounded-(--radius-card) border border-[var(--color-danger-border)] bg-[var(--white)] p-4 lg:col-span-2">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
            <TriangleAlert size={16} className="text-[var(--red)]" /> {t("qRedFlags")}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {RED_FLAGS.map((f) => {
              const on = redFlags?.includes(f.key) ?? false;
              return (
                <label
                  key={f.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border px-3 py-2.5 text-[14px] ${
                    on ? "border-[var(--red)] bg-[var(--red-tint)] text-[var(--color-red-ink)]" : "border-[var(--line)] text-[var(--body)]"
                  }`}
                >
                  <input type="checkbox" className="h-4 w-4 accent-[var(--red)]" checked={on} onChange={() => toggleFlag(f.key)} />
                  {pick(f, lang)}
                </label>
              );
            })}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border px-3 py-2.5 text-[14px] font-semibold ${
                redFlags?.length === 0 ? "border-[var(--green)] bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "border-[var(--line)] text-[var(--ink)]"
              }`}
            >
              <input type="checkbox" className="h-4 w-4 accent-[var(--green)]" checked={redFlags?.length === 0} onChange={() => patch({ redFlags: [] })} />
              {t("noneOfThese")}
            </label>
          </div>
        </div>
      </div>
    </PatientStep>
  );
}

function Question({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-4">
      <p className="mb-3 text-[14px] font-semibold text-[var(--ink)]">{label}</p>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-(--radius-pill) border px-3.5 py-1.5 text-[13.5px] font-medium ${
            value === o.key
              ? "border-[var(--sky-300)] bg-[var(--primary)] text-[var(--ink)] font-semibold"
              : "border-[var(--line)] bg-[var(--white)] text-[var(--body)] hover:border-[var(--sky-300)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
