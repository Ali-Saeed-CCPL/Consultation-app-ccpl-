/* Sign-in against consult-api (used when VITE_API_URL is set; see api/client.ts).

   - Patients: CNIC + password. First time: activate (CNIC → a code by SMS or
     email, or the health card number + date of birth → choose a password).
     Forgot it: the same proof, then a new password.
   - Clinic admin: username + password through the staff sign-in.
   - Doctors: the demo doctor account until the doctor portal is connected to
     the API (Rameen's part); a doctor's server account is refused here for now.

   Errors are the API's own messages, which are written for people. */

import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { ApiError, api, tokens } from "@/api/client";
import { patientAuth, type ActivationStart, type CodeSent, type Proof } from "@/api/member";
import { DEMO_ACCOUNTS } from "@/data/seed";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

export const PASSWORD_MIN = 8;
const CNIC_DIGITS = /^\d{13}$/;
const digitsOf = (s: string) => s.replace(/[\s-]/g, "");
const isCnic = (s: string) => CNIC_DIGITS.test(digitsOf(s));
/** 35202-•••••••-1: enough for the account menu, without showing the whole number. */
const maskCnic = (s: string) => {
  const d = digitsOf(s);
  return `${d.slice(0, 5)}-•••••••-${d.slice(12)}`;
};

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-(--color-mute)">
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-(--radius-md) border border-(--color-border-input) bg-(--color-surface) px-3.5 py-3 text-[13.5px] text-(--color-ink) outline-0 transition-colors placeholder:text-(--color-faint) focus:border-(--color-teal)";

const submitClass = "h-11 w-full rounded-(--radius-md) btn-royal border border-transparent text-white text-[14px] font-semibold transition-colors disabled:opacity-60";
const linkClass = "text-[13px] font-semibold text-(--color-teal) hover:underline";

function Alert({ tone = "error", children }: { tone?: "error" | "ok" | "info"; children: ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-(--color-green) bg-(--color-green-tint) text-(--color-green-ink)"
      : tone === "info"
        ? "border-(--color-line) bg-(--color-surface) text-(--color-body)"
        : "border-(--color-red) bg-(--color-red-tint) text-(--color-red)";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-(--radius-md) border px-3.5 py-2.5 text-[12.5px] ${cls}`}>
      {children}
    </p>
  );
}

/** The API's message, with the wait when it says to try later. */
function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    const wait = Number(error.extended?.retry_after_seconds);
    if (error.status === 429 && wait > 0) return `${error.message} (try again in ${wait >= 120 ? `${Math.ceil(wait / 60)} minutes` : `${wait} seconds`})`;
    if (error.status === 400 && error.code === "BAD_REQUEST") return "Please check what you entered.";
    return error.message;
  }
  return "Can't reach the server. Check your connection and try again.";
}

function PasswordField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} pr-16`} />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-(--color-mute) hover:text-(--color-teal)"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function CnicField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div>
      <FieldLabel htmlFor="cnic">CNIC</FieldLabel>
      <input id="cnic" inputMode="numeric" autoComplete="username" autoFocus={autoFocus} placeholder="35202-1234567-1" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

/* ── Sign in ─────────────────────────────────────────────────────────────── */

type Mode = { view: "sign-in"; notice?: string } | { view: "activate" } | { view: "reset" };

export default function ApiSignIn() {
  const [mode, setMode] = useState<Mode>({ view: "sign-in" });
  if (mode.view === "activate") return <ProofFlow kind="activate" onBack={() => setMode({ view: "sign-in" })} onDone={() => undefined} />;
  if (mode.view === "reset")
    return <ProofFlow kind="reset" onBack={() => setMode({ view: "sign-in" })} onDone={() => setMode({ view: "sign-in", notice: "Your password is changed. Sign in with the new one." })} />;
  return <SignInForm notice={mode.notice} onActivate={() => setMode({ view: "activate" })} onReset={() => setMode({ view: "reset" })} />;
}

function SignInForm({ notice, onActivate, onReset }: { notice?: string; onActivate: () => void; onReset: () => void }) {
  const navigate = useNavigate();
  const session = useSession.getState();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(who: string, secret: string) {
    setError("");
    if (!who.trim()) return setError("Enter your CNIC (or staff username).");
    if (!secret) return setError("Enter your password.");
    setBusy(true);
    try {
      if (isCnic(who)) {
        const accountId = await patientAuth.login(who, secret);
        session.signInPatient(accountId, maskCnic(who));
        navigate({ to: "/patient/home", replace: true });
        return;
      }
      // Doctors keep the demo sign-in until the doctor portal is connected to the API.
      const name = who.trim().toLowerCase();
      const demoDoctor = DEMO_ACCOUNTS.find((a): a is Extract<(typeof DEMO_ACCOUNTS)[number], { role: "doctor" }> => a.role === "doctor" && a.username === name && a.password === secret);
      const madeDoctor = usePlatform.getState().logins.find((l) => l.username === name && l.password === secret);
      if (demoDoctor || madeDoctor) {
        session.signInDoctor(demoDoctor ? demoDoctor.doctorId : madeDoctor!.doctorId, name);
        navigate({ to: "/portal/dashboard", replace: true });
        return;
      }
      const out = await api<{ token: string; user: { role: "admin" | "doctor"; username: string; must_change_password: boolean } }>("POST", "/api/auth/staff/login", {
        auth: false,
        body: { username: name, password: secret },
      });
      if (out.user.role !== "admin") return setError("Doctor sign-in through the server comes with the doctor portal. Use the demo doctor account for now.");
      if (out.user.must_change_password) return setError("This admin account has a temporary password. Change it before signing in here.");
      tokens.setStaff(out.token);
      session.signInAdmin(out.user.username);
      navigate({ to: "/admin/dashboard", replace: true });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void signIn(user, password);
        }}
        noValidate
      >
        <h2 className="page-title !text-(--color-ink)">Sign in</h2>
        <div className="mt-6 space-y-4">
          {notice ? <Alert tone="ok">{notice}</Alert> : null}
          {error ? <Alert>{error}</Alert> : null}
          <div>
            <FieldLabel htmlFor="user">CNIC</FieldLabel>
            <input id="user" autoComplete="username" autoFocus placeholder="35202-1234567-1" value={user} onChange={(e) => setUser(e.target.value)} className={inputClass} />
            <p className="mt-1.5 text-[11.5px] text-(--color-mute)">Clinic staff: your username.</p>
          </div>
          <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
          <button type="submit" disabled={busy} className={submitClass}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={onActivate} className={linkClass}>
              First time? Activate your account
            </button>
            <button type="button" onClick={onReset} className={linkClass}>
              Forgot password?
            </button>
          </div>
        </div>
      </form>

      {/* Seeded demo logins of a local API (npm run consult:seed). Never shown in a production build. */}
      {import.meta.env.DEV ? (
        <div className="mt-8">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-(--color-mute)">Local demo accounts</p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
            {[
              { label: "Patient", user: "35202-1234567-1", password: "Demo@12345" },
              { label: "Doctor (demo)", user: "doctor", password: "123" },
              { label: "Admin", user: "admin", password: "Demo@12345" },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={busy}
                onClick={() => {
                  setUser(a.user);
                  setPassword(a.password);
                  void signIn(a.user, a.password);
                }}
                className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4 py-3 text-left hover:border-(--color-link)"
              >
                <span className="block text-[13.5px] font-semibold text-(--color-ink)">{a.label}</span>
                <span className="block truncate font-mono text-[11px] text-(--color-mute)">{a.user}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ── Activation and password reset: prove it's you, then choose a password ── */

type Method = ActivationStart["methods"][number];
type Step = { at: "cnic" } | { at: "method"; methods: Method[]; ref?: string; firstName?: string } | { at: "code"; sent: CodeSent; ref?: string } | { at: "card" } | { at: "password"; proof: Proof };

function ProofFlow({ kind, onBack, onDone }: { kind: "activate" | "reset"; onBack: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const [cnic, setCnic] = useState("");
  const [step, setStep] = useState<Step>({ at: "cnic" });
  const [code, setCode] = useState("");
  const [card, setCard] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activate = kind === "activate";

  const run = async (work: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const lookUp = () =>
    run(async () => {
      if (!isCnic(cnic)) return setError("Enter the 13 digits of your CNIC.");
      if (activate) {
        const s = await patientAuth.startActivation(cnic);
        setStep({ at: "method", methods: s.methods, ref: s.activation_ref, firstName: s.first_name });
      } else {
        const s = await patientAuth.startReset(cnic);
        setStep({ at: "method", methods: "methods" in s ? s.methods : [] });
      }
    });

  const choose = (m: Method, ref?: string) =>
    run(async () => {
      if (m.method === "card_dob") return setStep({ at: "card" });
      const sent = activate ? await patientAuth.sendActivationCode(cnic, ref!, m.method) : ((await patientAuth.startReset(cnic, m.method)) as CodeSent);
      setCode("");
      setStep({ at: "code", sent, ref });
    });

  const finish = (proof: Proof) =>
    run(async () => {
      if (password.length < PASSWORD_MIN) return setError(`Use at least ${PASSWORD_MIN} characters.`);
      if (new TextEncoder().encode(password).length > 72) return setError("That password is too long.");
      if (password !== again) return setError("The two passwords don't match.");
      if (activate) {
        const accountId = await patientAuth.completeActivation(cnic, proof, password);
        useSession.getState().signInPatient(accountId, maskCnic(cnic));
        navigate({ to: "/patient/home", replace: true });
        onDone();
      } else {
        await patientAuth.completeReset(cnic, proof, password);
        onDone();
      }
    });

  const title = activate ? "Activate your account" : "Reset your password";
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--color-teal)">
        <ArrowLeft size={15} /> Back to sign in
      </button>
      <h2 className="page-title !text-(--color-ink)">{title}</h2>
      <div className="mt-6 space-y-4">
        {error ? <Alert>{error}</Alert> : null}

        {step.at === "cnic" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void lookUp();
            }}
          >
            <p className="text-[13px] text-(--color-body)">
              {activate ? "Enter the CNIC of the employee on the policy. We check your cover with CCPL." : "Enter the CNIC you sign in with."}
            </p>
            <CnicField value={cnic} onChange={setCnic} autoFocus />
            <button type="submit" disabled={busy} className={submitClass}>
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>
        ) : null}

        {step.at === "method" ? (
          <div className="space-y-3">
            <p className="text-[13px] text-(--color-body)">
              {step.firstName ? `Hello ${step.firstName}. ` : ""}How should we check it's you?
            </p>
            {step.methods.length === 0 ? <Alert tone="info">There's no way to check this account online. Call CCPL support on 0800-00-2273.</Alert> : null}
            {step.methods.map((m) => (
              <button
                key={m.method}
                type="button"
                disabled={busy}
                onClick={() => void choose(m, step.ref)}
                className="flex w-full items-center gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4 py-3 text-left hover:border-(--color-link) disabled:opacity-60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-(--radius-md) bg-[var(--tint)] text-[var(--link)]">
                  {m.method === "sms" ? <MessageSquare size={16} /> : m.method === "email" ? <Mail size={16} /> : <ShieldCheck size={16} />}
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold text-(--color-ink)">
                    {m.method === "sms" ? "Text me a code" : m.method === "email" ? "Email me a code" : "Use my health card and date of birth"}
                  </span>
                  {m.sent_to ? <span className="block font-mono text-[11.5px] text-(--color-mute)">{m.sent_to}</span> : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step.at === "code" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\d{6}$/.test(code)) return setError("The code is 6 digits.");
              setError("");
              setStep({ at: "password", proof: { method: "code", activation_ref: step.ref, code } });
            }}
          >
            <Alert tone="info">
              We sent a 6-digit code to <span className="font-mono">{step.sent.sent_to}</span>. It works for 5 minutes.
              {step.sent.dev_code ? <span className="block font-mono">Local test code: {step.sent.dev_code}</span> : null}
            </Alert>
            <div>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${inputClass} font-mono tracking-[0.3em]`} />
            </div>
            <button type="submit" className={submitClass}>
              Continue
            </button>
          </form>
        ) : null}

        {step.at === "card" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!card.trim() || !dob) return setError("Enter your health card number and date of birth.");
              setError("");
              setStep({ at: "password", proof: { method: "card_dob", health_card_no: card.trim(), date_of_birth: dob } });
            }}
          >
            <div>
              <FieldLabel htmlFor="card">Health card number</FieldLabel>
              <input id="card" autoFocus value={card} onChange={(e) => setCard(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel htmlFor="dob">Date of birth</FieldLabel>
              <input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" className={submitClass}>
              Continue
            </button>
          </form>
        ) : null}

        {step.at === "password" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void finish(step.proof);
            }}
          >
            <p className="flex items-center gap-2 text-[13px] text-(--color-body)">
              <KeyRound size={15} /> Choose a password: at least {PASSWORD_MIN} characters.
            </p>
            <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordField id="again" label="Type it again" value={again} onChange={setAgain} autoComplete="new-password" />
            <button type="submit" disabled={busy} className={submitClass}>
              {busy ? "Saving…" : activate ? "Activate and sign in" : "Change password"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
