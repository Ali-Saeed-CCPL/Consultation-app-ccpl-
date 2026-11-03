/* The platform, as far as the prototype is concerned. Stands in for ccpl-api's
   consultation service: queueing and GP assignment, call state, transcript,
   AI-drafted notes & prescription, the doctor's approval and the audit log.

   Persisted to localStorage and re-read whenever another tab writes it, so a
   patient tab and a doctor tab open side by side behave like the real thing —
   the patient joins the queue and the doctor's portal rings (in production
   that push is a WebSocket from the backend). */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_ACCOUNTS, DOCTORS, SEED_AUDIT, SEED_CONSULTATIONS } from "@/data/seed";
import { isClinicOpen } from "@/lib/clinic";
import { complaintText } from "@/lib/complaint";
import type {
  AuditEvent,
  ClinicalNotes,
  Consultation,
  Doctor,
  Lang,
  Member,
  RxItem,
  Symptoms,
  TranscriptLine,
} from "@/lib/types";

const STORE_KEY = "dc-platform";

type Actor = Pick<AuditEvent, "actor" | "actorRole">;

interface PlatformState {
  consultations: Consultation[];
  doctors: Doctor[];
  /** Sign-ins the clinic admin created for doctors (the demo accounts are in data/seed.ts).
      ponytail: plain demo store — ccpl-api auth replaces it; never real passwords here. */
  logins: DoctorLogin[];
  audit: AuditEvent[];
  /** Demo switch: treat the clinic as open whatever the clock says. */
  forceClinicOpen: boolean;
  /** Demo switch: a waiting patient is connected after a few seconds even with no doctor tab open. */
  autoConnect: boolean;

  // patient side
  /** Opens a consultation for a household member. Everyone on the policy is eligible for now (no cover check). */
  startConsultation: (phone: string, member: Member, lang: Lang) => Consultation;
  giveConsent: (id: string) => void;
  submitSymptoms: (id: string, symptoms: Symptoms) => void;
  leaveQueue: (id: string) => void;

  // doctor side
  setAvailability: (doctorId: string, available: boolean) => void;
  acceptCall: (id: string, doctorId: string) => void;
  declineCall: (id: string, doctorId: string) => void;
  /** Demo auto-answer: put a waiting patient straight into a call with a GP. */
  demoConnect: (id: string) => void;
  appendTranscript: (id: string, line: Omit<TranscriptLine, "id" | "at">) => void;
  /** The doctor opened an auto-answered call: their tab now plays the transcript, so only one tab writes the consult. */
  claimTranscript: (id: string) => void;
  endCall: (id: string, doctorId: string) => void;
  saveDraft: (id: string, notes: ClinicalNotes, rx: RxItem[]) => void;
  /** The consulting doctor signs off the (AI-drafted, doctor-checked) prescription and it's released. */
  approve: (id: string, doctorId: string) => void;
  closeConsult: (id: string, doctorId: string) => void;

  // admin side
  /** Adds a GP to the roster (off the rota until they go available). Fails on a PMDC number already in use. */
  addDoctor: (input: { name: string; pmdc: string; username: string; password: string }) => { ok: true; id: string } | { ok: false; error: string };
  /** Edits a GP and their sign-in (a blank password keeps the current one). Deactivating also takes them off the rota. */
  updateDoctor: (id: string, input: { name: string; pmdc: string; active: boolean; username: string; password: string }) => { ok: true } | { ok: false; error: string };

  setForceClinicOpen: (on: boolean) => void;
  setAutoConnect: (on: boolean) => void;
  resetDemo: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const ADMIN: Actor = { actor: "Clinic admin", actorRole: "admin" };
export interface DoctorLogin {
  doctorId: string;
  username: string;
  password: string;
}

/** Validates a doctor sign-in: username 3+ letters/digits/._-, unique across all accounts; password 6+
    characters (required for a new login, blank keeps the old one). Returns the cleaned login or an error. */
function checkLogin(others: DoctorLogin[], username: string, password: string, needPassword: boolean): { username: string; password: string } | string {
  const u = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(u)) return "Username: at least 3 characters — letters, numbers, dot, dash or underscore.";
  if (DEMO_ACCOUNTS.some((a) => a.username === u) || others.some((l) => l.username === u)) return "That username is already taken.";
  if ((needPassword || password) && password.length < 6) return "Password: at least 6 characters.";
  return { username: u, password };
}

/** "Dr. Ayesha Khan" → "AK": skips the title, first and last names. */
function initialsFrom(name: string) {
  const parts = name.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR";
}
const doctorName = (doctors: Doctor[], id?: string) => doctors.find((d) => d.id === id)?.name ?? "Unknown doctor";

function nextId(consultations: Consultation[]): string {
  const max = consultations.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0), 24000);
  return `DC-${max + 1}`;
}

/** A GP is free when available and not already ringing or on a call. */
function busyDoctors(consultations: Consultation[]): Set<string> {
  return new Set(
    consultations.filter((c) => c.status === "ringing" || c.status === "in_call").map((c) => c.prescriberId!),
  );
}

/**
 * Queue & assign GP: walk the queue oldest first and ring the first free GP
 * who hasn't already let this patient's call go. Runs after every change
 * that can free a GP or add a patient.
 */
function assign(state: Pick<PlatformState, "consultations" | "doctors" | "forceClinicOpen">) {
  if (!state.forceClinicOpen && !isClinicOpen()) return { consultations: state.consultations, events: [] as AuditEvent[] };
  const busy = busyDoctors(state.consultations);
  const events: AuditEvent[] = [];
  const queue = state.consultations
    .filter((c) => c.status === "queued")
    .sort((a, b) => a.createdAt - b.createdAt);
  const rung = new Map<string, string>();
  for (const c of queue) {
    const gp = state.doctors.find(
      (d) => d.available && !busy.has(d.id) && !c.declinedBy.includes(d.id),
    );
    if (!gp) continue;
    busy.add(gp.id);
    rung.set(c.id, gp.id);
    events.push(event(c.id, { actor: "Platform", actorRole: "platform" }, "Rang GP", gp.name));
  }
  if (!rung.size) return { consultations: state.consultations, events };
  return {
    consultations: state.consultations.map((c) =>
      rung.has(c.id) ? { ...c, status: "ringing" as const, prescriberId: rung.get(c.id) } : c,
    ),
    events,
  };
}

function event(consultId: string, who: Actor, action: string, detail?: string): AuditEvent {
  return { id: uid(), at: Date.now(), consultId, ...who, action, detail };
}

function seed() {
  return {
    consultations: SEED_CONSULTATIONS,
    doctors: DOCTORS,
    logins: [] as DoctorLogin[],
    audit: SEED_AUDIT,
    forceClinicOpen: true,
    autoConnect: true,
  };
}

export const usePlatform = create<PlatformState>()(
  persist(
    (set, get) => {
      /** Patch one consultation and append audit events — every step writes to the audit log. */
      const patch = (id: string, change: Partial<Consultation> | ((c: Consultation) => Partial<Consultation>), ...events: AuditEvent[]) =>
        set((s) => ({
          consultations: s.consultations.map((c) =>
            c.id === id ? { ...c, ...(typeof change === "function" ? change(c) : change) } : c,
          ),
          audit: [...events, ...s.audit],
        }));

      const runAssign = () =>
        set((s) => {
          const { consultations, events } = assign(s);
          return { consultations, audit: [...events, ...s.audit] };
        });

      const patient = (id: string): Actor => ({
        actor: get().consultations.find((c) => c.id === id)?.member.name ?? "Patient",
        actorRole: "patient",
      });
      const doctor = (doctorId: string, role: Actor["actorRole"] = "doctor"): Actor => ({
        actor: doctorName(get().doctors, doctorId),
        actorRole: role,
      });

      return {
        ...seed(),

        startConsultation: (phone, member, lang) => {
          const consult: Consultation = {
            id: nextId(get().consultations),
            householdPhone: phone,
            member,
            lang,
            status: "intake",
            createdAt: Date.now(),
            declinedBy: [],
            transcript: [],
            notes: { diagnosis: "", plan: "", followUp: "" },
            rx: [],
            rxVersion: 0,
          };
          const started = event(consult.id, { actor: member.name, actorRole: "patient" }, "Started consultation", member.mrn);
          set((s) => ({ consultations: [consult, ...s.consultations], audit: [started, ...s.audit] }));
          return consult;
        },

        giveConsent: (id) =>
          patch(id, { consentAt: Date.now() }, event(id, patient(id), "Consent given", "Video call + live transcript")),

        submitSymptoms: (id, symptoms) => {
          if (symptoms.redFlags.length) {
            patch(
              id,
              { symptoms, status: "emergency" },
              event(id, { actor: "Platform", actorRole: "platform" }, "Red flag — emergency guidance shown", symptoms.redFlags.join(", ")),
            );
            return;
          }
          patch(id, { symptoms, status: "queued" }, event(id, patient(id), "Joined queue", complaintText(symptoms)));
          runAssign();
        },

        leaveQueue: (id) => {
          patch(id, { status: "closed", closedAt: Date.now(), prescriberId: undefined }, event(id, patient(id), "Left the queue"));
          runAssign();
        },

        setAvailability: (doctorId, available) => {
          if (available && get().doctors.find((d) => d.id === doctorId)?.active === false) return;
          set((s) => ({
            doctors: s.doctors.map((d) => (d.id === doctorId ? { ...d, available } : d)),
            audit: [event("—", doctor(doctorId), available ? "Went available" : "Went unavailable"), ...s.audit],
          }));
          if (available) runAssign();
        },

        acceptCall: (id, doctorId) =>
          patch(id, { status: "in_call", prescriberId: doctorId, callStartedAt: Date.now(), scripted: true }, event(id, doctor(doctorId), "Accepted call", "Video consult started")),

        declineCall: (id, doctorId) => {
          patch(
            id,
            (c) => ({ status: "queued", prescriberId: undefined, declinedBy: [...c.declinedBy, doctorId] }),
            event(id, doctor(doctorId), "Let the call go", "Back to queue — next free GP"),
          );
          runAssign();
        },

        demoConnect: (id) => {
          const { consultations, doctors } = get();
          const c = consultations.find((x) => x.id === id);
          if (!c || (c.status !== "queued" && c.status !== "ringing")) return;
          // The GP already being rung; else a free one; else anyone not on a call — it's a demo.
          const busy = busyDoctors(consultations.filter((x) => x.id !== id));
          const gp =
            (c.status === "ringing" ? c.prescriberId : undefined) ??
            doctors.find((d) => d.available && !busy.has(d.id))?.id ??
            doctors.find((d) => !busy.has(d.id))?.id ??
            doctors[0].id;
          patch(
            id,
            { status: "in_call", prescriberId: gp, callStartedAt: Date.now(), scripted: true, autoAnswered: true },
            event(id, doctor(gp), "Accepted call", "Demo auto-answer"),
          );
        },

        claimTranscript: (id) => patch(id, { autoAnswered: false }),

        appendTranscript: (id, line) =>
          set((s) => ({
            consultations: s.consultations.map((c) =>
              c.id === id ? { ...c, transcript: [...c.transcript, { ...line, id: uid(), at: Date.now() }] } : c,
            ),
          })),

        endCall: (id, doctorId) => {
          const c = get().consultations.find((x) => x.id === id);
          // The prescription is approved during the call, so a call only ends once it's released —
          // there is no "awaiting approval" after the call.
          if (!c?.approvedAt) return;
          patch(id, { status: "approved", callEndedAt: Date.now() }, event(id, doctor(doctorId), "Ended call", "Transcript saved"));
          runAssign();
        },

        // An edit after a live release takes it back: the doctor overwrites by approving again (next version).
        saveDraft: (id, notes, rx) =>
          patch(id, get().consultations.find((x) => x.id === id)?.status === "in_call" ? { notes, rx, approvedAt: undefined } : { notes, rx }),

        approve: (id, doctorId) => {
          const c = get().consultations.find((x) => x.id === id);
          // Only the consulting doctor signs their own consultation's prescription — during the call or after it.
          if (!c || !["in_call", "drafting"].includes(c.status) || c.prescriberId !== doctorId) return;
          const version = c.rxVersion + 1;
          patch(
            id,
            { status: c.status === "in_call" ? "in_call" : "approved", rxVersion: version, approvedAt: Date.now(), aiDrafted: false },
            event(id, { actor: "Platform", actorRole: "platform" }, "Prescription released to patient", "Portal + email"),
            event(id, doctor(doctorId), `Approved prescription v${version}`, c.aiDrafted ? "AI draft checked by the doctor" : undefined),
          );
        },

        closeConsult: (id, doctorId) =>
          patch(id, { status: "closed", closedAt: Date.now() }, event(id, doctor(doctorId), "Closed consultation", "Status, follow-up and audit complete")),

        addDoctor: ({ name, pmdc, username, password }) => {
          const clean = { name: name.trim(), pmdc: pmdc.trim() };
          if (get().doctors.some((d) => d.pmdc.toLowerCase() === clean.pmdc.toLowerCase())) return { ok: false, error: "A doctor with this PMDC number already exists." };
          const login = checkLogin(get().logins, username, password, true);
          if (typeof login === "string") return { ok: false, error: login };
          const id = `d-${uid()}`;
          set((s) => ({
            doctors: [...s.doctors, { id, name: clean.name, initials: initialsFrom(clean.name), pmdc: clean.pmdc, role: "gp", available: false, active: true }],
            logins: [...s.logins, { doctorId: id, ...login }],
            audit: [event("—", ADMIN, "Added doctor", `${clean.name} · ${clean.pmdc}`), ...s.audit],
          }));
          return { ok: true, id };
        },

        updateDoctor: (id, { name, pmdc, active, username, password }) => {
          const clean = { name: name.trim(), pmdc: pmdc.trim() };
          if (get().doctors.some((d) => d.id !== id && d.pmdc.toLowerCase() === clean.pmdc.toLowerCase())) return { ok: false, error: "Another doctor already has this PMDC number." };
          const current = get().logins.find((l) => l.doctorId === id);
          // A doctor without an admin-made sign-in can be edited without giving one (both fields blank).
          const keepNone = !current && !username.trim() && !password;
          const login = keepNone ? null : checkLogin(get().logins.filter((l) => l.doctorId !== id), username, password, !current);
          if (typeof login === "string") return { ok: false, error: login };
          set((s) => ({
            logins: login ? [...s.logins.filter((l) => l.doctorId !== id), { doctorId: id, username: login.username, password: login.password || current!.password }] : s.logins,
            doctors: s.doctors.map((d) =>
              d.id === id ? { ...d, name: clean.name, initials: initialsFrom(clean.name), pmdc: clean.pmdc, active, available: active ? d.available : false } : d,
            ),
            audit: [event("—", ADMIN, active ? "Edited doctor" : "Deactivated doctor", `${clean.name} · ${clean.pmdc}`), ...s.audit],
          }));
          return { ok: true };
        },

        setForceClinicOpen: (on) => {
          set({ forceClinicOpen: on });
          if (on) runAssign();
        },

        setAutoConnect: (autoConnect) => set({ autoConnect }),

        resetDemo: () => set(seed()),
      };
    },
    {
      name: STORE_KEY,
      // v2 dropped the second-doctor review (in_review / changes); older demo data is re-seeded.
      // v3 dropped approval after the call: any consultation left waiting ("drafting") is released as it stands.
      version: 5,
      migrate: (persisted, from) => {
        if (from < 2) return seed() as PlatformState;
        const s = persisted as PlatformState;
        const now = Date.now();
        return {
          ...s,
          consultations: s.consultations.map((c) =>
            c.status === "drafting"
              ? { ...c, status: "approved", approvedAt: c.callEndedAt ?? now, rxVersion: Math.max(1, c.rxVersion), aiDrafted: false }
              : // v5: there are no call backs — patients call in and wait for the next free GP.
                (c.status as string) === "callback"
                ? { ...c, status: "queued" }
                : c,
          ),
        } as PlatformState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        consultations: s.consultations,
        doctors: s.doctors,
        logins: s.logins,
        audit: s.audit,
        forceClinicOpen: s.forceClinicOpen,
        autoConnect: s.autoConnect,
      }),
    },
  ),
);

/* Another tab changed the platform: pick it up (the WebSocket push, in production). */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) void usePlatform.persist.rehydrate();
  });
}

export const useConsult = (id: string | undefined) =>
  usePlatform((s) => (id ? s.consultations.find((c) => c.id === id) : undefined));
