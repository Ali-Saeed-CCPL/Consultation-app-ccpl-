import { COMPLAINTS } from "@/data/seed";
import type { Lang, Symptoms } from "@/lib/types";

/** The complaint as people should read it — the chip's label, or for
    "Something else" the patient's own words. */
export function complaintText(symptoms: Pick<Partial<Symptoms>, "complaint" | "other"> | undefined | null, lang: Lang = "en"): string {
  return complaintKeys(symptoms?.complaint)
    .map((k) => (k === "other" && symptoms?.other?.trim() ? symptoms.other.trim() : COMPLAINTS.find((c) => c.key === k)?.[lang]))
    .filter(Boolean)
    .join(", ");
}

// ponytail: several complaints stored comma-joined in the one `complaint` string; move to string[] when a backend needs it.
export const complaintKeys = (complaint: string | undefined | null): string[] => (complaint ? complaint.split(",") : []);
