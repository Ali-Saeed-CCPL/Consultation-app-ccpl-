/* Who is using this tab. Kept in sessionStorage, so one browser can hold a
   patient tab and two doctor tabs at once. Doctors and the admin sign in against
   consult-api and keep its token here; the patient side is still the demo
   sign-in until the patient login is connected. */

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
  /** consult-api token of the signed-in doctor or admin. The server checks it on every request. */
  staffToken: string | null;
  /** Signed in with a temporary password: only the change-password screen is open until it's changed. */
  mustChangePassword: boolean;

  setLang: (lang: Lang) => void;
  signInPatient: (phone: string, username: string) => void;
  setConsult: (id: string | null) => void;
  signInDoctor: (id: string, username: string, token: string, mustChangePassword: boolean) => void;
  signInAdmin: (username: string, token: string, mustChangePassword: boolean) => void;
  /** After a password change: the new token (the old one no longer works). */
  passwordChanged: (token: string) => void;
  signOut: () => void;
}

const signedOut = { patientPhone: null, consultId: null, doctorId: null, isAdmin: false, username: null, staffToken: null, mustChangePassword: false };

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      lang: "en",
      ...signedOut,
      setLang: (lang) => set({ lang }),
      signInPatient: (phone, username) => set({ ...signedOut, patientPhone: phone, username }),
      setConsult: (consultId) => set({ consultId }),
      signInDoctor: (doctorId, username, staffToken, mustChangePassword) => set({ ...signedOut, doctorId, username, staffToken, mustChangePassword }),
      signInAdmin: (username, staffToken, mustChangePassword) => set({ ...signedOut, isAdmin: true, username, staffToken, mustChangePassword }),
      passwordChanged: (staffToken) => set({ staffToken, mustChangePassword: false }),
      signOut: () => set(signedOut),
    }),
    { name: "dc-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);
