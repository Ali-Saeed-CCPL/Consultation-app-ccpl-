/* Doctor dashboard — the signed-in doctor's own work: their numbers, today's
   consultation progress, the live queue and what they released recently.
   Clinic-wide figures (progress, scheduled calls, doctors on duty) are on the
   admin overview (features/admin/admin-dashboard.tsx). */

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, PhoneIncoming } from "lucide-react";
import KpiTile from "@/components/common/kpi-tile";
import ConsultProgress from "@/features/portal/consult-progress";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Section from "@/components/ui/section";
import StatusTag from "@/components/ui/status-tag";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDuration, greetingKey, isOthersActive, minutesAgo } from "@/lib/clinic";
import LiveClock from "@/components/common/live-clock";
import { usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import type { Consultation, Doctor } from "@/lib/types";

const complaintLabel = (c: Consultation) => complaintText(c.symptoms) || "—";

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
  const inCall = by("in_call");
  // The live queue panel lists only what this doctor can act on: waiting patients and their own call.
  const liveForMe = [...waiting, ...inCall].filter((c) => !isOthersActive(c, doctor.id));
  const myReleased = by("approved", "closed").filter((c) => c.prescriberId === doctor.id);
  const myEnded = consultations.filter((c) => c.prescriberId === doctor.id && c.callStartedAt && c.callEndedAt);
  const myAvgCall = avg(myEnded.map((c) => c.callEndedAt! - c.callStartedAt!));
  const mySeen = consultations.filter((c) => c.prescriberId === doctor.id && c.callStartedAt);
  const recentReleased = [...myReleased].sort((a, b) => (b.approvedAt ?? 0) - (a.approvedAt ?? 0)).slice(0, 4);
  const myCall = consultations.find((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);


  return (
    <div className="p-6">
      <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-between gap-3 hero-band border-b border-[var(--line)] px-6 py-5">
        <div className="flex items-center gap-3.5">
          <Avatar initials={doctor.initials} size={48} />
          <div>
            <p className="text-[12.5px] text-[var(--mute)]">
              {new Date(now).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long" })} · {CLINIC_HOURS.days}, 9 AM–6 PM
            </p>
            <h1 className="page-title">
              Good {greetingKey(now)}, {doctor.name.split(" ").slice(0, 2).join(" ")}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={waiting.length ? "amber" : "neutral"}>{waiting.length ? `${waiting.length} waiting` : "No one waiting"}</Chip>
          <LiveClock />
        </div>
      </div>

      {/* Who's next for this doctor, then their own numbers — clinic-wide figures live on the admin overview. */}
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <NextPatient doctor={doctor} myCall={myCall} now={now} />
      <div className="grid grid-cols-2 gap-3.5">
        <KpiTile index={0} accent="amber" label="Waiting now" value={String(waiting.length)} detail={waiting.length ? `Longest ${minutesAgo(waiting[0].createdAt, now).replace(" ago", "")}` : "Queue is clear"} />
        <KpiTile index={1} accent="green" label="My call" value={myCall ? "On call" : doctor.available ? "Free" : "Off"} detail={myCall ? `With ${myCall.member.name}` : doctor.available ? "Ready for the next patient" : "Go available to be rung"} />
        <KpiTile index={2} accent="violet" label="Seen today" value={String(mySeen.length)} detail={`${myReleased.length} prescription${myReleased.length === 1 ? "" : "s"} released`} />
        <KpiTile index={3} accent="teal" label="Avg call" value={myAvgCall ? fmtDuration(myAvgCall) : "—"} detail={`${myEnded.length} call${myEnded.length === 1 ? "" : "s"} ended`} />
      </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ConsultProgress consultations={consultations} doctorId={doctor.id} now={now} />
        <div className="grid gap-5">
        <Section
          title="Live queue"
          sub={`${waiting.length} waiting · ${inCall.length} in consult`}
          action={
            <Link to="/portal/consultations" search={{ view: "live" }} className="text-[13px] font-semibold">
              Open queue →
            </Link>
          }
        >
          {liveForMe.length === 0 ? (
            <Empty>No one is waiting.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--hair)]">
              {liveForMe.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <Avatar initials={initialsOf(c.member.name)} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link to="/portal/consultations/$id" params={{ id: c.id }} className="block truncate text-[13.5px] font-semibold text-[var(--ink)] hover:text-[var(--link)]">
                      {c.member.name}
                    </Link>
                    <div className="truncate text-[12px] text-[var(--mute)]">
                      {complaintLabel(c)} · {c.lang === "ur" ? "Urdu" : "English"} ·{" "}
                      <span className="font-mono">{c.callStartedAt ? fmtDuration(now - c.callStartedAt) : minutesAgo(c.createdAt, now)}</span>
                    </div>
                  </div>
                  <StatusTag status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Recently released"
          action={
            <Link to="/portal/consultations" search={{ view: "history" }} className="text-[13px] font-semibold">
              History →
            </Link>
          }
        >
          {recentReleased.length === 0 ? (
            <Empty>No prescriptions released yet.</Empty>
          ) : (
            <ul className="grid gap-2">
              {recentReleased.map((c) => (
                <Attention key={c.id} to={c.id} title={c.member.name} note={`${c.notes.diagnosis || "—"} · ${c.approvedAt ? minutesAgo(c.approvedAt, now) : ""}`} />
              ))}
            </ul>
          )}
        </Section>
        </div>
      </div>
    </div>
  );
}

/** The brand-blue card. Patients call in and are rung through to a free GP, so a
    patient takes this card only while their call is with this doctor (ringing or in
    progress). Otherwise it is the doctor's own card: whether calls will reach them. */
function NextPatient({ doctor, myCall, now }: { doctor: Doctor; myCall?: Consultation; now: number }) {
  if (!myCall) {
    return (
      <section className="flex min-h-[244px] flex-col justify-between surface-brand rounded-(--radius-xl) p-6 text-white">
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/75">
          <span className={`h-2 w-2 rounded-full ${doctor.available ? "bg-[#6ee7a0]" : "bg-white/50"}`} />
          {doctor.available ? "Available" : "Unavailable"}
        </p>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#fff] text-[20px] font-bold text-[var(--action)]">
            {doctor.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[22px] font-bold leading-tight">{doctor.available ? "Patients' calls will ring here" : "You're off calls"}</p>
            <p className="text-[13px] text-white/75">
              {doctor.name} · {doctor.pmdc}
            </p>
          </div>
        </div>
        <div />
      </section>
    );
  }

  const facts = [
    complaintLabel(myCall),
    myCall.lang === "ur" ? "Urdu" : "English",
    ...(myCall.callStartedAt ? [`${fmtDuration(now - myCall.callStartedAt)} on call`] : []),
  ];
  return (
    <section className="flex min-h-[244px] flex-col justify-between surface-brand rounded-(--radius-xl) p-6 text-white">
      <p className="text-[13px] font-semibold text-white/75">{myCall.status === "ringing" ? "Ringing you now" : "On a call with"}</p>
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#fff] text-[20px] font-bold text-[var(--action)]">
          {initialsOf(myCall.member.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[22px] font-bold leading-tight">{myCall.member.name}</p>
          <p className="text-[13px] text-white/75">
            {myCall.member.age} · {myCall.member.gender === "M" ? "Male" : "Female"} · {myCall.member.mrn}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {facts.map((x) => (
              <span key={x} className="rounded-(--radius-pill) bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold">
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/portal/consultations/$id"
          params={{ id: myCall.id }}
          className="inline-flex items-center gap-2 rounded-(--radius-md) bg-[#fff] px-4 py-2.5 text-[13.5px] font-bold !text-[var(--action)] hover:bg-[#eef4fc]"
        >
          <PhoneIncoming size={16} /> {myCall.status === "ringing" ? "Answer" : "Return to call"}
        </Link>
      </div>
    </section>
  );
}

function Chip({ tone, children }: { tone: "amber" | "violet" | "neutral"; children: ReactNode }) {
  const cls =
    tone === "amber"
      ? "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
      : tone === "violet"
        ? "bg-[var(--tint)] text-[var(--link)]"
        : "bg-[var(--sunken)] text-[var(--mute)]";
  return <span className={`rounded-(--radius-pill) px-3 py-1.5 text-[12.5px] font-semibold ${cls}`}>{children}</span>;
}

function Attention({ title, note, to }: { title: string; note: string; to: string }) {
  const link = { to: "/portal/consultations/$id" as const, params: { id: to } };
  return (
    <li>
      <Link {...link} className="group flex items-start gap-3 rounded-(--radius-md) px-2 py-2 hover:bg-[var(--sunken)]">
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-[2px] bg-[var(--green)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-[var(--ink)]">{title}</span>
          <span className="block truncate text-[12px] text-[var(--mute)]">{note}</span>
        </span>
        <ArrowRight size={14} className="mt-1 text-[var(--faint)] group-hover:text-[var(--link)]" />
      </Link>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-6 text-center text-[13px] text-[var(--mute)]">{children}</p>;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
