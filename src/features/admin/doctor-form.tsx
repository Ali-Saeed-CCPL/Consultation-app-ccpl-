/* Add / edit a doctor — name, PMDC number, their sign-in (username + password,
   set by the admin) and, when editing, active or not. The store rejects a PMDC
   number or username already in use. */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import { usePlatform } from "@/store/consult-store";
import type { Doctor } from "@/lib/types";

export default function DoctorForm({ open, onClose, doctor, onSaved }: { open: boolean; onClose: () => void; doctor?: Doctor; onSaved?: (id: string) => void }) {
  const addDoctor = usePlatform((s) => s.addDoctor);
  const updateDoctor = usePlatform((s) => s.updateDoctor);
  const login = usePlatform((s) => s.logins.find((l) => l.doctorId === doctor?.id));
  const [name, setName] = useState("");
  const [pmdc, setPmdc] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(doctor?.name ?? "Dr. ");
    setPmdc(doctor?.pmdc ?? "PMDC ");
    setUsername(login?.username ?? "");
    setPassword("");
    setShowPassword(false);
    setActive(doctor?.active !== false);
    setError("");
  }, [open, doctor, login]);

  const save = () => {
    if (name.replace(/^dr\.?\s*/i, "").trim().length < 2) return setError("Enter the doctor's name.");
    if (pmdc.replace(/^pmdc\s*/i, "").trim().length < 3) return setError("Enter the PMDC registration number.");
    if (doctor) {
      const res = updateDoctor(doctor.id, { name, pmdc, active, username, password });
      if (!res.ok) return setError(res.error);
      toast.success("Doctor updated");
      onSaved?.(doctor.id);
    } else {
      const res = addDoctor({ name, pmdc, username, password });
      if (!res.ok) return setError(res.error);
      toast.success("Doctor added — they can sign in now");
      onSaved?.(res.id);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={doctor ? "Edit doctor" : "Add doctor"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            {doctor ? "Save changes" : "Add doctor"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
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
            <span className="field-label">Username *</span>
            <input className="field-input font-mono" value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} placeholder="e.g. usman.tariq" />
          </label>
          <label>
            <span className="field-label">{doctor && login ? "New password" : "Password *"}</span>
            <span className="relative block">
              <input
                className="field-input pe-16 font-mono"
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={doctor && login ? "Leave blank to keep the current one" : "At least 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)] hover:text-[var(--link)]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>
        </fieldset>

        {doctor ? (
          <label className="flex items-center justify-between gap-3 rounded-(--radius-md) border border-[var(--line)] px-4 py-3">
            <span>
              <span className="block text-[13.5px] font-semibold text-[var(--ink)]">Active</span>
              <span className="block text-[12.5px] text-[var(--mute)]">{active ? "On the roster, can sign in" : "Off the rota, can't sign in"}</span>
            </span>
            <input type="checkbox" className="h-4 w-4 accent-[var(--action)]" checked={active} onChange={(e) => setActive(e.target.checked)} aria-label="Active" />
          </label>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
