/* Change password — for doctors and the admin. Forced after signing in with a
   temporary password (set by the admin); also reachable from the account menu.
   Changing it signs out every other device; this tab gets a fresh token. */

import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import { staffApi } from "@/api/staff";
import { APP_NAME, BRAND, LOGO_SRC } from "@/config/app.constants";
import { useSession } from "@/store/session-store";

const MIN_LENGTH = 6;
const MAX_BYTES = 72;

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const token = useSession((s) => s.staffToken);
  const isAdmin = useSession((s) => s.isAdmin);
  const forced = useSession((s) => s.mustChangePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  const home = isAdmin ? "/admin/dashboard" : "/portal/dashboard";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) return setError("Enter your current password.");
    if (next.length < MIN_LENGTH) return setError(`The new password needs at least ${MIN_LENGTH} characters.`);
    if (new TextEncoder().encode(next).length > MAX_BYTES) return setError("The new password is too long.");
    if (next === current) return setError("The new password must be different from the current one.");
    if (next !== confirm) return setError("The two new passwords don't match.");
    setError("");
    setSaving(true);
    try {
      const { token: fresh } = await staffApi.changePassword(current, next);
      useSession.getState().passwordChanged(fresh);
      toast.success("Password changed");
      navigate({ to: home, replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useSession.getState().signOut();
        navigate({ to: "/login", replace: true });
      }
      setError(e instanceof Error ? e.message : "Couldn't change the password.");
    } finally {
      setSaving(false);
    }
  }

  const field = "field-input";
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--color-canvas) px-6 py-12">
      <form onSubmit={submit} noValidate className="w-full max-w-[420px] rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-7">
        <img src={LOGO_SRC} alt={BRAND} width={56} height={56} className="h-14 w-14 object-contain" />
        <h1 className="mt-4 text-[20px] font-bold text-(--color-ink)">{forced ? "Set your own password" : "Change password"}</h1>
        <p className="mt-1 text-[13px] text-(--color-mute)">
          {forced ? `You signed in to ${APP_NAME} with a temporary password. Choose your own to continue.` : "Other devices signed in to this account will be signed out."}
        </p>

        <div className="mt-5 grid gap-4">
          {error ? (
            <p role="alert" className="rounded-(--radius-md) border border-(--color-red) bg-(--color-red-tint) px-3.5 py-2.5 text-[12.5px] text-(--color-red)">
              {error}
            </p>
          ) : null}
          <label>
            <span className="field-label">{forced ? "Temporary password" : "Current password"}</span>
            <input className={field} type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label>
            <span className="field-label">New password</span>
            <input className={field} type="password" autoComplete="new-password" placeholder={`At least ${MIN_LENGTH} characters`} value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label>
            <span className="field-label">Repeat the new password</span>
            <input className={field} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="submit" disabled={saving} className="h-11 w-full rounded-(--radius-md) btn-royal border border-transparent text-[14px] font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Save password"}
          </button>
          {forced ? (
            <button
              type="button"
              onClick={() => {
                useSession.getState().signOut();
                navigate({ to: "/login", replace: true });
              }}
              className="text-[12.5px] font-semibold text-(--color-mute) hover:text-(--color-teal)"
            >
              Sign out
            </button>
          ) : (
            <button type="button" onClick={() => navigate({ to: home })} className="text-[12.5px] font-semibold text-(--color-mute) hover:text-(--color-teal)">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
