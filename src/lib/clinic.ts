/* Clinic hours and small formatting helpers shared by the patient app and the portal. */

import type { Consultation, ConsultStatus } from "@/lib/types";

/** GPs take calls Mon–Fri, 9 AM–6 PM Pakistan time. */
export const CLINIC_HOURS = { days: "Mon–Fri", open: 9, close: 18, tz: "Asia/Karachi" };

function karachiParts(at: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_HOURS.tz,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(at));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  return { weekday, hour };
}

/** Hour of day in Pakistan, for greetings that match the clinic's clock. */
export function karachiHour(at = Date.now()): number {
  return karachiParts(at).hour;
}

export function greetingKey(at = Date.now()): "morning" | "afternoon" | "evening" {
  const h = karachiHour(at);
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export function isClinicOpen(at = Date.now()): boolean {
  const { weekday, hour } = karachiParts(at);
  if (weekday === "Sat" || weekday === "Sun") return false;
  return hour >= CLINIC_HOURS.open && hour < CLINIC_HOURS.close;
}

/** The next time the clinic opens — the earliest call back we can promise. */
export function nextOpening(at = Date.now()): number {
  let t = at;
  for (let i = 0; i < 24 * 8; i++) {
    t += 3_600_000;
    if (isClinicOpen(t)) return t - (t % 3_600_000);
  }
  return t;
}

export function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(at: number): string {
  return new Date(at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function minutesAgo(at: number, now = Date.now()): string {
  const m = Math.round((now - at) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export type Tone = "ok" | "warn" | "err" | "neutral";

export const STATUS_META: Record<ConsultStatus, { label: string; tone: Tone }> = {
  intake: { label: "Intake", tone: "neutral" },
  ineligible: { label: "Not eligible", tone: "err" },
  emergency: { label: "Sent to ER", tone: "err" },
  queued: { label: "In queue", tone: "warn" },
  callback: { label: "Call back", tone: "warn" },
  ringing: { label: "Ringing", tone: "warn" },
  in_call: { label: "In consult", tone: "ok" },
  drafting: { label: "To approve", tone: "warn" },
  approved: { label: "Prescription released", tone: "ok" },
  closed: { label: "Closed", tone: "neutral" },
};

/** Another doctor's consultation that's still in their hands (being rung, on the
    call, or waiting for their approval). It's none of this doctor's business,
    so the portal neither lists nor opens it. */
export function isOthersActive(c: Consultation, doctorId: string): boolean {
  return Boolean(c.prescriberId && c.prescriberId !== doctorId && ["ringing", "in_call", "drafting"].includes(c.status));
}

/** A time today on the clinic's clock — Pakistan is UTC+5 all year, no DST. */
export function clinicToday(hour: number, minute = 0, at = Date.now()): number {
  const d = new Date(at + 5 * 3_600_000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 5, minute);
}
