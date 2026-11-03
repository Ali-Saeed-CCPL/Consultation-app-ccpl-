/* Who is using this tab. Kept in sessionStorage, so one browser can hold a
   patient tab and two doctor tabs at once — the way the demo is meant to be
   run. Real auth (phone OTP for patients, ccpl-api SSO for doctors) replaces it. */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang } from "@/lib/types";

interface SessionState {
  lang: Lang;
  patientPhone: string | null;
  /** The consultation this patient tab is walking through. */
  consultId: string | null;
  doctorId: string | null;
  /** The clinic admin — oversees every doctor and consultation, takes no calls. */
  isAdmin: boolean;
  /** The login name this tab signed in with — shown in the account menu. */
  username: string | null;

  setLang: (lang: Lang) => void;
  signInPatient: (phone: string, username: string) => void;
  setConsult: (id: string | null) => void;
  signInDoctor: (id: string, username: string) => void;
  signInAdmin: (username: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      lang: "en",
      patientPhone: null,
      consultId: null,
      doctorId: null,
      isAdmin: false,
      username: null,
      setLang: (lang) => set({ lang }),
      signInPatient: (phone, username) => set({ patientPhone: phone, username, consultId: null, doctorId: null, isAdmin: false }),
      setConsult: (consultId) => set({ consultId }),
      signInDoctor: (doctorId, username) => set({ doctorId, username, patientPhone: null, consultId: null, isAdmin: false }),
      signInAdmin: (username) => set({ isAdmin: true, username, doctorId: null, patientPhone: null, consultId: null }),
      signOut: () => set({ patientPhone: null, consultId: null, doctorId: null, isAdmin: false, username: null }),
    }),
    { name: "dc-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);
