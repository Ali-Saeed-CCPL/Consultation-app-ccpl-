/* Describe symptoms — guided questions in the patient's language, the member's
   health history (optional: confirmed as up to date, updated, or added — it goes
   to the doctor with the symptoms; left out, the doctor asks on the call), then
   the red-flag check. Any red
   flag goes to emergency guidance, never the queue. */

import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { Brain, Check, CirclePlus, Hand, Pencil, ShieldAlert, Soup, Stethoscope, Pill, Thermometer, TriangleAlert, Wind, type LucideIcon } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import PatientStep, { PrimaryAction, SecondaryAction } from "@/features/patient/patient-step";
import ProfileForm, { cleanProfile } from "@/features/patient/profile-form";
import { allergiesText, conditionsText, emptyProfile, hasHistory, medicinesText } from "@/lib/profile";
import type { HealthProfile, Member } from "@/lib/types";
import { COMPLAINTS, DURATIONS, RED_FLAGS } from "@/data/seed";
import { pick, useT } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useIntakeDraft } from "@/store/intake-draft";
import { complaintKeys } from "@/lib/complaint";
import { useSession } from "@/store/session-store";

export default function SymptomsScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  const submitSymptoms = usePlatform((s) => s.submitSymptoms);
  const profile = usePlatform((s) => (consult ? s.profiles[consult.member.id] : undefined));

  // Answers live in the shared draft so the side column can summarise them as they're given.
  const draftFor = useIntakeDraft((s) => s.consultId);
  const ensureFor = useIntakeDraft((s) => s.ensureFor);
  const patch = useIntakeDraft((s) => s.patch);
  const { complaint, other, duration, severity, details, redFlags, profileOk } = useIntakeDraft((s) => s.symptoms);
  useEffect(() => {
    if (consult) ensureFor(consult.id, consult.symptoms, Boolean(consult.profile));
  }, [consult?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- seed once per consultation

  // Reachable from intake, and from emergency guidance ("ticked one by mistake").
  // Once submitted the status moves on, and the queue screen takes over.
  if (consult && ["queued", "ringing", "in_call"].includes(consult.status)) return <Navigate to="/patient/queue" />;
  if (!consult || !consult.consentAt || !["intake", "emergency"].includes(consult.status)) return <Navigate to="/patient/choose" />;

  if (draftFor !== consult.id) return null;

  const picked = complaintKeys(complaint);
  const needsOther = picked.includes("other");
  const toggleComplaint = (key: string) =>
    patch({ complaint: (picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]).join(",") });
  // The health history is optional — it never holds up finding a doctor.
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
    }, hasHistory(profile) ? profile : undefined, profileOk);
    navigate({ to: redFlags!.length ? "/patient/emergency" : "/patient/queue" });
  };

  // The answers the doctor needs before the queue (severity always has a value; details are optional).
  const done = [Boolean(complaint && (!needsOther || other.trim())), Boolean(duration), true, redFlags !== null];
  const answered = done.filter(Boolean).length;

  return (
    <PatientStep
      step="symptoms"
      back="/patient/consent"
      title={t("sympTitle")}
      footer={
        <>
          <span className="font-mono text-[12.5px] text-[var(--mute)]">{t("answeredOf", { n: answered, total: done.length })}</span>
          <PrimaryAction disabled={!ready} onClick={submit}>
            {t("findDoctor")}
          </PrimaryAction>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Question n={1} label={t("qComplaint")} hint={t("pickAny")} done={done[0]}>
          <Chips options={COMPLAINTS.map((c) => ({ key: c.key, label: pick(c, lang) }))} value={picked} onChange={toggleComplaint} multi />
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
        <Question n={2} label={t("qDuration")} hint={t("pickOne")} done={done[1]}>
          <Chips options={DURATIONS.map((d) => ({ key: d.key, label: pick(d, lang) }))} value={duration} onChange={(k) => patch({ duration: k })} />
        </Question>
        <Question n={3} label={t("qSeverity")} done>
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
        <Question n={4} label={t("qDetailsShort")} hint={t("optional")} done={Boolean(details.trim())}>
          <textarea className="field-input min-h-[56px] resize-y" value={details} onChange={(e) => patch({ details: e.target.value })} />
        </Question>

        <Question n={5} label={t("qProfile")} hint={t("optional")} done={profileOk && hasHistory(profile)} className="lg:col-span-2">
          <HealthHistory member={consult.member} profile={profile} confirmed={profileOk} onConfirm={() => patch({ profileOk: true })} />
        </Question>

        <Question n={6} label={t("qRedFlags")} hint={t("pickAny")} done={done[3]} danger className="lg:col-span-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {RED_FLAGS.map((f) => {
              const on = redFlags?.includes(f.key) ?? false;
              return (
                <label
                  key={f.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-(--radius-md) border px-3 py-2.5 text-[14px] ${
                    on ? "border-[var(--red)] bg-[var(--red-tint)] font-semibold text-[var(--color-red-ink)]" : "border-[var(--line)] text-[var(--body)] hover:border-[var(--color-danger-border)]"
                  }`}
                >
                  <input type="checkbox" className="h-4 w-4 accent-[var(--red)]" checked={on} onChange={() => toggleFlag(f.key)} />
                  <TriangleAlert size={14} className={on ? "text-[var(--red)]" : "text-[var(--faint)]"} />
                  {pick(f, lang)}
                </label>
              );
            })}
          </div>
          {/* "None" is its own answer, set apart so it isn't read as one more symptom. */}
          <button
            type="button"
            role="checkbox"
            aria-checked={redFlags?.length === 0}
            onClick={() => patch({ redFlags: [] })}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-(--radius-md) border px-3 py-2.5 text-[14px] font-semibold ${
              redFlags?.length === 0
                ? "border-[var(--green)] bg-[var(--green-tint)] text-[var(--color-green-ink)]"
                : "border-dashed border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)]"
            }`}
          >
            {redFlags?.length === 0 ? <Check size={16} /> : null} {t("noneOfThese")}
          </button>
        </Question>
      </div>
    </PatientStep>
  );
}

function Question({
  n,
  label,
  hint,
  done,
  danger,
  className = "",
  children,
}: {
  n: number;
  label: string;
  hint?: string;
  done?: boolean;
  danger?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-(--radius-card) border bg-[var(--white)] p-4 ${danger ? "border-[var(--color-danger-border)]" : done ? "border-[var(--sky-200)]" : "border-[var(--line)]"} ${className}`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold ${
            done ? "bg-[var(--green)] text-white" : "bg-[var(--tint)] text-[var(--link)]"
          }`}
        >
          {done ? <Check size={14} strokeWidth={3} /> : n}
        </span>
        <p className="min-w-0 flex-1 text-[14px] font-semibold text-[var(--ink)]">{label}</p>
        {hint ? <span className="flex-shrink-0 text-[12px] text-[var(--mute)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** Icons for the complaint tiles, by complaint key. */
const COMPLAINT_ICON: Record<string, LucideIcon> = { fever: Thermometer, cough: Wind, stomach: Soup, skin: Hand, headache: Brain, other: CirclePlus };

/** Answer tiles: multi-select (complaints — the icon turns into a tick) or pick-one (a radio dot). */
function Chips({ options, value, onChange, multi }: { options: { key: string; label: string }[]; value: string | string[]; onChange: (k: string) => void; multi?: boolean }) {
  const on = (k: string) => (Array.isArray(value) ? value.includes(k) : value === k);
  return (
    <div role={multi ? "group" : "radiogroup"} className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const sel = on(o.key);
        const Icon = multi ? COMPLAINT_ICON[o.key] : undefined;
        return (
          <button
            key={o.key}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={sel}
            onClick={() => onChange(o.key)}
            className={`group flex min-h-11 items-center gap-2.5 rounded-(--radius-md) border px-2.5 py-2 text-start text-[13.5px] transition-[border-color,background-color,box-shadow] duration-150 ${
              sel
                ? "border-[var(--action)] bg-[var(--tint)] font-semibold text-[var(--ink)] shadow-[0_0_0_1px_var(--action)]"
                : "border-[var(--line)] bg-[var(--white)] font-medium text-[var(--body)] hover:border-[var(--sky-300)] hover:bg-[var(--sunken)]"
            }`}
          >
            {Icon ? (
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-(--radius-sm) ${
                  sel ? "bg-[var(--action)] text-white" : "bg-[var(--sunken)] text-[var(--link)] group-hover:bg-[var(--tint)]"
                }`}
              >
                {sel ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 leading-tight">{o.label}</span>
            {multi ? null : (
              <span className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border ${sel ? "border-[var(--action)]" : "border-[var(--color-border-input)]"}`}>
                {sel ? <span className="h-2.5 w-2.5 rounded-full bg-[var(--action)]" /> : null}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The member's health history at intake, all optional: say it's up to date, update it, or add it.
    Skipped, the doctor asks on the call. */
function HealthHistory({ member, profile, confirmed, onConfirm }: { member: Member; profile?: HealthProfile; confirmed: boolean; onConfirm: () => void }) {
  const { t, lang } = useT();
  const saveProfile = usePlatform((s) => s.saveProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HealthProfile>(emptyProfile);
  const has = hasHistory(profile);
  const name = lang === "ur" ? member.nameUr : member.name;
  const open = () => {
    setDraft(profile ?? emptyProfile());
    setEditing(true);
  };
  const save = () => {
    saveProfile(member, cleanProfile(draft));
    setEditing(false);
    onConfirm();
  };
  const show = (v: string | null) => (v === null ? <span className="text-[var(--faint)]">{t("notAnswered")}</span> : v || <span className="text-[var(--mute)]">{t("noneLabel")}</span>);
  const allergies = allergiesText(profile);
  const rows = [
    { icon: <Stethoscope size={14} />, k: t("recConditions"), v: show(conditionsText(profile, lang)) },
    { icon: <ShieldAlert size={14} />, k: t("recAllergies"), v: allergies ? <span className="font-semibold text-[var(--color-red-ink)]">{allergies}</span> : show(allergies), danger: Boolean(allergies) },
    { icon: <Pill size={14} />, k: t("recMedicines"), v: show(medicinesText(profile)) },
  ];
  if (profile?.pregnant) rows.push({ icon: <Check size={14} />, k: t("pPregnant"), v: <>{t(profile.pregnant === "yes" ? "pYes" : profile.pregnant === "no" ? "pNo" : "pUnsure")}</> });

  return (
    <>
      {has ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
            {rows.map((r) => (
              <div key={r.k} className={`rounded-(--radius-md) border px-3 py-2 ${r.danger ? "border-[var(--color-danger-border)] bg-[var(--red-tint)]" : "border-[var(--line)] bg-[var(--sunken)]"}`}>
                <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--mute)]">
                  {r.icon} {r.k}
                </dt>
                <dd className="mt-0.5 text-[13.5px] text-[var(--ink)]">{r.v}</dd>
              </div>
            ))}
          </dl>
          {confirmed ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-[var(--green-tint)] px-3 py-1 text-[13px] font-semibold text-[var(--color-green-ink)]">
                <Check size={14} strokeWidth={3} /> {t("confirmed")}
              </span>
              <button type="button" onClick={open} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--link)] hover:underline">
                <Pencil size={13} /> {t("editHistory")}
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{t("qProfileConfirm", { name })}</p>
              <div className="flex flex-wrap gap-2">
                <SecondaryAction onClick={onConfirm}>
                  <Check size={15} /> {t("stillCorrect")}
                </SecondaryAction>
                <SecondaryAction onClick={open}>
                  <Pencil size={14} /> {t("somethingChanged")}
                </SecondaryAction>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-(--radius-md) border border-[var(--line)] bg-[var(--sunken)] px-4 py-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-(--radius-md) bg-[var(--tint)] text-[var(--link)]">
            <Stethoscope size={17} />
          </span>
          <div className="min-w-[220px] flex-1">
            <p className="text-[13.5px] text-[var(--ink)]">{t("qProfileMissing", { name })}</p>
            <p className="text-[12.5px] text-[var(--mute)]">{t("qProfileSkip")}</p>
          </div>
          <SecondaryAction onClick={open}>{t("addHistory")}</SecondaryAction>
        </div>
      )}

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        width={760}
        title={`${t("qProfile")} · ${name}`}
        footer={
          <>
            <SecondaryAction onClick={() => setEditing(false)}>{t("cancel")}</SecondaryAction>
            <PrimaryAction disabled={!hasHistory(cleanProfile(draft))} onClick={save}>
              {t("saveAndUse")}
            </PrimaryAction>
          </>
        }
      >
        <div lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} className="grid gap-4">
          <p className="text-[13px] text-[var(--mute)]">{t("profileWhy")}</p>
          <ProfileForm member={member} value={draft} onChange={setDraft} compact />
        </div>
      </Dialog>
    </>
  );
}
