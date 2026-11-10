/* consult-api, member module (Ali): patient sign-in, activation and password
   reset; the household; health profiles. Also maps the API's shapes to the
   app's own (lib/types.ts), so the screens don't change with the source. */

import { api, tokens, type PatientTokens } from "@/api/client";
import type { HealthProfile, Member, Relation } from "@/lib/types";

/* ── API shapes ──────────────────────────────────────────────────────────── */

type AnswerStatus = "not_answered" | "none" | "listed";

export interface ProfileInputDTO {
  conditions_status: AnswerStatus;
  allergies_status: AnswerStatus;
  medicines_status: AnswerStatus;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  pregnancy: "no" | "yes" | "unsure" | null;
  smoking: "never" | "former" | "current" | null;
  surgeries_text: string | null;
  conditions: { condition_code: string; other_text: string | null; since_year: number | null }[];
  allergies: { kind: "medicine" | "food" | "other"; substance: string; reaction: string | null }[];
  medicines: { name: string; dose_text: string | null }[];
  family_history: string[];
}

export interface ProfileDTO extends ProfileInputDTO {
  row_version: number;
  updated_at: string;
}

export interface ProfileRead {
  profile: ProfileDTO | null;
  row_version: number;
}

export interface HouseholdMemberDTO {
  member_id: string;
  relation: Relation;
  full_name: string;
  gender: "M" | "F";
  age: number;
  is_covered: boolean;
  health_card_no: string | null;
  profile: { state: "complete" | "partial" | "empty"; row_version: number };
}

export interface HouseholdDTO {
  account: { account_id: string; preferred_language: string };
  policy: { policy_no: string; partner_name: string | null; client_name: string | null } | null;
  members: HouseholdMemberDTO[];
}

export interface ActivationStart {
  activation_ref: string;
  first_name: string;
  methods: { method: "sms" | "email" | "card_dob"; sent_to?: string }[];
}

export interface CodeSent {
  sent_to: string;
  channel: "sms" | "email";
  expires_at: string;
  /** Only from a local or dev API with no SMS gateway. */
  dev_code?: string;
}

export type Proof = { method: "code"; activation_ref?: string; code: string } | { method: "card_dob"; health_card_no: string; date_of_birth: string };

interface SignedIn {
  account_id: string;
  tokens: PatientTokens;
}

/* ── Calls ───────────────────────────────────────────────────────────────── */

const open = { auth: false } as const;

export const patientAuth = {
  async login(cnic: string, password: string) {
    const out = await api<SignedIn>("POST", "/api/patient/auth/login", { ...open, body: { cnic, password, device: navigator.userAgent.slice(0, 120) } });
    tokens.setPatient(out.tokens);
    return out.account_id;
  },
  startActivation: (cnic: string) => api<ActivationStart>("POST", "/api/patient/auth/activation/start", { ...open, body: { cnic } }),
  sendActivationCode: (cnic: string, activation_ref: string, channel: "sms" | "email") =>
    api<CodeSent>("POST", "/api/patient/auth/activation/send-code", { ...open, body: { cnic, activation_ref, channel } }),
  async completeActivation(cnic: string, proof: Proof, password: string) {
    const out = await api<SignedIn>("POST", "/api/patient/auth/activation/complete", { ...open, body: { cnic, proof, password } });
    tokens.setPatient(out.tokens);
    return out.account_id;
  },
  /** Sends a code if `channel` is given; without one, returns the ways the account can be proved. */
  startReset: (cnic: string, channel?: "sms" | "email") =>
    api<CodeSent | { methods: ActivationStart["methods"] }>("POST", "/api/patient/auth/password-reset/start", { ...open, body: { cnic, channel } }),
  completeReset: (cnic: string, proof: Proof, new_password: string) =>
    api<null>("POST", "/api/patient/auth/password-reset/complete", { ...open, body: { cnic, proof, new_password } }),
  async logout() {
    const refresh = tokens.refreshToken();
    try {
      if (refresh) await api<null>("POST", "/api/patient/auth/logout", { body: { refresh_token: refresh } });
    } finally {
      tokens.clear();
    }
  },
};

export const memberApi = {
  household: () => api<HouseholdDTO>("GET", "/api/patient/household"),
  /** `row_version` is 0 while the member has no profile; send it back with the next save. */
  profile: (memberId: string) => api<ProfileRead>("GET", `/api/patient/members/${memberId}/health-profile`),
  saveProfile: (memberId: string, profile: ProfileInputDTO, rowVersion: number) =>
    api<ProfileDTO>("PUT", `/api/patient/members/${memberId}/health-profile`, { body: { row_version: rowVersion, profile } }),
};

/* ── Mapping to the app's shapes ─────────────────────────────────────────── */

export function toMember(m: HouseholdMemberDTO): Member {
  return {
    id: m.member_id,
    name: m.full_name,
    // CCPL gives names in English only.
    nameUr: m.full_name,
    relation: m.relation,
    age: m.age,
    gender: m.gender,
    mrn: m.health_card_no ?? "",
    coverage: m.is_covered ? "active" : "lapsed",
  };
}

const list = <T,>(status: AnswerStatus, items: T[]): T[] | null => (status === "not_answered" ? null : items);
const statusOf = (items: unknown[] | null): AnswerStatus => (items === null ? "not_answered" : items.length ? "listed" : "none");
const num = (s: string) => (s.trim() && Number.isFinite(Number(s)) ? Number(s) : null);

export function toProfile(p: ProfileInputDTO & { updated_at?: string }): HealthProfile {
  return {
    bloodGroup: p.blood_group ?? "",
    heightCm: p.height_cm === null ? "" : String(p.height_cm),
    weightKg: p.weight_kg === null ? "" : String(p.weight_kg),
    pregnant: p.pregnancy ?? undefined,
    conditions: list(p.conditions_status, p.conditions.map((c) => ({ key: c.condition_code, name: c.other_text ?? undefined, since: c.since_year ? String(c.since_year) : undefined }))),
    allergies: list(p.allergies_status, p.allergies.map((a) => ({ kind: a.kind, name: a.substance, reaction: a.reaction ?? "" }))),
    medicines: list(p.medicines_status, p.medicines.map((m) => ({ name: m.name, dose: m.dose_text ?? "" }))),
    history: p.surgeries_text ?? "",
    smoking: p.smoking ?? "",
    family: p.family_history,
    updatedAt: p.updated_at ? Date.parse(p.updated_at) : 0,
  };
}

export function fromProfile(p: HealthProfile): ProfileInputDTO {
  const year = (s?: string) => (s && /^\d{4}$/.test(s.trim()) ? Number(s.trim()) : null);
  return {
    conditions_status: statusOf(p.conditions),
    allergies_status: statusOf(p.allergies),
    medicines_status: statusOf(p.medicines),
    blood_group: p.bloodGroup || null,
    height_cm: num(p.heightCm),
    weight_kg: num(p.weightKg),
    pregnancy: p.pregnant ?? null,
    smoking: p.smoking || null,
    surgeries_text: p.history.trim() || null,
    conditions: (p.conditions ?? []).map((c) => ({ condition_code: c.key, other_text: c.key === "other" ? c.name?.trim() || null : null, since_year: year(c.since) })),
    allergies: (p.allergies ?? []).map((a) => ({ kind: a.kind, substance: a.name.trim(), reaction: a.reaction.trim() || null })),
    medicines: (p.medicines ?? []).map((m) => ({ name: m.name.trim(), dose_text: m.dose.trim() || null })),
    family_history: p.family,
  };
}
