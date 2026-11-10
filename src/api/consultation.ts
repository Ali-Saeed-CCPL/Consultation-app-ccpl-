/* consult-api, consultation module (Ali): the patient's consultation from
   start to the queue, their records, the clinic's status; and the admin's
   records, reports and audit log. Maps the API's consultation to the app's own
   Consultation (lib/types.ts). */

import { api } from "@/api/client";
import { toProfile, type ProfileInputDTO } from "@/api/member";
import type { ConsultStatus, Consultation, Lang, Member } from "@/lib/types";

/* ── API shapes ──────────────────────────────────────────────────────────── */

export type Outcome = "prescribed" | "er" | "not_seen" | "ineligible" | "in_progress";

export interface ConsultationDTO {
  consult_id: string;
  ref_no: string;
  account_id: string;
  member_id: string;
  health_card_no: string | null;
  doctor_user_id: string | null;
  status: ConsultStatus;
  outcome: Outcome;
  language: Lang;
  consent_at: string | null;
  queued_at: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  first_released_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface IntakeDTO {
  complaint_codes: string[];
  other_complaint: string | null;
  duration_code: string;
  severity: number;
  details: string | null;
  red_flag_codes: string[];
  profile_snapshot: ProfileInputDTO | null;
  profile_confirmed: boolean;
}

export interface DoctorRef {
  user_id: string;
  full_name: string;
  pmdc_no: string;
}

export interface PatientRecordDTO {
  consultation: ConsultationDTO;
  intake: IntakeDTO | null;
  doctor: DoctorRef | null;
}

export interface QueuePlace {
  status: ConsultStatus;
  position: number | null;
  wait_seconds: number | null;
}

export interface IntakeInput {
  complaint_codes: string[];
  other_complaint: string | null;
  duration_code: string;
  severity: number;
  details: string | null;
  red_flag_codes: string[];
  profile_confirmed: boolean;
}

/* ── Patient calls ───────────────────────────────────────────────────────── */

const at = (id: string) => `/api/patient/consultations/${id}`;

export const consultApi = {
  records: () => api<PatientRecordDTO[]>("GET", "/api/patient/consultations"),
  clinic: () => api<{ doctors_free: number; waiting: number }>("GET", "/api/patient/clinic"),
  start: (member_id: string, language: Lang) => api<{ consultation: ConsultationDTO; resumed: boolean }>("POST", "/api/patient/consultations", { body: { member_id, language } }),
  get: (id: string) => api<{ consultation: ConsultationDTO; intake: IntakeDTO | null }>("GET", at(id)),
  consent: (id: string, consent_lang: Lang) => api<ConsultationDTO>("POST", `${at(id)}/consent`, { body: { consent_lang } }),
  submitIntake: (id: string, intake: IntakeInput) => api<ConsultationDTO>("PUT", `${at(id)}/intake`, { body: intake }),
  leave: (id: string) => api<ConsultationDTO>("POST", `${at(id)}/leave`),
  ping: (id: string) => api<QueuePlace>("POST", `${at(id)}/ping`),
};

/* ── Mapping to the app's Consultation ───────────────────────────────────── */

const ms = (iso: string | null) => (iso ? Date.parse(iso) : undefined);

/** `member` comes from the household (the API's consultation carries only the member's id). */
export function toConsultation(c: ConsultationDTO, intake: IntakeDTO | null, member: Member): Consultation {
  return {
    id: c.consult_id,
    ref: c.ref_no,
    householdPhone: c.account_id,
    member,
    lang: c.language,
    status: c.status,
    createdAt: Date.parse(c.created_at),
    consentAt: ms(c.consent_at),
    symptoms: intake
      ? {
          complaint: intake.complaint_codes.join(","),
          other: intake.other_complaint ?? undefined,
          duration: intake.duration_code,
          severity: intake.severity,
          details: intake.details ?? "",
          redFlags: intake.red_flag_codes,
        }
      : undefined,
    profile: intake?.profile_snapshot ? toProfile(intake.profile_snapshot) : undefined,
    profileConfirmed: intake?.profile_confirmed,
    prescriberId: c.doctor_user_id ?? undefined,
    declinedBy: [],
    callStartedAt: ms(c.call_started_at),
    callEndedAt: ms(c.call_ended_at),
    transcript: [],
    // The doctor's notes and the prescription come from the prescription module (Rameen) once it is connected.
    notes: { diagnosis: "", plan: "", followUp: "" },
    rx: [],
    rxVersion: c.first_released_at ? 1 : 0,
    approvedAt: ms(c.first_released_at),
    closedAt: ms(c.closed_at),
  };
}
