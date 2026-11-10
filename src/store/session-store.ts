/* Who is using this tab. Kept in sessionStorage, so one browser can hold a
   patient tab and two doctor tabs at once. The API tokens themselves live in
   api/client.ts (tokens); api/session-sync.ts clears them when this session ends. */

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
  /** Signed in with a temporary password: only the change-password screen is open until it's changed. */
  mustChangePassword: boolean;

  setLang: (lang: Lang) => void;
  signInPatient: (phone: string, username: string) => void;
  setConsult: (id: string | null) => void;
  signInDoctor: (id: string, username: string, mustChangePassword: boolean) => void;
  signInAdmin: (username: string, mustChangePassword: boolean) => void;
  /** The temporary password was replaced (the caller has stored the new token). */
  passwordChanged: () => void;
  signOut: () => void;
}

const signedOut = { patientPhone: null, consultId: null, doctorId: null, isAdmin: false, username: null, mustChangePassword: false };

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      lang: "en",
      ...signedOut,
      setLang: (lang) => set({ lang }),
      signInPatient: (phone, username) => set({ ...signedOut, patientPhone: phone, username }),
      setConsult: (consultId) => set({ consultId }),
      signInDoctor: (doctorId, username, mustChangePassword) => set({ ...signedOut, doctorId, username, mustChangePassword }),
      signInAdmin: (username, mustChangePassword) => set({ ...signedOut, isAdmin: true, username, mustChangePassword }),
      passwordChanged: () => set({ mustChangePassword: false }),
      signOut: () => set(signedOut),
    }),
    // v1 dropped the staff token from here (it lives in api/client.ts now).
    { name: "dc-session", version: 1, storage: createJSONStorage(() => sessionStorage) },
  ),
);
