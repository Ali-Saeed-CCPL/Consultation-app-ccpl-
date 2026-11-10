/* Keeps the API session in step with the app's session (store/session-store.ts):
   signing out ends the server session and forgets everything loaded for the
   last user; a session the server ends (expired, signed out elsewhere) signs
   the tab out and goes to sign-in. Imported once, in main.tsx. */

import { USE_API, setSignedOutHandler, tokens } from "@/api/client";
import { patientAuth } from "@/api/member";
import { queryClient } from "@/lib/query-client";
import { useSession } from "@/store/session-store";

if (USE_API) {
  setSignedOutHandler(() => {
    useSession.getState().signOut();
    window.location.assign(`${import.meta.env.BASE_URL}login`);
  });

  useSession.subscribe((now, before) => {
    if (!before.username || now.username) return;
    // Signed out: end the patient's server session (a staff token simply expires), then drop cached data.
    if (before.patientPhone) void patientAuth.logout().catch(() => tokens.clear());
    else tokens.clear();
    queryClient.clear();
  });
}
