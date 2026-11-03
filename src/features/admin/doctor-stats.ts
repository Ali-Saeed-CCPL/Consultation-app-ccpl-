/* Per-doctor figures shared by the doctors list, a doctor's page and the reports.
   "Received" = consultations the doctor picked up (a call started with them). */

import type { Consultation } from "@/lib/types";

export interface DoctorStats {
  received: number;
  patients: number;
  released: number;
  callMs: number;
  avgCallMs: number;
  avgWaitMs: number;
  lastAt?: number;
}

export function doctorStats(consultations: Consultation[], doctorId: string): DoctorStats {
  const mine = consultations.filter((c) => c.prescriberId === doctorId && c.callStartedAt);
  const ended = mine.filter((c) => c.callEndedAt);
  const callMs = ended.reduce((sum, c) => sum + (c.callEndedAt! - c.callStartedAt!), 0);
  const waits = mine.map((c) => c.callStartedAt! - (c.consentAt ?? c.createdAt));
  return {
    received: mine.length,
    patients: new Set(mine.map((c) => c.member.mrn)).size,
    released: mine.filter((c) => c.status === "approved" || c.status === "closed").length,
    callMs,
    avgCallMs: ended.length ? callMs / ended.length : 0,
    avgWaitMs: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
    lastAt: mine.reduce<number | undefined>((m, c) => Math.max(m ?? 0, c.callStartedAt!), undefined),
  };
}

/** "8 min", "1 h 05 min" — durations in reports and tables. */
export function fmtMinutes(ms: number) {
  if (!ms) return "—";
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
