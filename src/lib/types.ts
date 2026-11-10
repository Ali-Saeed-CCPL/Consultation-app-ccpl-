/* Digital Consultation domain model — one Consultation is one patient's
   journey from joining the queue to a released, doctor-approved prescription
   (see "Patient journey" flow: sign-in → choose patient → consent → symptoms →
   queue → video consult → AI-drafted notes & prescription → doctor approves → release). */

export type Lang = "en" | "ur";

export type Relation = "self" | "spouse" | "child" | "parent";

export interface Member {
  id: string;
  name: string;
  /** Name in Urdu script, shown when the patient app is in Urdu. */
  nameUr: string;
  relation: Relation;
  age: number;
  gender: "M" | "F";
  /** Centegy HIS membership number. */
  mrn: string;
  /** What the Centegy HIS eligibility call returns for this member. */
  coverage: "active" | "lapsed" | "unverifiable";
}

/** A long-term condition from the checklist (lib/profile.ts), or "other" in the patient's words. */
export interface ProfileCondition {
  key: string;
  /** Free text for "other". */
  name?: string;
  /** Year it started, if they know it. */
  since?: string;
}

export interface ProfileAllergy {
  kind: "medicine" | "food" | "other";
  name: string;
  reaction: string;
}

export interface ProfileMedicine {
  name: string;
  dose: string;
}

/** A household member's health profile, filled in on the Members page and
    confirmed at each consultation. The three lists are null until answered —
    "none" is an explicit answer ([]), not a default. */
export interface HealthProfile {
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  /** Asked of female members aged 12–50. */
  pregnant?: "no" | "yes" | "unsure";
  conditions: ProfileCondition[] | null;
  allergies: ProfileAllergy[] | null;
  medicines: ProfileMedicine[] | null;
  /** Past operations or hospital stays, in their words. */
  history: string;
  smoking: "" | "never" | "former" | "current";
  /** Condition keys that run in the family. */
  family: string[];
  updatedAt: number;
}

export interface Household {
  phone: string;
  policy: string;
  partner: string;
  members: Member[];
}

export type DoctorRole = "gp";

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  pmdc: string;
  role: DoctorRole;
  available: boolean;
  /** Set by the clinic admin. An inactive doctor is off the rota and can't go available. Missing = active. */
  active?: boolean;
  /** consult-api's id for this doctor (staff user_id). Missing = a demo-only doctor the backend doesn't know. */
  userId?: string;
  /** Their sign-in name, from consult-api. */
  username?: string;
}

export type ConsultStatus =
  | "intake" // eligible; consent and symptoms still being filled in
  | "ineligible" // Centegy said no / couldn't verify — CCPL support follows up (cover check off for now; kept for old records)
  | "emergency" // red flags → sent to ER, never queued
  | "queued" // waiting for a free GP
  | "ringing" // pushed to a GP's open portal
  | "in_call"
  | "drafting" // legacy: approval after the call, retired — the store migrates any to "approved"
  | "approved" // released to the patient (portal + email)
  | "closed";

export interface Symptoms {
  complaint: string;
  /** The patient's own words when the complaint is "other" (Something else). */
  other?: string;
  duration: string;
  severity: number;
  details: string;
  redFlags: string[];
}

export interface TranscriptLine {
  id: string;
  at: number;
  speaker: "doctor" | "patient";
  lang: Lang;
  text: string;
  /** English rendering of an Urdu line. */
  gloss?: string;
}

/** A typed message in the call's chat box (Meet-style "in-call messages"). */
export interface ChatMessage {
  id: string;
  at: number;
  from: "doctor" | "patient";
  text: string;
}

export interface RxItem {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface ClinicalNotes {
  diagnosis: string;
  plan: string;
  followUp: string;
}

export interface Consultation {
  id: string;
  householdPhone: string;
  member: Member;
  lang: Lang;
  status: ConsultStatus;
  createdAt: number;
  consentAt?: number;
  symptoms?: Symptoms;
  /** The member's health profile as confirmed with the symptoms — kept as it was that day. */
  profile?: HealthProfile;
  /** The patient said at intake that the profile is up to date (else it's as last saved on the Members page). */
  profileConfirmed?: boolean;
  /** The GP who took the call and wrote the prescription. */
  prescriberId?: string;
  /** Doctors who let the call ring through ("later"); not rung again for this one. */
  declinedBy: string[];
  callStartedAt?: number;
  callEndedAt?: number;
  transcript: TranscriptLine[];
  /** In-call chat between the patient and the doctor; kept with the consultation. */
  chat?: ChatMessage[];
  /** Prototype only: this call plays the scripted transcript and gets AI suggestions. */
  scripted?: boolean;
  /** Prototype only: answered by the demo auto-answer, with no doctor tab open —
      the patient's tab plays the transcript instead. */
  autoAnswered?: boolean;
  notes: ClinicalNotes;
  rx: RxItem[];
  /** Bumps each time the doctor approves, so the released prescription is a specific version. */
  rxVersion: number;
  /** Notes & prescription were filled in by AI assist and still need the doctor's check. */
  aiDrafted?: boolean;
  approvedAt?: number;
  closedAt?: number;
}

export interface AuditEvent {
  id: string;
  at: number;
  consultId: string;
  actor: string;
  actorRole: "patient" | "platform" | "ai" | "doctor" | "support" | "admin";
  action: string;
  detail?: string;
}
