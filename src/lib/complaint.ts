import { COMPLAINTS } from "@/data/seed";
import type { Lang, Symptoms } from "@/lib/types";

/** The complaint as people should read it — the chip's label, or for
    "Something else" the patient's own words. */
export function complaintText(symptoms: Pick<Partial<Symptoms>, "complaint" | "other"> | undefined | null, lang: Lang = "en"): string {
  if (!symptoms?.complaint) return "";
  if (symptoms.complaint === "other" && symptoms.other?.trim()) return symptoms.other.trim();
  return COMPLAINTS.find((c) => c.key === symptoms.complaint)?.[lang] ?? "";
}
