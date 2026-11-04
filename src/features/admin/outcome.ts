/* How a consultation ended, for the admin's tables, filters and reports. */

import type { Consultation } from "@/lib/types";

export type Outcome = "prescribed" | "advice" | "er" | "live" | "ineligible";

export const OUTCOMES: Record<Outcome, { label: string; tone: "ok" | "neutral" | "err" | "warn" }> = {
  prescribed: { label: "Prescribed", tone: "ok" },
  advice: { label: "Advice only", tone: "neutral" },
  er: { label: "Sent to ER", tone: "err" },
  live: { label: "In progress", tone: "warn" },
  ineligible: { label: "Not eligible", tone: "err" },
};

export function outcomeOf(c: Consultation): Outcome {
  if (c.status === "emergency") return "er";
  if (c.status === "ineligible") return "ineligible";
  if (c.status === "approved" || c.status === "closed" || c.status === "drafting") return c.rxVersion > 0 ? "prescribed" : "advice";
  return "live";
}
