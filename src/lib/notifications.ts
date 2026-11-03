/* Notifications for the bell — read off the platform's audit log, filtered to
   what this reader should hear about. In production ccpl-api pushes these over
   the notification stream (as the ERP's bell does); here the shared store is
   the stream, so a patient's tab and a doctor's tab see each other's events.
   Read state is kept per signed-in user in localStorage. */

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { complaintText } from "@/lib/complaint";
import { translate } from "@/lib/i18n";
import { usePlatform } from "@/store/consult-store";
import type { AuditEvent, Consultation, Lang } from "@/lib/types";

export type NotifTone = "call" | "info" | "ok" | "warn" | "err";

export interface AppNotification {
  id: string;
  at: number;
  tone: NotifTone;
  title: string;
  message: string;
  /** Where clicking it leads. */
  href: { to: string; params?: Record<string, string>; search?: Record<string, string> };
  /** The event came from this reader — listed, but never toasted. */
  own?: boolean;
}

export type Reader = { kind: "doctor"; id: string; name: string } | { kind: "patient"; phone: string; lang: Lang };

const LIMIT = 30;

function forDoctor(e: AuditEvent, c: Consultation | undefined, me: { id: string; name: string }): AppNotification | null {
  const base = { id: e.id, at: e.at, own: e.actor === me.name };
  const who = c?.member.name ?? "A patient";
  const consult = { to: "/portal/consultations/$id", params: { id: e.consultId } };
  const mine = c?.prescriberId === me.id;

  if (e.action === "Joined queue" || e.action === "Rejoined queue")
    return { ...base, tone: "info", title: "Patient waiting", message: `${who} joined the queue — ${complaintText(c?.symptoms) || "no complaint given"}.`, href: { to: "/portal/consultations", search: { view: "live" } } };
  if (e.action === "Rang GP" && e.detail === me.name)
    return { ...base, tone: "call", title: "Incoming call", message: `${who} is ringing you.`, href: consult };
  if (e.action === "Drafted notes & prescription" && mine)
    return { ...base, tone: "warn", title: "AI draft ready to approve", message: `AI assist drafted ${who}'s notes & prescription. Check, edit and approve to release it.`, href: consult };
  if (e.action.startsWith("Approved prescription") && mine)
    return { ...base, tone: "ok", title: "Prescription released", message: `You approved ${who}'s prescription. It's in their portal and email.`, href: consult };
  if (e.action.startsWith("Red flag"))
    return { ...base, tone: "err", title: "Sent to ER", message: `${who} reported red flags (${e.detail || "—"}) and was told to go to the nearest ER.`, href: consult };
  return null;
}

function forPatient(e: AuditEvent, c: Consultation | undefined, lang: Lang): AppNotification | null {
  if (!c) return null;
  const t = (k: Parameters<typeof translate>[1], v?: Record<string, string>) => translate(lang, k, v);
  const name = lang === "ur" ? c.member.nameUr : c.member.name;
  const base = { id: e.id, at: e.at, own: e.actorRole === "patient" };
  const call = { to: "/patient/call" };

  if (e.action === "Rang GP") return { ...base, tone: "call", title: t("nRangT"), message: t("nRangM", { doctor: e.detail ?? "", name }), href: { to: "/patient/queue" } };
  if (e.action === "Accepted call") return { ...base, tone: "ok", title: t("nStartedT"), message: t("nStartedM", { doctor: e.actor, name }), href: call };
  if (e.action === "Ended call") return { ...base, tone: "info", title: t("nEndedT"), message: t("nEndedM", { name }), href: call };
  if (e.action === "Prescription released to patient")
    return { ...base, tone: "ok", title: t("nReleasedT"), message: t("nReleasedM", { name }), href: { to: "/patient/records" } };
  return null;
}

/** The reader's notifications, newest first. */
export function useNotifications(reader: Reader): AppNotification[] {
  const audit = usePlatform((s) => s.audit);
  const consultations = usePlatform((s) => s.consultations);
  const key = reader.kind === "doctor" ? reader.id : `${reader.phone}:${reader.lang}`;
  return useMemo(() => {
    const byId = new Map(consultations.map((c) => [c.id, c]));
    const out: AppNotification[] = [];
    for (const e of [...audit].sort((a, b) => b.at - a.at)) {
      const c = byId.get(e.consultId);
      if (reader.kind === "patient" && c?.householdPhone !== reader.phone) continue;
      const n = reader.kind === "doctor" ? forDoctor(e, c, reader) : forPatient(e, c, reader.lang);
      if (n) out.push(n);
      if (out.length >= LIMIT) break;
    }
    return out;
    // `key` stands in for the reader object, which is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit, consultations, key]);
}

/** Read ids, per user. */
export const useNotifRead = create<{ read: Record<string, string[]>; markRead: (user: string, ids: string[]) => void }>()(
  persist(
    (set) => ({
      read: {},
      markRead: (user, ids) =>
        set((s) => ({ read: { ...s.read, [user]: Array.from(new Set([...(s.read[user] ?? []), ...ids])).slice(-200) } })),
    }),
    { name: "dc-notif-read" },
  ),
);
