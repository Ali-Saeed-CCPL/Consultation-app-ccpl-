/* Doctor-portal navigation: the module band across the top and, per module,
   the rail's grouped screens — the same two-level layout as the ERP. */

import type { LucideIcon } from "lucide-react";
import { Activity, CheckCheck, ClipboardList, PhoneCall, Sparkles } from "lucide-react";
import type { ConsultStatus } from "@/lib/types";

export interface PortalModule {
  key: "dashboard" | "consultations" | "audit";
  label: string;
  to: string;
}

export const PORTAL_MODULES: PortalModule[] = [
  { key: "dashboard", label: "Dashboard", to: "/portal/dashboard" },
  { key: "consultations", label: "Consultations", to: "/portal/consultations" },
  { key: "audit", label: "Audit log", to: "/portal/audit" },
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

export const RAIL: Record<string, { title: string; items: RailItem[] }> = {
  consultations: {
    title: "Consultations",
    items: [
      { key: "live", label: "Live queue", group: "Today", icon: PhoneCall, to: "/portal/consultations", search: { view: "live" }, statuses: ["queued", "ringing", "in_call", "callback"], tone: "warn" },
      { key: "drafts", label: "To approve", group: "Today", icon: Sparkles, to: "/portal/consultations", search: { view: "drafts" }, statuses: ["drafting"], mine: true, tone: "err" },
      { key: "released", label: "Released", group: "Records", icon: CheckCheck, to: "/portal/consultations", search: { view: "released" } },
      { key: "all", label: "All consultations", group: "Records", icon: ClipboardList, to: "/portal/consultations", search: { view: "all" } },
      { key: "triage", label: "Triage outcomes", group: "Records", icon: Activity, to: "/portal/consultations", search: { view: "triage" }, statuses: ["emergency", "ineligible"] },
    ],
  },
};
