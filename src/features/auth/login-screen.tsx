/* Sign-in screen — the ERP's login layout: a white brand panel on the left,
   the credential panel on the canvas to the right (stacked below `lg`).
   One form for both views; the account decides where it lands. Demo
   accounts only until ccpl-api auth is wired in (data/seed.ts DEMO_ACCOUNTS). */

import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MonitorSmartphone, Stethoscope } from "lucide-react";
import ThemeToggle from "@/components/common/theme-toggle";
import { APP_NAME, BRAND, LOGO_SRC } from "@/config/app.constants";
import { DEMO_ACCOUNTS, HOUSEHOLD } from "@/data/seed";
import { useSession } from "@/store/session-store";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-(--color-mute)">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-(--radius-md) border border-(--color-border-input) bg-(--color-surface) px-3.5 py-3 text-[13.5px] text-(--color-ink) outline-0 transition-colors placeholder:text-(--color-faint) focus:border-(--color-teal)";

export default function LoginScreen() {
  const navigate = useNavigate();
  const signInPatient = useSession((s) => s.signInPatient);
  const signInDoctor = useSession((s) => s.signInDoctor);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function enter(user: string, secret: string) {
    const account = DEMO_ACCOUNTS.find((a) => a.username === user.trim().toLowerCase() && a.password === secret);
    if (!account) {
      setError("That username and password don't match an account.");
      return;
    }
    if (account.role === "patient") {
      signInPatient(HOUSEHOLD.phone, account.username);
      navigate({ to: "/patient/home", replace: true });
    } else {
      signInDoctor(account.doctorId, account.username);
      navigate({ to: "/portal/dashboard", replace: true });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return setError("Enter your username.");
    if (!password) return setError("Enter your password.");
    setError("");
    enter(username, password);
  }

  return (
    <div className="min-h-screen bg-(--color-canvas) lg:grid lg:grid-cols-[1fr_minmax(480px,44%)]">
      {/* ── Brand panel ─────────────────────────────────────────────────── */}
      <section className="flex flex-col justify-between bg-(--color-surface) px-8 py-8 lg:px-16 lg:py-14">
        <div className="flex items-start justify-between">
          <img src={LOGO_SRC} alt={BRAND} width={88} height={88} className="h-[68px] w-[68px] object-contain lg:h-[88px] lg:w-[88px]" />
          <ThemeToggle />
        </div>
        <div className="max-w-[520px] py-10 lg:py-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-(--color-mute)">{BRAND} · CCPL partner app</p>
          <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-tight text-(--color-teal-deep) lg:text-[40px]">{APP_NAME}</h1>
          <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-(--color-body)">
            Video consultations with a panel GP, a live Urdu–English transcript, and AI-drafted notes and prescriptions
            that the doctor checks and approves. Every step is written to the audit trail.
          </p>
        </div>
        <p className="flex items-center gap-2.5 text-[12.5px] text-(--color-body)">
          <i aria-hidden="true" className="h-[9px] w-[9px] flex-none rounded-full bg-(--color-green)" />
          Powered by Crescent Care Pvt. Ltd.
        </p>
      </section>

      {/* ── Credential panel ────────────────────────────────────────────── */}
      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[470px]">
          <form onSubmit={handleSubmit} noValidate>
            <h2 className="text-[24px] font-semibold tracking-tight text-(--color-ink)">Sign in</h2>
            <p className="mt-1.5 text-[13.5px] text-(--color-body)">Patients and doctors sign in here.</p>

            <div className="mt-6 space-y-4">
              {error ? (
                <p role="alert" className="rounded-(--radius-md) border border-(--color-red) bg-(--color-red-tint) px-3.5 py-2.5 text-[12.5px] text-(--color-red)">
                  {error}
                </p>
              ) : null}
              <div>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="patient or doctor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-pressed={showPassword}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-(--color-mute) hover:text-(--color-teal)"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-(--radius-md) bg-[var(--primary)] py-3.5 text-[14px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                Sign in
              </button>
            </div>
          </form>

          {/* Demo accounts — click to sign straight in. */}
          <div className="mt-8">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-(--color-mute)">Demo accounts</p>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => {
                    setUsername(a.username);
                    setPassword(a.password);
                    enter(a.username, a.password);
                  }}
                  className="flex items-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4 py-3 text-left hover:border-(--color-link) hover:shadow-(--shadow-md)"
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-(--radius-md) bg-[var(--tint)] text-[var(--link)]">
                    {a.role === "patient" ? <MonitorSmartphone size={16} /> : <Stethoscope size={16} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-(--color-ink)">{a.label}</span>
                    <span className="block font-mono text-[11.5px] text-(--color-mute)">
                      {a.username} / {a.password}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-(--color-faint)">
              Prototype accounts. Open the patient and the doctor in two tabs — each tab keeps its own sign-in, and the
              doctor's tab rings when the patient joins the queue.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
