/* One screen of the patient journey, desktop layout in three columns:
     start   a sticky step rail — who it's for, the reference, and the
             journey's steps (the diagram's patient lane). Steps you can go
             back (or on) to are links.
     middle  the step itself in a wide card, actions bottom-end.
     end     a live summary of what the doctor will see — built from the
             answers as they're given — tips for this step, and the clinic's
             status right now. From `xl`; below that it's dropped.
   From `lg` all three columns fill the window down to the bottom edge (the
   rails stay put while a long step scrolls). Without a `step` the rails go
   and the page uses the full width (call-ended). Stacks to one column below `lg`. */

import type { ReactNode } from "react";

/** Columns size to their content (no stretching to the window's height — that left hollow
    cards); the side rails only cap at the window's height and scroll past it. */
const RAIL_H = "lg:max-h-[calc(100dvh-158px)]";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Check, Headphones, LifeBuoy, Lightbulb } from "lucide-react";
import { DURATIONS, HOUSEHOLD, RED_FLAGS } from "@/data/seed";
import { complaintKeys, complaintText } from "@/lib/complaint";
import { fmtTime, isClinicOpen } from "@/lib/clinic";
import { pick, useT, type StringKey } from "@/lib/i18n";
import { useNow } from "@/lib/use-now";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useIntakeDraft } from "@/store/intake-draft";
import { useSession } from "@/store/session-store";
import type { Consultation, ConsultStatus } from "@/lib/types";

export const PATIENT_STEPS = ["choose", "consent", "symptoms", "queue", "consult"] as const;
export type PatientStepKey = (typeof PATIENT_STEPS)[number];

/** A consultation still being walked through (as opposed to one finished earlier). */
const IN_PROGRESS: ConsultStatus[] = ["intake", "emergency", "queued", "ringing", "in_call"];

export default function PatientStep({
  step,
  title,
  lede,
  children,
  footer,
  back,
  even,
}: {
  step?: PatientStepKey;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** The previous step, as a "Back" button at the start of the footer. */
  back?: string;
  /** A short step: the three columns end level (rails stretch to the card) — no sticky rails needed. */
  even?: boolean;
}) {
  const body = (
    <section className={`flex min-w-0 flex-col rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)`}>
      <div className="px-6 pt-6 lg:px-8 lg:pt-7">
        {step ? <CompactSteps step={step} /> : null}
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="mt-2 max-w-[720px] text-[14.5px] leading-relaxed text-[var(--body)]">{lede}</p> : null}
      </div>
      {children ? <div className="flex-1 px-6 pt-5 pb-6 lg:px-8">{children}</div> : <div className="flex-1 pb-6" />}
      {footer ? (
        <div className="mt-auto flex flex-col-reverse gap-2.5 rounded-b-(--radius-card) border-t border-[var(--hair)] bg-[var(--sunken)] px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:px-8">
          {back ? <BackAction to={back} /> : null}
          {footer}
        </div>
      ) : null}
    </section>
  );

  if (!step) return <div className="line-in">{body}</div>;
  return (
    <div className={`line-in grid ${even ? "items-stretch" : "items-start"} gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]`}>
      {/* Below lg the rail gives way to the compact stepper inside the card, so the task comes first. */}
      <div className={even ? "hidden lg:flex" : `hidden lg:sticky lg:top-[134px] lg:flex ${RAIL_H}`}>
        <JourneyRail step={step} />
      </div>
      {body}
      <JourneyInfo step={step} even={even} />
    </div>
  );
}

/** Tablet / phone progress: "Step 2 of 5 · Consent" over a five-segment bar. */
function CompactSteps({ step }: { step: PatientStepKey }) {
  const { t } = useT();
  const current = PATIENT_STEPS.indexOf(step);
  return (
    <div className="mb-4 lg:hidden">
      <p className="text-[12.5px] font-semibold text-[var(--mute)]">
        {current + 1} / {PATIENT_STEPS.length} · <span className="text-[var(--ink)]">{t(`j_${step}` as StringKey)}</span>
      </p>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {PATIENT_STEPS.map((k, i) => (
          <span key={k} className={`h-1 rounded-full ${i <= current ? "bg-[var(--action)]" : "bg-[var(--hair)]"}`} />
        ))}
      </div>
    </div>
  );
}

/** This tab's consultation, if it's the one being walked through now. */
function useJourneyConsult(step: PatientStepKey): Consultation | undefined {
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  // On "choose" a finished consultation from earlier isn't part of this journey.
  if (!consult) return undefined;
  if (step === "choose" && !IN_PROGRESS.includes(consult.status)) return undefined;
  return consult;
}

/** Where a step lives, if the patient can go there from here (the route's own guard would let them in). */
function stepLink(key: PatientStepKey, c: Consultation | undefined): { to: string; search?: Record<string, string> } | null {
  switch (key) {
    case "choose":
      return { to: "/patient/choose" };
    case "consent":
      return c?.status === "intake" ? { to: "/patient/consent" } : null;
    case "symptoms":
      return (c?.status === "intake" && c.consentAt) || c?.status === "emergency" ? { to: "/patient/symptoms" } : null;
    case "queue":
      return c && ["queued", "ringing"].includes(c.status) ? { to: "/patient/queue" } : null;
    case "consult":
      return c && ["in_call", "drafting", "approved", "closed"].includes(c.status) ? { to: "/patient/call" } : null;
  }
}

function JourneyRail({ step }: { step: PatientStepKey }) {
  const { t, lang } = useT();
  const consult = useJourneyConsult(step);
  const current = PATIENT_STEPS.indexOf(step);

  return (
    <aside className="flex w-full flex-col overflow-y-auto rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <div className="border-b border-[var(--hair)] px-5 py-4">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--mute)]">{t("journeyTitle")}</p>
        {consult && step !== "choose" ? (
          <>
            <p className="mt-1.5 text-[15px] font-semibold text-[var(--ink)]">{lang === "ur" ? consult.member.nameUr : consult.member.name}</p>
            <p className="font-mono text-[11.5px] text-[var(--mute)]" dir="ltr">
              {consult.id} · {consult.member.mrn}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-[13px] text-[var(--body)]">{HOUSEHOLD.partner}</p>
        )}
      </div>
      <ol className="flex flex-col gap-1 px-3 py-3">
        {PATIENT_STEPS.map((key, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const link = state === "current" ? null : stepLink(key, consult);
          const inner = (
            <>
              <span
                className={`relative z-[1] flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border font-mono text-[12px] font-semibold ${
                  state === "done"
                    ? "border-[var(--action)] bg-[var(--action)] text-white"
                    : state === "current"
                      ? "border-[var(--link)] bg-[var(--white)] text-[var(--link)] shadow-[0_0_0_4px_var(--tint)]"
                      : link
                        ? "border-[var(--sky-300)] bg-[var(--white)] text-[var(--link)]"
                        : "border-[var(--line)] bg-[var(--white)] text-[var(--faint)]"
                }`}
                dir="ltr"
              >
                {state === "done" ? <Check size={15} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 pt-1">
                <span className={`block text-[15px] leading-tight ${state === "todo" && !link ? "text-[var(--mute)]" : "font-semibold text-[var(--ink)]"}`}>
                  {t(`j_${key}` as StringKey)}
                </span>
              </span>
            </>
          );
          return (
            <li key={key} className="relative">
              {i < PATIENT_STEPS.length - 1 ? (
                <span className={`absolute start-[28.5px] top-[44px] -bottom-3.5 w-px ${i < current ? "bg-[var(--link)]" : "bg-[var(--line)]"}`} />
              ) : null}
              {link ? (
                <Link
                  to={link.to}
                  search={link.search as never}
                  title={t("goToStep")}
                  className="group flex gap-3.5 rounded-(--radius-md) px-3 py-2.5 !text-inherit hover:bg-[var(--sunken)]"
                >
                  {inner}
                </Link>
              ) : (
                <div className={`flex gap-3.5 rounded-(--radius-md) px-3 py-2.5 ${state === "current" ? "bg-[var(--tint)]" : ""}`} aria-current={state === "current" ? "step" : undefined}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-auto flex items-start gap-2 border-t border-[var(--hair)] px-5 py-3 text-[12px] text-[var(--mute)]">
        <LifeBuoy size={14} className="mt-0.5 flex-shrink-0" />
        <span>{t("emergencyNote")}</span>
      </div>
    </aside>
  );
}

/** The end column: a live summary of the answers, tips for this step, and the clinic right now. */
function JourneyInfo({ step, even }: { step: PatientStepKey; even?: boolean }) {
  const { t, lang } = useT();
  const now = useNow(30_000);
  const consult = useJourneyConsult(step);
  const draftMemberId = useIntakeDraft((s) => s.memberId);
  const draftFor = useIntakeDraft((s) => s.consultId);
  const draft = useIntakeDraft((s) => s.symptoms);
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const forceOpen = usePlatform((s) => s.forceClinicOpen);

  // Who: the consultation's member once it exists, else whoever is picked on "choose".
  const member = consult?.member ?? HOUSEHOLD.members.find((m) => m.id === draftMemberId);
  // What: the unsent answers while on the symptoms step, else what was submitted.
  const s = consult && draftFor === consult.id && step === "symptoms" ? draft : consult?.symptoms ? { ...consult.symptoms, other: consult.symptoms.other ?? "" } : null;
  const complaint = s ? complaintText(s, lang) : "";
  const duration = s ? DURATIONS.find((d) => d.key === s.duration) : undefined;
  const flags = s?.redFlags ? RED_FLAGS.filter((f) => s.redFlags!.includes(f.key)) : [];
  const severityWord = s ? (s.severity >= 7 ? t("sevSevere") : s.severity >= 4 ? t("sevModerate") : t("sevMild")) : "";

  const open = forceOpen || isClinicOpen(now);
  const busy = new Set(consultations.filter((c) => c.status === "in_call" || c.status === "ringing").map((c) => c.prescriberId));
  const free = doctors.filter((d) => d.available && !busy.has(d.id)).length;
  const waiting = consultations.filter((c) => c.status === "queued").length;

  // Tips follow the step and the answers.
  const tips: { tone: "info" | "warn" | "err"; text: string | string[] }[] = [];
  if (step === "choose") {
    if (member?.relation === "child") tips.push({ tone: "info", text: t("tipChild") });
    else tips.push({ tone: "info", text: t("tipChoose") });
  }
  if (step === "consent") tips.push({ tone: "info", text: t("tipConsent") });
  if (step === "symptoms") {
    if (flags.length) tips.push({ tone: "err", text: t("tipFlags") });
    if (s && s.severity >= 8 && !flags.length) tips.push({ tone: "warn", text: t("tipSevere") });
    const keys = complaintKeys(s?.complaint);
    // One box for all picked complaints; a list once there's more than one.
    if (keys.length > 1) tips.push({ tone: "info", text: keys.map((k) => t(`tip_${k}` as StringKey)) });
    else tips.push({ tone: "info", text: keys.length ? t(`tip_${keys[0]}` as StringKey) : t("tipSymptoms") });
  }
  if (step === "queue") tips.push({ tone: "info", text: t("keepWaiting") });

  return (
    <aside
      className={`hidden flex-col gap-5 [&>*]:flex-shrink-0 xl:flex ${
        // Level with the card: the summary takes up the extra height.
        even ? "[&>section:first-child]:flex-1" : `overflow-y-auto slim-scrollbar xl:sticky xl:top-[134px] ${RAIL_H}`
      }`}
    >
      {/* ── What the doctor will see ─────────────────────────────────── */}
      <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
        <header className="border-b border-[var(--hair)] px-5 py-3.5">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--mute)]">{t("sumTitle")}</p>
        </header>
        <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2.5 px-5 py-4 text-[13px]">
          <dt className="text-[var(--mute)]">{t("patientLabel")}</dt>
          <dd className="min-w-0">
            {member ? (
              <>
                <span className="block font-semibold text-[var(--ink)]">{lang === "ur" ? member.nameUr : member.name}</span>
                <span className="block text-[12px] text-[var(--mute)]">
                  {t(`rel_${member.relation}` as StringKey)} · {t("years", { n: member.age })} ·{" "}
                  <span className="font-mono" dir="ltr">
                    {member.mrn}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-[var(--faint)]">{t("sumNotYet")}</span>
            )}
          </dd>

          <dt className="text-[var(--mute)]">{t("sumConsent")}</dt>
          <dd>
            {consult?.consentAt ? (
              <Pill tone="ok">{t("sumGivenAt", { time: fmtTime(consult.consentAt) })}</Pill>
            ) : (
              <span className="text-[var(--faint)]">{t("sumNotYet")}</span>
            )}
          </dd>

          <dt className="text-[var(--mute)]">{t("complaintLabel")}</dt>
          <dd className="min-w-0 text-[var(--ink)]">
            {complaint ? (
              <>
                <span className="font-semibold">{complaint}</span>
                {duration ? <span className="text-[var(--mute)]"> · {pick(duration, lang)}</span> : null}
              </>
            ) : (
              <span className="text-[var(--faint)]">{t("sumNotYet")}</span>
            )}
          </dd>

          <dt className="text-[var(--mute)]">{t("qSeverityShort")}</dt>
          <dd>
            {s?.complaint ? (
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--hair)]">
                  <span
                    className={`block h-full transition-[width] duration-300 ${s.severity >= 7 ? "bg-[var(--red)]" : s.severity >= 4 ? "bg-[var(--amber)]" : "bg-[var(--green)]"}`}
                    style={{ width: `${s.severity * 10}%` }}
                  />
                </span>
                <span className="font-mono text-[12.5px] text-[var(--ink)]" dir="ltr">
                  {s.severity}/10
                </span>
                <span className="text-[12px] text-[var(--mute)]">{severityWord}</span>
              </span>
            ) : (
              <span className="text-[var(--faint)]">{t("sumNotYet")}</span>
            )}
          </dd>

          <dt className="text-[var(--mute)]">{t("sumRedFlags")}</dt>
          <dd>
            {s?.redFlags == null ? (
              <span className="text-[var(--faint)]">{t("sumNotYet")}</span>
            ) : flags.length ? (
              <span className="flex flex-wrap gap-1">
                {flags.map((f) => (
                  <Pill key={f.key} tone="err">
                    {pick(f, lang)}
                  </Pill>
                ))}
              </span>
            ) : (
              <Pill tone="ok">{t("sumNone")}</Pill>
            )}
          </dd>

          {s?.details?.trim() ? (
            <>
              <dt className="text-[var(--mute)]">{t("sumDetails")}</dt>
              <dd className="text-[12.5px] italic leading-relaxed text-[var(--body)]">"{s.details.trim()}"</dd>
            </>
          ) : null}
        </dl>
      </section>

      {/* ── Tips ─────────────────────────────────────────────────────── */}
      {tips.length ? (
        <section className="grid gap-2">
          {tips.map((tip) => (
            <div
              key={String(tip.text)}
              className={`line-in flex items-start gap-2.5 rounded-(--radius-card) border px-4 py-3 text-[12.5px] leading-relaxed ${
                tip.tone === "err"
                  ? "border-[var(--color-danger-border)] bg-[var(--red-tint)] text-[var(--color-danger-body)]"
                  : tip.tone === "warn"
                    ? "border-[var(--line)] bg-[var(--amber-tint)] text-[var(--amber-ink)]"
                    : "border-[var(--line)] bg-[var(--tint)] text-[var(--body)]"
              }`}
            >
              {tip.tone === "info" ? (
                <Lightbulb size={15} className="mt-0.5 flex-shrink-0 text-[var(--link)]" />
              ) : (
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              )}
              {Array.isArray(tip.text) ? (
                <ul className="list-disc space-y-1 ps-4">
                  {tip.text.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <span>{tip.text}</span>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {/* ── Right now ────────────────────────────────────────────────── */}
      <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-4 shadow-(--shadow-sm)">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--mute)]">{t("infoNow")}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className={`rounded-(--radius-md) px-3 py-2 ${open ? "bg-[var(--green-tint)]" : "bg-[var(--sunken)]"}`}>
            <div className={`text-[12.5px] font-semibold ${open ? "text-[var(--color-green-ink)]" : "text-[var(--mute)]"}`}>
              {open ? t("clinicOpenNow") : t("clinicClosedNow")}
            </div>
            <div className="text-[11.5px] text-[var(--mute)]">{open ? t("clinicClosesAt") : "9:00–18:00"}</div>
          </div>
          <div className="rounded-(--radius-md) bg-[var(--tint)] px-3 py-2">
            <div className="text-[12.5px] font-semibold text-[var(--ink)]">{t(free === 1 ? "doctorFree" : "doctorsFree", { n: free })}</div>
            <div className="text-[11.5px] text-[var(--mute)]">{t("infoQueue", { n: waiting })}</div>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[12px] text-[var(--mute)]">
          <Headphones size={14} className="mt-0.5 flex-shrink-0 text-[var(--link)]" /> {t("needHelp")}
        </p>
      </section>
    </aside>
  );
}

function Pill({ tone, children }: { tone: "ok" | "err"; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-(--radius-pill) px-2 py-0.5 text-[11.5px] font-semibold ${
        tone === "ok" ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--red-tint)] text-[var(--color-red-ink)]"
      }`}
    >
      {children}
    </span>
  );
}

const actionBase = "inline-flex h-10 w-full items-center justify-center gap-2 rounded-(--radius-md) px-6 text-[14px] font-semibold sm:w-auto sm:min-w-[160px]";

export function PrimaryAction({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`${actionBase} btn-royal border border-transparent text-white shadow-(--shadow-xs) disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[var(--hair)] disabled:text-[var(--faint)] disabled:shadow-none`}
    >
      {children}
    </button>
  );
}

function BackAction({ to }: { to: string }) {
  const { t } = useT();
  return (
    <Link
      to={to}
      className={`${actionBase} border border-[var(--border-input)] bg-[var(--white)] !text-[var(--body)] hover:border-[var(--link)] hover:bg-[var(--tint)] sm:me-auto`}
    >
      <ArrowLeft size={16} /> {t("back")}
    </Link>
  );
}

export function SecondaryAction({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`${actionBase} border border-[var(--border-input)] bg-[var(--white)] text-[var(--body)] hover:border-[var(--link)] hover:bg-[var(--tint)]`}
    >
      {children}
    </button>
  );
}
