/* What the patient screens read and do, from one place. With VITE_API_URL set
   (api/client.ts USE_API) everything comes from consult-api; without it, from
   the local demo store as before. The screens get the app's own shapes
   (Member, Consultation, HealthProfile) either way.

   USE_API is fixed when the app loads, so each hook always calls the same
   hooks in the same order (the rules of hooks hold). */

import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { USE_API } from "@/api/client";
import { consultApi, toConsultation, type PatientRecordDTO } from "@/api/consultation";
import { fromProfile, memberApi, toMember, toProfile, type HouseholdDTO, type ProfileRead } from "@/api/member";
import { HOUSEHOLD } from "@/data/seed";
import { complaintKeys } from "@/lib/complaint";
import { isClinicOpen } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";
import type { Consultation, Doctor, HealthProfile, Lang, Member, Symptoms } from "@/lib/types";

export interface Household {
  policy: string;
  partner: string;
  members: Member[];
}

/** `loading` is true only until the first answer; `data` is then set (or the screen shows `error`). */
export interface Loaded<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

const keys = {
  household: ["patient", "household"] as const,
  profile: (memberId: string) => ["patient", "profile", memberId] as const,
  records: ["patient", "records"] as const,
  consult: (id: string) => ["patient", "consult", id] as const,
  clinic: ["patient", "clinic"] as const,
};

const initials = (name: string) => {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR";
};

const done = <T,>(data: T | undefined): Loaded<T> => ({ data, loading: false, error: null });

/* ── Household and profiles ─────────────────────────────────────────────── */

function useHouseholdQuery() {
  return useQuery({ queryKey: keys.household, queryFn: memberApi.household, enabled: USE_API });
}

const toHousehold = (h: HouseholdDTO): Household => ({
  policy: h.policy?.policy_no ?? "",
  partner: h.policy?.partner_name ?? h.policy?.client_name ?? "",
  members: h.members.map(toMember),
});

export function useHousehold(): Loaded<Household> {
  const q = useHouseholdQuery();
  const data = useMemo(() => (q.data ? toHousehold(q.data) : undefined), [q.data]);
  if (!USE_API) return done(HOUSEHOLD);
  return { data, loading: q.isPending, error: q.error };
}

/** Every member's full health profile, by member id (absent = never filled in). */
export function useProfiles(): Loaded<Record<string, HealthProfile>> {
  const demo = usePlatform((s) => s.profiles);
  const household = useHouseholdQuery();
  const ids = household.data?.members.map((m) => m.member_id) ?? [];
  const results = useQueries({
    queries: (USE_API ? ids : []).map((id) => ({ queryKey: keys.profile(id), queryFn: () => memberApi.profile(id) })),
  });
  const pending = household.isPending || results.some((r) => r.isPending);
  const error = household.error ?? results.find((r) => r.error)?.error ?? null;
  const stamp = results.map((r) => r.dataUpdatedAt).join();
  const data = useMemo(() => {
    if (pending) return undefined;
    const out: Record<string, HealthProfile> = {};
    ids.forEach((id, i) => {
      const p = results[i]?.data?.profile;
      if (p) out[id] = toProfile(p);
    });
    return out;
  }, [pending, stamp]); // eslint-disable-line react-hooks/exhaustive-deps -- results change identity every render
  if (!USE_API) return done(demo);
  return { data, loading: pending, error };
}

/* ── Consultations ──────────────────────────────────────────────────────── */

function useRecordsQuery() {
  return useQuery({ queryKey: keys.records, queryFn: consultApi.records, enabled: USE_API });
}

const memberOf = (members: Member[], id: string): Member =>
  members.find((m) => m.id === id) ?? { id, name: "—", nameUr: "—", relation: "self", age: 0, gender: "M", mrn: "", coverage: "active" };

/** The household's consultations past the intake form, newest first. */
export function useConsultations(): Loaded<Consultation[]> {
  const phone = useSession((s) => s.patientPhone);
  const all = usePlatform((s) => s.consultations);
  const household = useHousehold();
  const records = useRecordsQuery();
  const data = useMemo(
    () => (records.data && household.data ? records.data.map((r) => toConsultation(r.consultation, r.intake, memberOf(household.data!.members, r.consultation.member_id))) : undefined),
    [records.data, household.data],
  );
  const demo = useMemo(() => all.filter((c) => c.householdPhone === phone).sort((a, b) => b.createdAt - a.createdAt), [all, phone]);
  if (!USE_API) return done(demo);
  return { data, loading: records.isPending || household.loading, error: records.error ?? household.error };
}

/** One consultation (the one this tab is walking through), at any stage. */
export function useConsultation(id: string | null | undefined): Loaded<Consultation> {
  const demo = usePlatform((s) => (id ? s.consultations.find((c) => c.id === id) : undefined));
  const household = useHousehold();
  const q = useQuery({ queryKey: keys.consult(id ?? "none"), queryFn: () => consultApi.get(id!), enabled: USE_API && Boolean(id) });
  const data = useMemo(
    () => (q.data && household.data ? toConsultation(q.data.consultation, q.data.intake, memberOf(household.data.members, q.data.consultation.member_id)) : undefined),
    [q.data, household.data],
  );
  if (!USE_API) return done(demo);
  if (!id) return done<Consultation>(undefined);
  return { data, loading: q.isPending || household.loading, error: q.error ?? household.error };
}

/** Whether the consultation's prescription has been released. The API keeps when it was (approvedAt);
    the demo store marks it by status. */
export const isReleased = (c: Consultation) => (USE_API ? Boolean(c.approvedAt) : c.status === "approved" || c.status === "closed");

/** The reference people see: DC-… */
export const refOf = (c: Consultation) => c.ref ?? c.id;

/** Who a doctor is, by id: from the records (API) or the demo roster. */
export function useDoctorLookup(): (id?: string) => Doctor | undefined {
  const roster = usePlatform((s) => s.doctors);
  const records = useRecordsQuery();
  return useMemo(() => {
    if (!USE_API) return (id?: string) => roster.find((d) => d.id === id);
    const byId = new Map<string, Doctor>();
    for (const r of records.data ?? ([] as PatientRecordDTO[])) {
      // Availability isn't part of a record; these cards only name the doctor.
      if (r.doctor) byId.set(r.doctor.user_id, { id: r.doctor.user_id, name: r.doctor.full_name, initials: initials(r.doctor.full_name), pmdc: r.doctor.pmdc_no, role: "gp", available: false });
    }
    return (id?: string) => (id ? byId.get(id) : undefined);
  }, [roster, records.data]);
}

/** The clinic right now: doctors free to take a call, and patients waiting. */
export function useClinicNow(): { free: number; waiting: number } {
  const doctors = usePlatform((s) => s.doctors);
  const consultations = usePlatform((s) => s.consultations);
  const q = useQuery({ queryKey: keys.clinic, queryFn: consultApi.clinic, enabled: USE_API, refetchInterval: 30_000 });
  if (USE_API) return { free: q.data?.doctors_free ?? 0, waiting: q.data?.waiting ?? 0 };
  const busy = new Set(consultations.filter((c) => c.status === "in_call" || c.status === "ringing").map((c) => c.prescriberId));
  return { free: doctors.filter((d) => d.available && !busy.has(d.id)).length, waiting: consultations.filter((c) => c.status === "queued").length };
}

/** Whether the clinic is taking calls (the demo can force it open). */
export function useClinicOpen(now?: number): boolean {
  const forceOpen = usePlatform((s) => s.forceClinicOpen);
  return (!USE_API && forceOpen) || isClinicOpen(now);
}

/* ── What the patient does ───────────────────────────────────────────────── */

export function usePatientActions() {
  const qc = useQueryClient();
  const platform = usePlatform.getState;
  const phone = useSession((s) => s.patientPhone);
  const refresh = (id?: string) =>
    Promise.all([qc.invalidateQueries({ queryKey: keys.records }), qc.invalidateQueries({ queryKey: keys.household }), id ? qc.invalidateQueries({ queryKey: keys.consult(id) }) : null]);

  /** Opens a consultation for the member, or carries on with the one already open for them. Returns its id. */
  const start = useMutation({
    mutationFn: async ({ member, lang }: { member: Member; lang: Lang }) => {
      if (!USE_API) return platform().startConsultation(phone!, member, lang).id;
      const { consultation } = await consultApi.start(member.id, lang);
      qc.setQueryData(keys.consult(consultation.consult_id), { consultation, intake: null });
      return consultation.consult_id;
    },
    onSuccess: () => refresh(),
  });

  const consent = useMutation({
    mutationFn: async ({ id, lang }: { id: string; lang: Lang }) => {
      if (!USE_API) return platform().giveConsent(id);
      await consultApi.consent(id, lang);
    },
    onSuccess: (_d, v) => refresh(v.id),
  });

  /** Sends the symptoms. Returns where the patient goes next: emergency guidance or the queue. */
  const submitSymptoms = useMutation({
    mutationFn: async ({ id, symptoms, profile, profileConfirmed }: { id: string; symptoms: Symptoms; profile?: HealthProfile; profileConfirmed: boolean }) => {
      if (!USE_API) {
        platform().submitSymptoms(id, symptoms, profile, profileConfirmed);
        return symptoms.redFlags.length ? "emergency" : "queued";
      }
      const c = await consultApi.submitIntake(id, {
        complaint_codes: complaintKeys(symptoms.complaint),
        other_complaint: symptoms.other?.trim() || null,
        duration_code: symptoms.duration,
        severity: symptoms.severity,
        details: symptoms.details.trim() || null,
        red_flag_codes: symptoms.redFlags,
        profile_confirmed: profileConfirmed,
      });
      return c.status;
    },
    onSuccess: (_d, v) => refresh(v.id),
  });

  const saveProfile = useMutation({
    mutationFn: async ({ member, profile }: { member: Member; profile: HealthProfile }) => {
      if (!USE_API) return platform().saveProfile(member, profile);
      // The version this screen loaded: the API refuses a save over someone else's newer one (409).
      const current = qc.getQueryData<ProfileRead>(keys.profile(member.id));
      const saved = await memberApi.saveProfile(member.id, fromProfile(profile), current?.row_version ?? 0);
      qc.setQueryData<ProfileRead>(keys.profile(member.id), { profile: saved, row_version: saved.row_version });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.household }),
  });

  const leave = useMutation({
    mutationFn: async (id: string) => {
      if (!USE_API) return platform().leaveQueue(id);
      await consultApi.leave(id);
    },
    onSuccess: (_d, id) => refresh(id),
  });

  return { start, consent, submitSymptoms, saveProfile, leave };
}

export const patientKeys = keys;
