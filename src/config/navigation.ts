/* Portal navigation — the module band across the top and, per module, the
   rail's grouped screens — the same two-level layout as the ERP. Two portals
   share it: the doctor's (their own calls and history) and the clinic admin's
   (the whole clinic: doctors, reports, the audit log). */

import type { LucideIcon } from "lucide-react";
import { Activity, History, PhoneCall } from "lucide-react";
import type { ConsultStatus } from "@/lib/types";

export interface PortalModule {
  key: "dashboard" | "consultations" | "doctors" | "reports" | "audit";
  label: string;
  to: string;
}

export const PORTAL_MODULES: PortalModule[] = [
  { key: "dashboard", label: "Dashboard", to: "/portal/dashboard" },
  { key: "consultations", label: "Consultations", to: "/portal/consultations" },
];

export const ADMIN_MODULES: PortalModule[] = [
  { key: "dashboard", label: "Overview", to: "/admin/dashboard" },
  { key: "consultations", label: "Consultations", to: "/admin/consultations" },
  { key: "doctors", label: "Doctors", to: "/admin/doctors" },
  { key: "reports", label: "Reports", to: "/admin/reports" },
  { key: "audit", label: "Audit log", to: "/admin/audit" },
];

export interface RailItem {
  key: string;
  label: string;
  group: string;
  icon: LucideIcon;
  to: string;
  search?: { view?: string };
  /** Which statuses the item's count covers. */
  statuses?: ConsultStatus[];
  /** Count only the signed-in doctor's own consultations. */
  mine?: boolean;
  tone?: "warn" | "err";
}

const consultationRail = (to: string): RailItem[] => [
  { key: "live", label: "Live queue", group: "Today", icon: PhoneCall, to, search: { view: "live" }, statuses: ["queued", "ringing", "in_call"], tone: "warn" },
  // One plain history of finished consultations — no status split, no badge.
  { key: "history", label: "History", group: "Records", icon: History, to, search: { view: "history" } },
  { key: "triage", label: "Triage outcomes", group: "Records", icon: Activity, to, search: { view: "triage" }, statuses: ["emergency", "ineligible"] },
];

export const RAIL: Record<string, { title: string; items: RailItem[] }> = {
  consultations: { title: "Consultations", items: consultationRail("/portal/consultations") },
};

/** The admin is the management side: no live queue or triage views — consultations are one records list. */
export const ADMIN_RAIL: Record<string, { title: string; items: RailItem[] }> = {};
