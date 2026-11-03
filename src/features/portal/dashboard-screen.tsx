/* Doctor dashboard — the signed-in doctor's own work, top to bottom:
     greeting          a royal-blue band with the date and your day's numbers, as on the
                       patient home;
     status card       whether calls reach you (with the switch), or the call that is
                       with you now, and the clock;
     consultations     yours — today's first, then earlier ones — with diagnosis, medicines, status;
     live queue        patients waiting, as cards with how long they have waited;
     follow-ups due    patients due back, from the follow-up written on their prescription.
   Clinic-wide figures (doctors on duty, all consultations) are on the admin overview
   (features/admin/admin-dashboard.tsx). */

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Clock, Hourglass, Inbox, PhoneIncoming, Pill, Power, Stethoscope, Timer, Users } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Section from "@/components/ui/section";
import StatusTag from "@/components/ui/status-tag";
import { DURATIONS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDuration, fmtTime, greetingKey, isOthersActive } from "@/lib/clinic";
import LiveClock from "@/components/common/live-clock";
import { usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import type { Consultation, Doctor } from "@/lib/types";

const complaintLabel = (c: Consultation) => complaintText(c.symptoms) || "—";
const sexAge = (c: Consultation) => `${c.member.age} ${c.member.gender}`;
/** "8m", "2h 05m" — how long someone has waited or a call has run. */
const span = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

export default function DashboardScreen() {
  const doctor = useCurrentDoctor()!;
  const consultations = usePlatform((s) => s.consultations);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const by = (...statuses: Consultation["status"][]) => consultations.filter((c) => statuses.includes(c.status));
  const waiting = by("queued", "ringing").sort((a, b) => a.createdAt - b.createdAt);
  // The live queue lists only what this doctor can act on: waiting patients and their own call.
  const liveForMe = [...waiting, ...by("in_call")].filter((c) => !isOthersActive(c, doctor.id));
  const liveInCall = liveForMe.filter((c) => c.status === "in_call").length;
  const myReleased = by("approved", "closed").filter((c) => c.prescriberId === doctor.id);
  const myEnded = consultations.filter((c) => c.prescriberId === doctor.id && c.callStartedAt && c.callEndedAt);
  const myAvgCall = avg(myEnded.map((c) => c.callEndedAt! - c.callStartedAt!));
  const mySeen = consultations.filter((c) => c.prescriberId === doctor.id && c.callStartedAt);
  // Today's own consultations, newest first — the doctor's day log.
  const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });
  const myToday = mySeen.filter((c) => dayOf(c.callStartedAt!) === dayOf(now)).sort((a, b) => b.callStartedAt! - a.callStartedAt!);
  // Earlier ones continue the list below today's, up to eight rows in all.
  const myEarlier = mySeen
    .filter((c) => dayOf(c.callStartedAt!) !== dayOf(now))
    .sort((a, b) => b.callStartedAt! - a.callStartedAt!)
    .slice(0, Math.max(0, 8 - myToday.length));
  const followUps = followUpsDue(myReleased, now);
  const myCall = consultations.find((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);

  const stats = [
    {
      label: "Waiting now",
      value: String(waiting.length),
      note: waiting.length ? `Longest ${span(now - (waiting[0].consentAt ?? waiting[0].createdAt))}` : "Queue is clear",
      icon: <Users size={16} />,
      tone: waiting.length ? "text-[var(--amber)]" : "text-[var(--green)]",
    },
    { label: "Seen today", value: String(mySeen.length), note: `${myReleased.length} released`, icon: <Stethoscope size={16} />, tone: "text-[var(--link)]" },
    { label: "Avg call", value: myAvgCall ? fmtDuration(myAvgCall) : "—", note: `${myEnded.length} ended`, icon: <Timer size={16} />, tone: "text-[var(--link)]" },
  ];

  return (
    <div className="p-6">
      <section className="overflow-hidden surface-brand rounded-(--radius-xl) px-6 py-4 text-white lg:px-8">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/80">
              {new Date(now).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {CLINIC_HOURS.days}, 9 AM–6 PM
            </p>
            <h1 className="page-title mt-1 !text-white sm:text-[28px]">
              Good {greetingKey(now)}, {doctor.name.split(" ").slice(0, 2).join(" ")}
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((st) => (
              <div key={st.label} className="min-w-0 rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] px-4 py-2.5 lg:w-[176px]">
                <span className={st.tone}>{st.icon}</span>
                <div className="mt-1.5 text-[12.5px] font-medium text-[var(--body)]">{st.label}</div>
                <div className="font-mono text-[20px] font-bold leading-tight text-[var(--ink)]">{st.value}</div>
                <div className="truncate text-[12px] text-[var(--mute)]">{st.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4">
        <StatusBar doctor={doctor} myCall={myCall} now={now} onToggle={() => usePlatform.getState().setAvailability(doctor.id, !doctor.available)} />
      </div>

      <div className="mt-4 grid gap-5 xl:min-h-[calc(100dvh-419px)] xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section
          title="Your consultations"
          sub={`${myToday.length} call${myToday.length === 1 ? "" : "s"} · ${myToday.filter((c) => c.approvedAt).length} prescription${myToday.filter((c) => c.approvedAt).length === 1 ? "" : "s"} released`}
          className="flex flex-col"
          bodyClassName="flex flex-1 flex-col"
          action={
            <Link to="/portal/consultations" search={{ view: "history" }} className="text-[13px] font-semibold">
              History →
            </Link>
          }
        >
          {myToday.length + myEarlier.length === 0 ? (
            <Empty icon={<Pill size={18} />}>No consultations yet.</Empty>
          ) : (
            <div className="flex-1 overflow-hidden rounded-(--radius-lg) border border-[var(--line)]">
              <div className="grid grid-cols-[92px_minmax(0,1.1fr)_minmax(0,1.4fr)_92px_150px] gap-3 border-b border-[var(--line)] bg-[var(--sunken)] px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--body)]">
                <span>Time</span>
                <span>Patient</span>
                <span>Diagnosis</span>
                <span>Medicines</span>
                <span>Status</span>
              </div>
              <ul className="divide-y divide-[var(--hair)]">
                <GroupRow label="Today" n={myToday.length} />
                {myToday.length ? myToday.map((c) => <TodayRow key={c.id} consult={c} now={now} />) : <li className="px-4 py-3 text-[13px] text-[var(--body)]">No calls yet today.</li>}
                {myEarlier.length ? <GroupRow label="Earlier" n={myEarlier.length} /> : null}
                {myEarlier.map((c) => (
                  <TodayRow key={c.id} consult={c} now={now} dated />
                ))}
              </ul>
            </div>
          )}
        </Section>

        <div className="grid grid-rows-[auto_1fr] gap-5">
        <Section
          title="Live queue"
          sub={`${liveForMe.length - liveInCall} waiting · ${liveInCall} in consult`}
          action={
            <Link to="/portal/consultations" search={{ view: "live" }} className="text-[13px] font-semibold">
              Open queue →
            </Link>
          }
        >
          {liveForMe.length === 0 ? (
            <Empty icon={<Inbox size={18} />}>No one is waiting.</Empty>
          ) : (
            <ul className="grid gap-2.5">
              {liveForMe.slice(0, 4).map((c) => (
                <QueueCard key={c.id} consult={c} now={now} />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Follow-ups due" sub="Next 3 days, from the follow-up on each prescription">
          {followUps.length === 0 ? (
            <Empty icon={<CalendarClock size={18} />}>No follow-ups in the next 3 days.</Empty>
          ) : (
            <ul className="grid gap-2.5">
              {followUps.map((fu) => (
                <FollowUpCard key={fu.consult.id} {...fu} now={now} />
              ))}
            </ul>
          )}
        </Section>
        </div>
      </div>
    </div>
  );
}

/** The status card. Patients call in and are rung through to a free GP, so a patient
    shows here only while their call is with this doctor (ringing or in progress); otherwise
    it says whether calls reach you, with the switch. The clock sits at the end. */
function StatusBar({ doctor, myCall, now, onToggle }: { doctor: Doctor; myCall?: Consultation; now: number; onToggle: () => void }) {
  const since = DURATIONS.find((d) => d.key === myCall?.symptoms?.duration)?.en;
  const facts = myCall
    ? [
        complaintLabel(myCall),
        ...(since ? [since] : []),
        ...(myCall.symptoms ? [`severity ${myCall.symptoms.severity}/10`] : []),
        ...(myCall.callStartedAt ? [`${fmtDuration(now - myCall.callStartedAt)} on call`] : []),
      ]
    : [];
  const button = "inline-flex flex-shrink-0 items-center gap-2 rounded-(--radius-md) px-4 py-2.5 text-[13.5px] font-bold";

  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-(--radius-xl) border border-[var(--line)] bg-gradient-to-br from-[var(--tint)] to-[var(--white)] px-6 py-3.5 text-[var(--ink)] shadow-(--shadow-sm)">
      <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--action)] text-[16px] font-bold text-white">
        {myCall ? initialsOf(myCall.member.name) : doctor.initials}
        <span
          className={`absolute -end-0.5 -bottom-0.5 h-4 w-4 rounded-full border-[3px] border-[var(--white)] ${myCall || doctor.available ? "bg-[var(--green)]" : "bg-[var(--faint)]"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">
          {myCall ? (myCall.status === "ringing" ? "Ringing you now" : "On a call with") : doctor.available ? "Available" : "Unavailable"}
        </p>
        <p className="truncate text-[20px] font-bold leading-tight text-[var(--color-teal-deep)]">
          {myCall ? `${myCall.member.name} · ${sexAge(myCall)}` : doctor.available ? "Patients' calls will ring here" : "You're off calls"}
        </p>
        {myCall ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <span key={f} className="rounded-(--radius-pill) border border-[var(--line)] bg-[var(--white)] px-2.5 py-0.5 text-[12.5px] font-semibold text-[var(--body)]">
                {f}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--body)]">
            {doctor.name} · {doctor.pmdc}
          </p>
        )}
      </div>

      {myCall ? (
        <Link to="/portal/consultations/$id" params={{ id: myCall.id }} className={`${button} btn-royal !text-white`}>
          <PhoneIncoming size={16} /> {myCall.status === "ringing" ? "Answer" : "Return to call"}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className={`${button} ${
            doctor.available
              ? "border border-[var(--border-input)] bg-[var(--white)] text-[var(--ink)] hover:border-[var(--link)] hover:bg-[var(--tint)]"
              : "btn-royal text-white"
          }`}
        >
          <Power size={15} /> {doctor.available ? "Go unavailable" : "Go available"}
        </button>
      )}

      <LiveClock />
    </section>
  );
}

/** A patient in the live queue: who, what for, and how long they have waited (amber past 15 min). */
function QueueCard({ consult: c, now }: { consult: Consultation; now: number }) {
  const inCall = c.status === "in_call";
  const since = inCall ? c.callStartedAt! : (c.consentAt ?? c.createdAt);
  const long = !inCall && now - since > 15 * 60_000;
  return (
    <li>
      <Link
        to="/portal/consultations/$id"
        params={{ id: c.id }}
        className="flex items-center gap-3 rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] px-3.5 py-3 !text-inherit hover:border-[var(--sky-300)] hover:bg-[var(--sunken)]"
      >
        <Avatar initials={initialsOf(c.member.name)} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">
            {c.member.name} <span className="font-normal text-[var(--body)]">· {sexAge(c)}</span>
          </span>
          <span className="block truncate text-[13px] text-[var(--body)]">
            {complaintLabel(c)} · {c.lang === "ur" ? "Urdu" : "English"}
          </span>
        </span>
        <span className="flex flex-shrink-0 flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2.5 py-0.5 font-mono text-[12.5px] font-bold ${
              inCall ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : long ? "bg-[var(--amber-tint)] text-[var(--amber-ink)]" : "bg-[var(--tint)] text-[var(--link)]"
            }`}
          >
            <Hourglass size={12} /> {span(now - since)}
          </span>
          <StatusTag status={c.status} />
        </span>
      </Link>
    </li>
  );
}

/** One of today's consultations: when and how long, who and what for, the diagnosis,
    the medicines, and where it stands. Opens the record. */
function TodayRow({ consult: c, now, dated }: { consult: Consultation; now: number; dated?: boolean }) {
  const live = !c.callEndedAt;
  const length = span((c.callEndedAt ?? now) - c.callStartedAt!);
  return (
    <li>
      <Link
        to="/portal/consultations/$id"
        params={{ id: c.id }}
        className="group grid grid-cols-[92px_minmax(0,1.1fr)_minmax(0,1.4fr)_92px_150px] items-center gap-3 px-4 py-3 !text-inherit hover:bg-[var(--sunken)]"
      >
        <span>
          <span className="block font-mono text-[13px] font-semibold text-[var(--ink)]">
            {dated ? new Date(c.callStartedAt!).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, day: "numeric", month: "short" }) : fmtTime(c.callStartedAt!)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--body)]">
            <Clock size={11} /> {length}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={initialsOf(c.member.name)} size={34} />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{c.member.name}</span>
            <span className="block truncate text-[12.5px] text-[var(--body)]">
              {sexAge(c)} · {complaintLabel(c)}
            </span>
          </span>
        </span>
        <span className="min-w-0 truncate text-[13.5px] text-[var(--ink)]" title={c.notes.diagnosis}>
          {c.notes.diagnosis || <span className="text-[var(--mute)]">{live ? "In progress" : "—"}</span>}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--body)]">
          <Pill size={13} className="text-[var(--link)]" /> {c.rx.length}
        </span>
        <span className="flex items-center justify-between gap-2">
          <StatusTag status={c.status} />
          <ArrowRight size={15} className="flex-shrink-0 text-[var(--faint)] group-hover:text-[var(--link)]" />
        </span>
      </Link>
    </li>
  );
}

function GroupRow({ label, n }: { label: string; n: number }) {
  return (
    <li className="flex items-center gap-2 bg-[var(--sunken)] px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[var(--body)]">
      {label} <span className="font-mono text-[var(--mute)]">{n}</span>
    </li>
  );
}

const DAY = 86_400_000;
/** "Review in 3 days…", "Teleconsult in 2 weeks…" → when that falls due, from the release.
    Only those due from now to three days ahead are listed.
    ponytail: fixed 3-day window, no overdue — a proper "next days" view (and follow-up
    as a structured field instead of parsed text) comes later. */
const FOLLOW_UP_WINDOW = 3 * 86_400_000;
function followUpsDue(released: Consultation[], now: number) {
  return released
    .map((c) => {
      const m = c.notes.followUp.match(/(\d+)\s*(day|week)/i);
      if (!m) return null;
      const due = (c.approvedAt ?? c.callEndedAt ?? c.createdAt) + Number(m[1]) * (m[2].toLowerCase() === "week" ? 7 : 1) * DAY;
      return { consult: c, due };
    })
    .filter((x): x is { consult: Consultation; due: number } => Boolean(x) && x!.due >= now && x!.due <= now + FOLLOW_UP_WINDOW)
    .sort((a, b) => a.due - b.due)
    .slice(0, 4);
}

/** A patient due a follow-up: when, and the note you wrote. Amber when due within a day, red once overdue. */
function FollowUpCard({ consult: c, due, now }: { consult: Consultation; due: number; now: number }) {
  const days = Math.round((due - now) / DAY);
  const when = days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : `In ${days} day${days === 1 ? "" : "s"}`;
  const tone = days < 0 ? "bg-[var(--red-tint)] text-[var(--color-red-ink)]" : days <= 1 ? "bg-[var(--amber-tint)] text-[var(--amber-ink)]" : "bg-[var(--tint)] text-[var(--link)]";
  return (
    <li>
      <Link
        to="/portal/consultations/$id"
        params={{ id: c.id }}
        className="flex items-start gap-3 rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] px-3.5 py-3 !text-inherit hover:border-[var(--sky-300)] hover:bg-[var(--sunken)]"
      >
        <Avatar initials={initialsOf(c.member.name)} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-semibold text-[var(--ink)]">{c.member.name}</span>
            <span className={`flex-shrink-0 rounded-(--radius-pill) px-2.5 py-0.5 text-[12px] font-bold ${tone}`}>{when}</span>
          </span>
          <span className="block truncate text-[12.5px] text-[var(--body)]">{c.notes.diagnosis || "—"}</span>
          <span className="mt-0.5 line-clamp-1 text-[12.5px] text-[var(--mute)]" title={c.notes.followUp}>
            {c.notes.followUp}
          </span>
        </span>
      </Link>
    </li>
  );
}

function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex flex-col items-center gap-2 rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-6 text-center text-[13px] text-[var(--body)]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tint)] text-[var(--link)]">{icon}</span>
      {children}
    </p>
  );
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
