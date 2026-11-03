/* What the patient has picked so far but not yet submitted — the member on
   "choose" and the symptom answers. Shared so the journey's side column can
   summarise it live while the patient fills the form in. Per tab
   (sessionStorage), and tied to one consultation. */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Symptoms } from "@/lib/types";

export interface SymptomDraft {
  complaint: string;
  other: string;
  duration: string;
  severity: number;
  details: string;
  /** null until answered — "none of these" is an explicit answer, not a default. */
  redFlags: string[] | null;
  /** The patient said their health profile is still right (or updated it) for this consultation. */
  profileOk: boolean;
}

const EMPTY: SymptomDraft = { complaint: "", other: "", duration: "", severity: 4, details: "", redFlags: null, profileOk: false };

interface IntakeDraftState {
  memberId: string | null;
  /** The consultation `symptoms` belongs to. */
  consultId: string | null;
  symptoms: SymptomDraft;
  setMember: (id: string | null) => void;
  /** Start (or keep) the draft for this consultation, seeded from what it already holds. */
  ensureFor: (consultId: string, saved?: Symptoms, profileConfirmed?: boolean) => void;
  patch: (change: Partial<SymptomDraft>) => void;
}

export const useIntakeDraft = create<IntakeDraftState>()(
  persist(
    (set, get) => ({
      memberId: null,
      consultId: null,
      symptoms: EMPTY,
      setMember: (memberId) => set({ memberId }),
      ensureFor: (consultId, saved, profileConfirmed = false) => {
        if (get().consultId === consultId) return;
        set({
          consultId,
          symptoms: saved
            ? { complaint: saved.complaint, other: saved.other ?? "", duration: saved.duration, severity: saved.severity, details: saved.details, redFlags: saved.redFlags, profileOk: profileConfirmed }
            : EMPTY,
        });
      },
      patch: (change) => set((s) => ({ symptoms: { ...s.symptoms, ...change } })),
    }),
    { name: "dc-intake-draft", storage: createJSONStorage(() => sessionStorage) },
  ),
);
