/* Queue & assign GP — the patient's view. Watches the consultation: ringing
   a doctor, waiting for a free one (or outside clinic hours: wait or call
   back), and hands over to the call screen the moment the doctor accepts. */

import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Check, Clock, LoaderCircle, PhoneCall, Stethoscope, Users } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import PatientStep, { SecondaryAction } from "@/features/patient/patient-step";
import { CLINIC_HOURS, fmtDateTime, isClinicOpen, nextOpening } from "@/lib/clinic";
import { useT } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

/** How long the demo auto-answer "rings" before connecting. */
const CONNECT_AFTER_MS = 4500;

export default function QueueScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const phone = useSession((s) => s.patientPhone);
  const consult = useConsult(consultId ?? undefined);
  const doctors = usePlatform((s) => s.doctors);
  const consultations = usePlatform((s) => s.consultations);
  const forceOpen = usePlatform((s) => s.forceClinicOpen);
  const autoConnect = usePlatform((s) => s.autoConnect);
  const { chooseCallback, rejoinQueue, leaveQueue, demoConnect } = usePlatform.getState();

  const status = consult?.status;
  useEffect(() => {
    if (status === "in_call") navigate({ to: "/patient/call" });
  }, [status, navigate]);

  // Demo auto-answer: a waiting patient is put through after a few seconds,
  // so the call can be tried without a doctor tab open.
  const open = forceOpen || isClinicOpen();
  const connecting = autoConnect && open && (status === "queued" || status === "ringing");
  useEffect(() => {
    if (!connecting || !consult) return;
    const timer = window.setTimeout(() => demoConnect(consult.id), CONNECT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [connecting, consult?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- one timer per wait

  if (!consult || !phone) return <Navigate to="/patient/choose" />;
  if (["drafting", "approved"].includes(consult.status)) return <Navigate to="/patient/call" />;
  if (!["queued", "ringing", "callback", "in_call"].includes(consult.status)) return <Navigate to="/patient/choose" />;

  const callbackAt = open ? Date.now() + 30 * 60_000 : nextOpening();
  const position =
    consultations.filter((c) => c.status === "queued" && c.createdAt <= consult.createdAt).length || 1;
  const doctor = doctors.find((d) => d.id === consult.prescriberId);
  const prettyPhone = `${phone.slice(0, 4)} ${phone.slice(4)}`;

  if (connecting) {
    return (
      <PatientStep step="queue" title={t("connectingTitle")} lede={t("queueRingingSub")}>
        <Connecting doctorName={doctor?.name} doctorInitials={doctor?.initials} />
      </PatientStep>
    );
  }

  if (consult.status === "ringing" && doctor) {
    return (
      <PatientStep step="queue" title={t("queueRinging", { doctor: doctor.name })} lede={t("queueRingingSub")}>
        <div className="flex flex-col items-center rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-6 py-10">
          <span className="relative inline-flex">
            <span className="ring-halo" />
            <span className="ring-halo delay" />
            <Avatar initials={doctor.initials} size={72} className="relative" />
          </span>
          <p className="mt-5 text-[15px] font-semibold text-[var(--ink)]">{doctor.name}</p>
          <p className="font-mono text-[11.5px] text-[var(--mute)]" dir="ltr">
            {doctor.pmdc}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-green-ink)]">
            <PhoneCall size={14} /> {t("callConnecting")}
          </p>
        </div>
      </PatientStep>
    );
  }

  if (consult.status === "callback") {
    return (
      <PatientStep
        step="queue"
        title={t("callbackSet")}
        lede={t("callbackSetSub", { phone: prettyPhone, time: fmtDateTime(consult.callbackAt ?? callbackAt) })}
        footer={
          <>
            {open ? <SecondaryAction onClick={() => rejoinQueue(consult.id)}>{t("waitInstead")}</SecondaryAction> : null}
            <SecondaryAction
              onClick={() => {
                leaveQueue(consult.id);
                navigate({ to: "/patient/choose" });
              }}
            >
              {t("leaveQueue")}
            </SecondaryAction>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-5">
          <CalendarClock size={26} className="text-[var(--link)]" />
          <span className="font-mono text-[15px] font-semibold text-[var(--ink)]" dir="ltr">
            {fmtDateTime(consult.callbackAt ?? callbackAt)}
          </span>
        </div>
      </PatientStep>
    );
  }

  return (
    <PatientStep
      step="queue"
      title={open ? t("queueWaiting") : t("queueClosed")}
      lede={open ? t("queueWaitingSub", { n: position }) : t("queueClosedSub")}
      footer={
        <>
          {open ? (
            <p className="flex items-center justify-center gap-2 rounded-(--radius-md) bg-[var(--amber-tint)] px-3 py-2.5 text-[13.5px] font-medium text-[var(--amber-ink)]">
              <span className="live-dot !bg-[var(--amber)]" /> {t("keepWaiting")}
            </p>
          ) : null}
          <SecondaryAction onClick={() => chooseCallback(consult.id, callbackAt)}>{t("callMeBack", { time: fmtDateTime(callbackAt) })}</SecondaryAction>
          <button
            type="button"
            onClick={() => {
              leaveQueue(consult.id);
              navigate({ to: "/patient/choose" });
            }}
            className="py-2 text-[13.5px] font-semibold text-[var(--color-red-ink)]"
          >
            {t("leaveQueue")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-4">
          <Users size={18} className="text-[var(--link)]" />
          <div className="mt-2 font-mono text-[24px] font-semibold text-[var(--ink)]" dir="ltr">
            #{position}
          </div>
        </div>
        <div className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-4">
          <Clock size={18} className="text-[var(--link)]" />
          <div className="mt-2 font-mono text-[13px] font-semibold leading-snug text-[var(--ink)]" dir="ltr">
            {CLINIC_HOURS.days}
            <br />
            9:00–18:00 PKT
          </div>
        </div>
      </div>
    </PatientStep>
  );
}

/** Connecting — three phases over the auto-answer's few seconds. */
function Connecting({ doctorName, doctorInitials }: { doctorName?: string; doctorInitials?: string }) {
  const { t } = useT();
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, []);
  const progress = Math.min(1, (now - startedAt) / CONNECT_AFTER_MS);
  const phases = [t("phaseFind"), doctorName ? t("queueRinging", { doctor: doctorName }) : t("phaseRing"), t("phaseJoin")];
  const at = Math.min(phases.length - 1, Math.floor(progress * phases.length));

  return (
    <div className="grid gap-6 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10 md:p-8">
      <span className="relative mx-auto inline-flex">
        <span className="ring-halo" />
        <span className="ring-halo delay" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[var(--sky-300)] bg-[var(--primary)] font-mono text-[26px] font-semibold text-[var(--ink)]">
          {doctorInitials ?? <Stethoscope size={34} />}
        </span>
      </span>
      <div className="min-w-0">
        <ol className="grid gap-3">
          {phases.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 text-[14.5px] ${i <= at ? "text-[var(--ink)]" : "text-[var(--faint)]"}`}>
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                  i < at ? "bg-[var(--green)] text-[var(--color-on-fill)]" : i === at ? "bg-[var(--tint)] text-[var(--link)]" : "bg-[var(--sunken)]"
                }`}
              >
                {i < at ? <Check size={13} strokeWidth={3} /> : i === at ? <LoaderCircle size={14} className="animate-spin" /> : null}
              </span>
              <span className={i === at ? "font-semibold" : undefined}>{label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--hair)]">
          <div className="h-full rounded-full bg-[var(--link)] transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-2 text-[12px] text-[var(--mute)]">{t("connectingDemo")}</p>
      </div>
    </div>
  );
}
