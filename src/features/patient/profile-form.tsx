/* One member's health profile as a form, in the patient's language. All of it
   is optional — it's extra for the doctor; anything left blank they ask on the
   call. The three key answers come first (long-term conditions, allergies,
   regular medicines — each can be "none"), then the basics and the rest of
   their history. Controlled: the Members page and the intake dialog hold the
   value and save it. */

import type { ReactNode } from "react";
import { Check, ClipboardList, Pill, Plus, Ruler, ShieldAlert, Stethoscope, Trash2 } from "lucide-react";
import { ALLERGY_KINDS, BLOOD_GROUPS, CONDITIONS, FAMILY_CONDITIONS, SMOKING, asksPregnancy, bmi, bmiBand, conditionName } from "@/lib/profile";
import { pick, useT, type StringKey } from "@/lib/i18n";
import type { HealthProfile, Member, ProfileAllergy } from "@/lib/types";

/** Drops blank rows before saving; a list left with only blank rows goes back to unanswered. */
export function cleanProfile(p: HealthProfile): HealthProfile {
  const tidy = <T,>(list: T[] | null, keep: (x: T) => boolean) => (list === null ? null : list.length && !list.some(keep) ? null : list.filter(keep));
  return {
    ...p,
    conditions: tidy(p.conditions, (c) => c.key !== "other" || Boolean(c.name?.trim())),
    allergies: tidy(p.allergies, (a) => Boolean(a.name.trim())),
    medicines: tidy(p.medicines, (m) => Boolean(m.name.trim())),
    history: p.history.trim(),
  };
}

const SMALL_INPUT = "field-input !h-9 !py-0 !text-[13px]";

export default function ProfileForm({
  member,
  value,
  onChange,
  compact,
}: {
  member: Member;
  value: HealthProfile;
  onChange: (p: HealthProfile) => void;
  /** The intake dialog: just the three key answers (and pregnancy). */
  compact?: boolean;
}) {
  const { t, lang } = useT();
  const set = (change: Partial<HealthProfile>) => onChange({ ...value, ...change });
  const conditions = value.conditions ?? [];
  const has = (key: string) => conditions.some((c) => c.key === key);
  const toggleCondition = (key: string) => {
    const next = has(key) ? conditions.filter((c) => c.key !== key) : [...conditions, { key }];
    set({ conditions: next.length ? next : null });
  };
  const patchCondition = (key: string, change: { since?: string; name?: string }) =>
    set({ conditions: conditions.map((c) => (c.key === key ? { ...c, ...change } : c)) });
  const allergies = value.allergies ?? [];
  const patchAllergy = (i: number, change: Partial<ProfileAllergy>) => set({ allergies: allergies.map((a, j) => (j === i ? { ...a, ...change } : a)) });
  const medicines = value.medicines ?? [];
  const index = bmi(value);

  const sinceInput = (key: string, since?: string) => (
    <input
      className={`${SMALL_INPUT} w-[68px] flex-shrink-0 !px-1.5 text-center`}
      inputMode="numeric"
      dir="ltr"
      placeholder={t("pYear")}
      aria-label={t("pSince")}
      title={t("pSince")}
      value={since ?? ""}
      maxLength={4}
      onChange={(e) => patchCondition(key, { since: e.target.value.replace(/\D/g, "") })}
    />
  );

  const conditionsCard = (
    <Block
      icon={<Stethoscope size={17} />}
      title={t("pConditions")}
      hint={t("pConditionsHint")}
      done={value.conditions !== null}
      none={<NoneToggle on={value.conditions?.length === 0} onClick={() => set({ conditions: value.conditions?.length === 0 ? null : [] })} label={t("pNoConditions")} />}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {CONDITIONS.map((c) => {
          const on = has(c.key);
          const row = conditions.find((x) => x.key === c.key);
          const other = c.key === "other";
          return (
            <div
              key={c.key}
              className={`flex h-12 items-center gap-2 rounded-(--radius-md) border pe-1.5 transition-colors ${other && on ? "sm:col-span-2" : ""} ${
                on ? "border-[var(--action)] bg-[var(--tint)]" : "border-[var(--line)] bg-[var(--white)] hover:border-[var(--sky-300)]"
              }`}
            >
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggleCondition(c.key)} className="flex h-full min-w-0 flex-1 items-center gap-2.5 ps-3 text-start text-[13.5px]">
                <Box on={on} />
                <span className={`line-clamp-2 leading-tight ${on ? "font-semibold text-[var(--ink)]" : "text-[var(--body)]"}`}>{pick(c, lang)}</span>
              </button>
              {on && other ? (
                <input className={`${SMALL_INPUT} min-w-0 flex-1`} autoFocus placeholder={t("pOtherCondition")} aria-label={t("pOtherCondition")} value={row?.name ?? ""} maxLength={60} onChange={(e) => patchCondition(c.key, { name: e.target.value })} />
              ) : null}
              {on ? sinceInput(c.key, row?.since) : null}
            </div>
          );
        })}
      </div>
    </Block>
  );

  const allergiesCard = (
    <Block
      icon={<ShieldAlert size={17} />}
      tone="danger"
      title={t("pAllergies")}
      hint={t("pAllergiesHint")}
      done={value.allergies !== null}
      none={<NoneToggle on={value.allergies?.length === 0} onClick={() => set({ allergies: value.allergies?.length === 0 ? null : [] })} label={t("pNoAllergies")} />}
    >
      {allergies.length ? (
        <ul className="mb-2 grid gap-2">
          {allergies.map((a, i) => (
            <li key={i} className="grid items-center gap-2 rounded-(--radius-md) border border-[var(--line)] border-s-[3px] border-s-[var(--red)] bg-[var(--white)] p-2 sm:grid-cols-[112px_1fr_1fr_auto]">
              <select className={SMALL_INPUT} value={a.kind} onChange={(e) => patchAllergy(i, { kind: e.target.value as ProfileAllergy["kind"] })} aria-label={t("pAllergyKind")}>
                {ALLERGY_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {pick(k, lang)}
                  </option>
                ))}
              </select>
              <input className={SMALL_INPUT} placeholder={t("pAllergyName")} aria-label={t("pAllergyName")} value={a.name} maxLength={60} autoFocus={!a.name} onChange={(e) => patchAllergy(i, { name: e.target.value })} />
              <input className={SMALL_INPUT} placeholder={t("pAllergyReaction")} aria-label={t("pAllergyReaction")} value={a.reaction} maxLength={80} onChange={(e) => patchAllergy(i, { reaction: e.target.value })} />
              <RemoveButton label={t("pRemove")} onClick={() => set({ allergies: allergies.length > 1 ? allergies.filter((_, j) => j !== i) : null })} />
            </li>
          ))}
        </ul>
      ) : null}
      <AddButton onClick={() => set({ allergies: [...allergies, { kind: "medicine", name: "", reaction: "" }] })}>{t("pAddAllergy")}</AddButton>
    </Block>
  );

  const medicinesCard = (
    <Block
      icon={<Pill size={17} />}
      title={t("pMedicines")}
      hint={t("pMedicinesHint")}
      done={value.medicines !== null}
      none={<NoneToggle on={value.medicines?.length === 0} onClick={() => set({ medicines: value.medicines?.length === 0 ? null : [] })} label={t("pNoMedicines")} />}
    >
      {medicines.length ? (
        <ul className="mb-2 grid gap-2">
          {medicines.map((m, i) => (
            <li key={i} className="grid items-center gap-2 rounded-(--radius-md) border border-[var(--line)] border-s-[3px] border-s-[var(--action)] bg-[var(--white)] p-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className={SMALL_INPUT}
                placeholder={t("pMedName")}
                aria-label={t("pMedName")}
                value={m.name}
                maxLength={60}
                autoFocus={!m.name}
                onChange={(e) => set({ medicines: medicines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
              />
              <input
                className={SMALL_INPUT}
                placeholder={t("pMedDose")}
                aria-label={t("pMedDose")}
                value={m.dose}
                maxLength={60}
                onChange={(e) => set({ medicines: medicines.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)) })}
              />
              <RemoveButton label={t("pRemove")} onClick={() => set({ medicines: medicines.length > 1 ? medicines.filter((_, j) => j !== i) : null })} />
            </li>
          ))}
        </ul>
      ) : null}
      <AddButton onClick={() => set({ medicines: [...medicines, { name: "", dose: "" }] })}>{t("pAddMedicine")}</AddButton>
    </Block>
  );

  const pregnancy = asksPregnancy(member) ? (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[13.5px] font-semibold text-[var(--ink)]">{t("pPregnant")}</span>
      <Segmented
        value={value.pregnant ?? ""}
        onChange={(v) => set({ pregnant: v as HealthProfile["pregnant"] })}
        options={[
          { key: "no", label: t("pNo") },
          { key: "yes", label: t("pYes") },
          { key: "unsure", label: t("pUnsure") },
        ]}
      />
    </div>
  ) : null;

  if (compact)
    return (
      <div className="grid gap-4">
        {pregnancy ? <div className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3">{pregnancy}</div> : null}
        {conditionsCard}
        {allergiesCard}
        {medicinesCard}
      </div>
    );

  // The three key answers first, then the basics and the rest.
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      {conditionsCard}
      <div className="grid gap-4">
        {allergiesCard}
        {medicinesCard}
      </div>

      <Block icon={<Ruler size={17} />} title={t("pBasics")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="field-label">{t("pBlood")}</span>
            <select className="field-input" value={value.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })} dir="ltr">
              <option value="">—</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g === "unknown" ? t("pBloodUnknown") : g}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t("pHeight")}</span>
            <input className="field-input" inputMode="numeric" dir="ltr" value={value.heightCm} maxLength={3} onChange={(e) => set({ heightCm: e.target.value.replace(/\D/g, "") })} />
          </label>
          <label>
            <span className="field-label">{t("pWeight")}</span>
            <input className="field-input" inputMode="decimal" dir="ltr" value={value.weightKg} maxLength={5} onChange={(e) => set({ weightKg: e.target.value.replace(/[^\d.]/g, "") })} />
          </label>
        </div>
        {index ? (
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--mute)]">
            {t("pBmi")}
            <span className="font-mono text-[13px] font-semibold text-[var(--ink)]" dir="ltr">
              {index}
            </span>
            <span
              className={`rounded-(--radius-pill) px-2 py-0.5 text-[11.5px] font-semibold ${
                bmiBand(index) === "normal" ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
              }`}
            >
              {t(`bmi_${bmiBand(index)}` as StringKey)}
            </span>
          </p>
        ) : null}
        {pregnancy ? <div className="mt-4 border-t border-[var(--hair)] pt-3">{pregnancy}</div> : null}
      </Block>

      <Block icon={<ClipboardList size={17} />} title={t("pMore")}>
        <label className="block">
          <span className="field-label">{t("pHistory")}</span>
          <textarea className="field-input min-h-[64px] resize-y" placeholder={t("pHistoryHint")} value={value.history} maxLength={300} onChange={(e) => set({ history: e.target.value })} />
        </label>
        <div className="mt-3">
          <span className="field-label">{t("pSmoking")}</span>
          <Segmented value={value.smoking} onChange={(v) => set({ smoking: v as HealthProfile["smoking"] })} options={SMOKING.map((s) => ({ key: s.key, label: pick(s, lang) }))} />
        </div>
        <div className="mt-3">
          <span className="field-label">{t("pFamily")}</span>
          <div className="flex flex-wrap gap-1.5">
            {FAMILY_CONDITIONS.map((k) => {
              const on = value.family.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => set({ family: on ? value.family.filter((x) => x !== k) : [...value.family, k] })}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-(--radius-pill) border px-3 text-[12.5px] font-semibold ${
                    on ? "border-[var(--action)] bg-[var(--tint)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--white)] text-[var(--body)] hover:border-[var(--sky-300)]"
                  }`}
                >
                  {on ? <Check size={13} strokeWidth={3} /> : null}
                  {conditionName({ key: k }, lang)}
                </button>
              );
            })}
          </div>
        </div>
      </Block>
    </div>
  );
}

/** A section card: a tinted icon, the title and hint, a tick once answered, and the "none" switch. */
function Block({ icon, tone, title, hint, done, none, children }: { icon: ReactNode; tone?: "danger"; title: string; hint?: string; done?: boolean; none?: ReactNode; children: ReactNode }) {
  const { t } = useT();
  return (
    <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-xs)">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--hair)] px-4 py-3">
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-(--radius-md) ${
            tone === "danger" ? "bg-[var(--red-tint)] text-[var(--red)]" : "bg-[var(--tint)] text-[var(--link)]"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-[200px] flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-semibold text-[var(--ink)]">
            {title}
            {done ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--green)]">
                <Check size={13} strokeWidth={3} /> {t("answered")}
              </span>
            ) : null}
          </p>
          {hint ? <p className="text-[12px] text-[var(--mute)]">{hint}</p> : null}
        </div>
        {none}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-(--radius-sm) border ${on ? "border-[var(--action)] bg-[var(--action)] text-white" : "border-[var(--color-border-input)] bg-[var(--white)]"}`}>
      {on ? <Check size={12} strokeWidth={3} /> : null}
    </span>
  );
}

/** "None" is its own answer, a switch in the section header — not one more item in the list. */
function NoneToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-2 rounded-(--radius-pill) border px-3 text-[12.5px] font-semibold transition-colors ${
        on ? "border-[var(--green)] bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "border-[var(--line)] bg-[var(--white)] text-[var(--body)] hover:border-[var(--green)]"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${on ? "border-[var(--green)] bg-[var(--green)] text-white" : "border-[var(--color-border-input)]"}`}>
        {on ? <Check size={10} strokeWidth={3.5} /> : null}
      </span>
      {label}
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-(--radius-md) border border-dashed border-[var(--sky-300)] text-[13px] font-semibold text-[var(--link)] hover:bg-[var(--tint)]"
    >
      <Plus size={15} /> {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center justify-self-end rounded-(--radius-md) text-[var(--mute)] hover:bg-[var(--red-tint)] hover:text-[var(--red)]">
      <Trash2 size={15} />
    </button>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <div role="radiogroup" className="inline-flex h-9 rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] p-0.5 text-[13px] font-semibold">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-[calc(var(--radius-md)-2px)] px-3 ${value === o.key ? "bg-[var(--action)] text-white" : "text-[var(--body)] hover:bg-[var(--sunken)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
