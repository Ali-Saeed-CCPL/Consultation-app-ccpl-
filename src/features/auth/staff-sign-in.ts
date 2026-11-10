/* Doctor and admin sign-in against consult-api. Kept apart from the patient
   sign-in (Ali's) so either can change without touching the other; both login
   forms call this for anything that isn't a patient. */

import { USE_API, tokens } from "@/api/client";
import { staffApi, type StaffSession } from "@/api/staff";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

export type StaffLanding = "/portal/dashboard" | "/admin/dashboard" | "/change-password";

/** A doctor as consult-api describes them, put into the local roster. Returns the roster id. */
export function syncSignedInDoctor(user: StaffSession): string {
  return usePlatform.getState().syncDoctor({
    userId: user.user_id,
    username: user.username,
    name: user.full_name,
    pmdc: user.doctor!.pmdc_no,
    available: user.doctor!.is_available,
    active: true,
  });
}

/** Signs in and says where to go next. Throws ApiError with the server's message (wrong password, locked, inactive). */
export async function signInStaff(username: string, password: string): Promise<StaffLanding> {
  if (!USE_API) throw new Error("Doctor and admin sign-in needs the server. Set VITE_API_URL in the app's .env file.");
  const { token, user } = await staffApi.login(username.trim(), password);
  tokens.setStaff(token);
  const session = useSession.getState();
  if (user.role === "doctor") session.signInDoctor(syncSignedInDoctor(user), user.username, user.must_change_password);
  else session.signInAdmin(user.username, user.must_change_password);
  if (user.must_change_password) return "/change-password";
  return user.role === "doctor" ? "/portal/dashboard" : "/admin/dashboard";
}
