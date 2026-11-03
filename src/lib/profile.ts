/* Health profiles — the checklists the Members page asks from, what counts as
   complete, the one-line summaries the patient and the doctor see, and the
   prescription safety check (allergies, conditions, pregnancy and the medicines
   they already take) shown to the doctor beside the AI draft. */

import type { HealthProfile, Lang, Member, RxItem } from "@/lib/types";

export const CONDITIONS = [
  { key: "diabetes", en: "Diabetes", ur: "شوگر (ذیابیطس)" },
  { key: "hypertension", en: "High blood pressure", ur: "ہائی بلڈ پریشر" },
  { key: "heart", en: "Heart disease", ur: "دل کی بیماری" },
  { key: "asthma", en: "Asthma or COPD", ur: "دمہ یا سانس کی بیماری" },
  { key: "thyroid", en: "Thyroid problem", ur: "تھائیرائیڈ" },
  { key: "kidney", en: "Kidney disease", ur: "گردے کی بیماری" },
  { key: "liver", en: "Liver disease or hepatitis", ur: "جگر کی بیماری یا ہیپاٹائٹس" },
  { key: "epilepsy", en: "Epilepsy or fits", ur: "مرگی یا دورے" },
  { key: "stomachUlcer", en: "Stomach ulcer", ur: "معدے کا السر" },
  { key: "mental", en: "Anxiety or depression", ur: "بے چینی یا ڈپریشن" },
  { key: "other", en: "Something else", ur: "کچھ اور" },
] as const;

/** What runs in the family — a shorter list. */
export const FAMILY_CONDITIONS = ["diabetes", "hypertension", "heart", "asthma", "cancer"] as const;
const CANCER = { key: "cancer", en: "Cancer", ur: "کینسر" };

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

export const ALLERGY_KINDS = [
  { key: "medicine", en: "Medicine", ur: "دوا" },
  { key: "food", en: "Food", ur: "کھانا" },
  { key: "other", en: "Other", ur: "دیگر" },
] as const;

export const SMOKING = [
  { key: "never", en: "Never", ur: "کبھی نہیں" },
  { key: "former", en: "Used to", ur: "پہلے پیتے تھے" },
  { key: "current", en: "Yes, now", ur: "ہاں، اب بھی" },
] as const;

export const emptyProfile = (): HealthProfile => ({
  bloodGroup: "",
  heightCm: "",
  weightKg: "",
  conditions: null,
  allergies: null,
  medicines: null,
  history: "",
  smoking: "",
  family: [],
  updatedAt: 0,
});

/** Pregnancy is asked of female members of child-bearing age. */
export const asksPregnancy = (m: Pick<Member, "gender" | "age">) => m.gender === "F" && m.age >= 12 && m.age <= 50;

/** The three answers the doctor needs: conditions, allergies and medicines (each may be "none"). */
export function profileGaps(p: HealthProfile | undefined, m?: Pick<Member, "gender" | "age">): ("conditions" | "allergies" | "medicines" | "pregnant")[] {
  const gaps: ("conditions" | "allergies" | "medicines" | "pregnant")[] = [];
  if (!p || p.conditions === null) gaps.push("conditions");
  if (!p || p.allergies === null) gaps.push("allergies");
  if (!p || p.medicines === null) gaps.push("medicines");
  if (m && asksPregnancy(m) && !p?.pregnant) gaps.push("pregnant");
  return gaps;
}
export const isProfileComplete = (p: HealthProfile | undefined, m?: Pick<Member, "gender" | "age">) => profileGaps(p, m).length === 0;

/** Anything at all filled in. The profile is optional: without it the doctor asks on the call. */
export const hasHistory = (p: HealthProfile | undefined): p is HealthProfile =>
  Boolean(p && (p.conditions !== null || p.allergies !== null || p.medicines !== null || p.bloodGroup || p.heightCm || p.weightKg || p.history || p.smoking || p.family.length || p.pregnant));

export type ProfileState = "complete" | "partial" | "empty";
export const profileState = (p: HealthProfile | undefined, m: Pick<Member, "gender" | "age">): ProfileState =>
  isProfileComplete(p, m) ? "complete" : hasHistory(p) ? "partial" : "empty";

/** The three key answers given (conditions, allergies, medicines). */
export const keyAnswered = (p: HealthProfile | undefined) => (p ? [p.conditions, p.allergies, p.medicines].filter((x) => x !== null).length : 0);

export function conditionName(c: { key: string; name?: string }, lang: Lang = "en") {
  if (c.key === "other") return c.name?.trim() || (lang === "ur" ? "کچھ اور" : "Other");
  const hit = [...CONDITIONS, CANCER].find((x) => x.key === c.key);
  return hit ? hit[lang] : c.key;
}

/** "Diabetes (since 2015), High blood pressure" — or null when not answered. */
export function conditionsText(p: HealthProfile | undefined, lang: Lang = "en"): string | null {
  if (!p || p.conditions === null) return null;
  return p.conditions.map((c) => conditionName(c, lang) + (c.since ? (lang === "ur" ? ` (${c.since} سے)` : ` (since ${c.since})`) : "")).join(", ");
}
export function allergiesText(p: HealthProfile | undefined): string | null {
  if (!p || p.allergies === null) return null;
  return p.allergies.map((a) => a.name + (a.reaction ? ` (${a.reaction})` : "")).join(", ");
}
export function medicinesText(p: HealthProfile | undefined): string | null {
  if (!p || p.medicines === null) return null;
  return p.medicines.map((m) => [m.name, m.dose].filter(Boolean).join(" ")).join(", ");
}

/** Body-mass index, when height and weight are both given. */
export function bmi(p: HealthProfile | undefined): number | null {
  const h = Number(p?.heightCm) / 100;
  const w = Number(p?.weightKg);
  return h > 0.5 && w > 2 ? Math.round((w / (h * h)) * 10) / 10 : null;
}

export const bmiBand = (v: number) => (v < 18.5 ? "under" : v < 25 ? "normal" : v < 30 ? "over" : "obese");

/* ── Prescription safety check ──────────────────────────────────────────── */

/** Medicines by family, so "allergic to penicillin" catches amoxicillin. Lower-case name fragments. */
const DRUG_CLASSES: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "amoxil", "ampicillin", "augmentin", "co-amoxiclav", "cloxacillin", "flucloxacillin"],
  cephalosporin: ["cef", "ceph"],
  sulfa: ["sulfa", "sulpha", "co-trimoxazole", "septran", "bactrim"],
  nsaid: ["ibuprofen", "brufen", "diclofenac", "voltaren", "naproxen", "mefenamic", "ponstan", "aspirin", "disprin", "ketorolac", "celecoxib"],
  macrolide: ["azithromycin", "clarithromycin", "erythromycin"],
  quinolone: ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin"],
  tetracycline: ["doxycycline", "tetracycline", "minocycline"],
  steroid: ["prednisolone", "dexamethasone", "hydrocortisone", "methylprednisolone"],
  decongestant: ["pseudoephedrine", "phenylephrine", "ephedrine"],
  betablocker: ["propranolol", "atenolol", "metoprolol", "bisoprolol"],
  codeine: ["codeine", "tramadol"],
};
const ALLERGY_ALIASES: Record<string, string> = { penicillin: "penicillin", amoxicillin: "penicillin", sulfa: "sulfa", sulpha: "sulfa", nsaid: "nsaid", aspirin: "nsaid", ibuprofen: "nsaid", brufen: "nsaid" };

const classesOf = (drug: string) => {
  const d = drug.toLowerCase();
  return Object.entries(DRUG_CLASSES)
    .filter(([, names]) => names.some((n) => d.includes(n)))
    .map(([k]) => k);
};

/** Classes that need care with a condition (or pregnancy), and why. */
const CONDITION_CAUTIONS: { when: string; classes: string[]; why: string }[] = [
  { when: "hypertension", classes: ["nsaid", "decongestant", "steroid"], why: "can raise blood pressure" },
  { when: "heart", classes: ["nsaid", "decongestant"], why: "strains the heart" },
  { when: "kidney", classes: ["nsaid"], why: "can harm the kidneys" },
  { when: "asthma", classes: ["nsaid", "betablocker"], why: "can bring on wheeze" },
  { when: "stomachUlcer", classes: ["nsaid", "steroid"], why: "can make an ulcer bleed" },
  { when: "diabetes", classes: ["steroid"], why: "raises blood sugar" },
  { when: "liver", classes: ["codeine"], why: "is cleared by the liver" },
  { when: "pregnant", classes: ["nsaid", "quinolone", "tetracycline", "codeine"], why: "is best avoided in pregnancy" },
];

export interface RxWarning {
  /** The prescription line it's about. */
  itemId: string;
  level: "danger" | "caution";
  text: string;
}

/** Checks each medicine against the profile. Advisory — the doctor decides. */
export function rxWarnings(rx: RxItem[], p: HealthProfile | undefined): RxWarning[] {
  if (!p) return [];
  const out: RxWarning[] = [];
  const conditionKeys = new Set((p.conditions ?? []).map((c) => c.key));
  if (p.pregnant === "yes" || p.pregnant === "unsure") conditionKeys.add("pregnant");
  for (const item of rx) {
    const drug = item.drug.trim();
    if (!drug) continue;
    const lower = drug.toLowerCase();
    const classes = classesOf(drug);
    for (const a of p.allergies ?? []) {
      const name = a.name.trim().toLowerCase();
      if (!name || a.kind === "food") continue;
      const aliasClass = ALLERGY_ALIASES[name] ?? Object.keys(DRUG_CLASSES).find((k) => classesOf(name).includes(k));
      if (lower.includes(name) || (aliasClass && classes.includes(aliasClass))) {
        out.push({ itemId: item.id, level: "danger", text: `${drug.split(" ")[0]}: allergic to ${a.name}${a.reaction ? ` (${a.reaction})` : ""}` });
      }
    }
    for (const c of CONDITION_CAUTIONS) {
      if (!conditionKeys.has(c.when) || !classes.some((k) => c.classes.includes(k))) continue;
      const who = c.when === "pregnant" ? (p.pregnant === "yes" ? "pregnant" : "may be pregnant") : conditionName({ key: c.when }).toLowerCase();
      out.push({ itemId: item.id, level: "caution", text: `${drug.split(" ")[0]} ${c.why} — patient: ${who}` });
    }
    for (const m of p.medicines ?? []) {
      const first = m.name.trim().toLowerCase().split(/\s+/)[0];
      if (first && first.length > 3 && lower.includes(first)) out.push({ itemId: item.id, level: "caution", text: `Already taking ${m.name}${m.dose ? ` ${m.dose}` : ""}` });
    }
  }
  return out;
}

/* ── Prescribing considerations ─────────────────────────────────────────── */

const CLASS_LABEL: Record<string, string> = {
  nsaid: "NSAIDs (ibuprofen, diclofenac, aspirin)",
  decongestant: "decongestants (pseudoephedrine, phenylephrine)",
  steroid: "oral steroids",
  betablocker: "beta-blockers",
  quinolone: "quinolones",
  tetracycline: "tetracyclines",
  codeine: "codeine and tramadol",
};

export interface Consideration {
  level: "danger" | "caution" | "info";
  text: string;
}

/** What to weigh before prescribing, from the profile and the member's age — for the doctor's History tab. */
export function considerations(p: HealthProfile | undefined, m: Pick<Member, "age">): Consideration[] {
  const out: Consideration[] = [];
  for (const a of p?.allergies ?? []) {
    if (a.kind === "food") out.push({ level: "caution", text: `Food allergy: ${a.name}${a.reaction ? ` (${a.reaction})` : ""} — check syrups and excipients` });
    else out.push({ level: "danger", text: `Avoid ${a.name} and related medicines${a.reaction ? ` — reacted with ${a.reaction.toLowerCase()}` : ""}` });
  }
  const keys = new Set((p?.conditions ?? []).map((c) => c.key));
  if (p?.pregnant === "yes" || p?.pregnant === "unsure") keys.add("pregnant");
  for (const c of CONDITION_CAUTIONS) {
    if (!keys.has(c.when)) continue;
    const who = c.when === "pregnant" ? (p?.pregnant === "yes" ? "Pregnant" : "May be pregnant") : conditionName({ key: c.when });
    out.push({ level: "caution", text: `${who}: take care with ${c.classes.map((k) => CLASS_LABEL[k] ?? k).join(", ")}` });
  }
  if (p?.medicines?.length) out.push({ level: "caution", text: `Check interactions with ${p.medicines.map((x) => x.name).join(", ")}` });
  if (m.age < 12) out.push({ level: "info", text: p?.weightKg ? `Child — dose by weight (${p.weightKg} kg)` : "Child — dose by weight; weight not given, ask" });
  else if (m.age >= 65) out.push({ level: "info", text: "Older adult — start low, watch kidney function and falls risk" });
  return out;
}
