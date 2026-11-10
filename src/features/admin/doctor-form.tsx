/* Add / edit a doctor — saved in consult-api. Name, PMDC number, the sign-in
   username (fixed once created), a temporary password, and when editing,
   active or not. The server rejects a username or PMDC number already in use
   (ignoring case). A password typed while editing replaces theirs with a new
   temporary one: they must change it at next sign-in and are signed out everywhere. */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import { useDoctorMutations } from "@/features/admin/use-admin-doctors";
import type { Doctor } from "@/lib/types";

const USERNAME = /^[a-z0-9._-]{3,64}$/;
const MIN_PASSWORD = 6;
const MAX_PASSWORD_BYTES = 72;

export default function DoctorForm({ open, onClose, doctor, onSaved }: { open: boolean; onClose: () => void; doctor?: Doctor; onSaved?: (id: string) => void }) {
  const { create, update, resetPassword } = useDoctorMutations();
  const [name, setName] = useState("");
  const [pmdc, setPmdc] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(doctor?.name ?? "Dr. ");
    setPmdc(doctor?.pmdc ?? "PMDC ");
    setUsername(doctor?.username ?? "");
    setPassword("");
    setShowPassword(false);
    setActive(doctor?.active !== false);
    setError("");
  }, [open, doctor]);

  const check = (): string | null => {
    if (name.replace(/^dr\.?\s*/i, "").trim().length < 2) return "Enter the doctor's name.";
    if (pmdc.replace(/^pmdc\s*/i, "").trim().length < 3) return "Enter the PMDC registration number.";
    if (!doctor && !USERNAME.test(username.trim().toLowerCase())) return "Username: 3 to 64 characters — letters, numbers, dot, dash or underscore.";
    if ((!doctor || password) && password.length < MIN_PASSWORD) return `Password: at least ${MIN_PASSWORD} characters.`;
    if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "That password is too long.";
    if (doctor && !doctor.userId) return "This is a demo-only doctor that the server doesn't know, so it can't be edited.";
    return null;
  };

  const save = async () => {
    const problem = check();
    if (problem) return setError(problem);
    setError("");
    setSaving(true);
    try {
      if (doctor?.userId) {
        const id = await update.mutateAsync({ userId: doctor.userId, input: { full_name: name.trim(), pmdc_no: pmdc.trim(), is_active: active } });
        if (password) await resetPassword.mutateAsync({ userId: doctor.userId, password });
        toast.success(password ? "Doctor updated — they must set a new password at next sign-in" : "Doctor updated");
        onSaved?.(id);
      } else {
        const id = await create.mutateAsync({ username: username.trim().toLowerCase(), full_name: name.trim(), pmdc_no: pmdc.trim(), password });
        toast.success("Doctor added — they sign in with this password and then choose their own");
        onSaved?.(id);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={doctor ? "Edit doctor" : "Add doctor"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : doctor ? "Save changes" : "Add doctor"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {error ? <p className="rounded-(--radius-md) bg-[var(--red-tint)] px-3 py-2 text-[13px] font-medium text-[var(--color-red-ink)]">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">Full name *</span>
            <input className="field-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="field-label">PMDC registration *</span>
            <input className="field-input font-mono" value={pmdc} onChange={(e) => setPmdc(e.target.value)} />
          </label>
        </div>

        <fieldset className="grid gap-4 rounded-(--radius-md) border border-[var(--line)] p-4">
          <legend className="px-1 text-[12.5px] font-semibold text-[var(--ink)]">Sign-in</legend>
          <label>
            <span className="field-label">Username {doctor ? "" : "*"}</span>
            <input
              className="field-input font-mono"
              value={username}
              autoComplete="off"
              readOnly={Boolean(doctor)}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. usman.tariq"
            />
            {doctor ? <span className="mt-1 block text-[12px] text-[var(--mute)]">A username can't be changed once the account exists.</span> : null}
          </label>
          <label>
            <span className="field-label">{doctor ? "New temporary password" : "Temporary password *"}</span>
            <span className="relative block">
              <input
                className="field-input pe-16 font-mono"
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={doctor ? "Leave blank to keep their password" : `At least ${MIN_PASSWORD} characters`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)] hover:text-[var(--link)]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
            <span className="mt-1 block text-[12px] text-[var(--mute)]">The doctor chooses their own password the first time they sign in.</span>
          </label>
        </fieldset>

        {doctor ? (
          <label className="flex items-center justify-between gap-3 rounded-(--radius-md) border border-[var(--line)] px-4 py-3">
            <span>
              <span className="block text-[13.5px] font-semibold text-[var(--ink)]">Active</span>
              <span className="block text-[12.5px] text-[var(--mute)]">{active ? "On the roster, can sign in" : "Off the rota, signed out at once"}</span>
            </span>
            <input type="checkbox" className="h-4 w-4 accent-[var(--action)]" checked={active} onChange={(e) => setActive(e.target.checked)} aria-label="Active" />
          </label>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
