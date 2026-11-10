/* Staff side of consult-api (Rameen's module): sign-in, own account, availability,
   heartbeat, and the admin's doctor accounts. Shapes match the backend exactly;
   timestamps arrive as ISO strings. */

import { api } from "@/api/client";

export type StaffRole = "doctor" | "admin";

export interface StaffSession {
  user_id: string;
  role: StaffRole;
  username: string;
  full_name: string;
  email: string | null;
  must_change_password: boolean;
  doctor: { pmdc_no: string; is_available: boolean; last_seen_at: string | null } | null;
}

export interface Presence {
  is_available: boolean;
  last_seen_at: string | null;
  missed_in_row: number;
}

export interface AdminDoctor {
  user_id: string;
  username: string;
  full_name: string;
  email: string | null;
  pmdc_no: string;
  is_active: boolean;
  is_available: boolean;
  last_seen_at: string | null;
  missed_in_row: number;
  must_change_password: boolean;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
}

/** How often the doctor portal says "still here". The backend counts a doctor gone after 30 s of silence. */
export const PING_EVERY_MS = 10_000;

export const staffApi = {
  login: (username: string, password: string) => api<{ token: string; user: StaffSession }>("POST", "/api/auth/staff/login", { username, password }),
  me: () => api<StaffSession>("GET", "/api/staff/me"),
  /** Returns a fresh token: every older token (other devices) stops working. */
  changePassword: (current_password: string, new_password: string) =>
    api<{ token: string }>("POST", "/api/staff/me/password", { current_password, new_password }),

  setAvailability: (available: boolean) => api<Presence>("PATCH", "/api/doctors/me/availability", { available }),
  ping: () => api<Presence>("POST", "/api/doctors/me/ping"),

  listDoctors: () => api<AdminDoctor[]>("GET", "/api/admin/doctors"),
  createDoctor: (input: { username: string; full_name: string; pmdc_no: string; password: string; email?: string | null }) =>
    api<AdminDoctor>("POST", "/api/admin/doctors", input),
  updateDoctor: (userId: string, input: { full_name?: string; pmdc_no?: string; is_active?: boolean; email?: string | null }) =>
    api<AdminDoctor>("PATCH", `/api/admin/doctors/${userId}`, input),
  /** A new temporary password; the doctor must change it at next sign-in and is signed out everywhere. */
  resetDoctorPassword: (userId: string, password: string) => api<null>("POST", `/api/admin/doctors/${userId}/password`, { password }),
};
