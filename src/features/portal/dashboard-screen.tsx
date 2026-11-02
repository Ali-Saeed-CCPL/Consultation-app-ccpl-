/* Portal dashboard — the ERP wallboard's layout for the clinic: a KPI row,
   the consultation pipeline (bars + side stats, like "Enrollment pipeline"),
   then live queue, needs attention and doctors on duty. Supplies its own
   header, as the ERP dashboard does. */

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, PhoneIncoming } from "lucide-react";
import KpiTile from "@/components/common/kpi-tile";
import LiveCalls from "@/features/portal/live-calls";
import ScheduledCalls from "@/features/portal/scheduled-calls";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Section from "@/components/ui/section";
import StatusTag from "@/components/ui/status-tag";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDuration, fmtTime, greetingKey, isOthersActive, minutesAgo } from "@/lib/clinic";
import LiveClock from "@/components/common/live-clock";
import { usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import type { Consultation } from "@/lib/types";

const complaintLabel = (c: Consultation) => complaintText(c.symptoms) || "—";

export default function DashboardScreen() {
  const doctor = useCurrentDoctor()!;
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const { takeNext, setAvailability } = usePlatform.getState();
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
  const released = by("approved", "closed");
  const callbacks = by("callback");
  const consulted = consultations.filter((c) => c.callStartedAt);
  const avgWait = avg(consulted.map((c) => c.callStartedAt! - (c.consentAt ?? c.createdAt)));
  const ended = consultations.filter((c) => c.callStartedAt && c.callEndedAt);
  const avgCall = avg(ended.map((c) => c.callEndedAt! - c.callStartedAt!));
  const approvalTurnaround = avg(
    consultations.filter((c) => c.approvedAt && c.callEndedAt).map((c) => c.approvedAt! - c.callEndedAt!),
  );

  const toApprove = by("drafting");
  const myDrafts = by("drafting").filter((c) => c.prescriberId === doctor.id);
  const iAmBusy = consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);

  const funnel = [
    { label: "Signed in & checked", n: consultations.length },
    { label: "Eligible", n: consultations.filter((c) => c.status !== "ineligible").length },
    { label: "Consented", n: consultations.filter((c) => c.consentAt).length },
    { label: "Consulted", n: consulted.length },
    { label: "AI drafted", n: consultations.filter((c) => c.callEndedAt).length },
    { label: "Released", n: released.length },
  ];

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] text-[var(--mute)]">
            {new Date(now).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {CLINIC_HOURS.days}, 9 AM–6 PM
          </p>
          <h1 className="mt-0.5 text-[24px] font-semibold tracking-tight text-[var(--teal-deep)]">
            Good {greetingKey(now)}, {doctor.name.split(" ").slice(0, 2).join(" ")}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--body)]">
            {waiting.length ? `${waiting.length} waiting` : "No one waiting"} · {myDrafts.length} AI-drafted prescription
            {myDrafts.length === 1 ? "" : "s"} for you to approve
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveClock />
          <Button
            size="sm"
            variant="primary"
            disabled={!doctor.available || iAmBusy || !waiting.some((c) => c.status === "queued")}
            onClick={() => takeNext(doctor.id)}
          >
            <PhoneIncoming size={14} /> Take next patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile index={0} accent="amber" label="Waiting now" value={String(waiting.length)} detail={waiting.length ? `Longest ${minutesAgo(waiting[0].createdAt, now).replace(" ago", "")}` : "Queue is clear"} />
        <KpiTile index={1} accent="green" label="In consult" value={String(inCall.length)} detail={`${doctors.filter((d) => d.available).length} of ${doctors.length} GPs available`} />
        <KpiTile index={2} accent="violet" label="To approve" value={String(toApprove.length)} detail={`${myDrafts.length} AI draft${myDrafts.length === 1 ? "" : "s"} waiting on you`} />
        <KpiTile index={3} accent="teal" label="Prescriptions released" value={String(released.length)} detail={approvalTurnaround ? `${fmtMinutes(approvalTurnaround)} call end → approval` : "—"} />
        <KpiTile index={4} accent="indigo" label="Avg wait to doctor" value={avgWait ? fmtMinutes(avgWait) : "—"} detail={avgCall ? `${fmtDuration(avgCall)} avg call` : "—"} />
        <KpiTile index={5} accent="red" label="Sent to ER" value={String(by("emergency").length)} detail={`${by("ineligible").length} not eligible → support`} />
      </div>

      <Section
        className="mt-5"
        title="Consultation pipeline"
        sub="Every consultation started today, by the furthest step it reached"
        action={
          <Link to="/portal/consultations" search={{ view: "all" }} className="text-[13px] font-semibold">
            Open consultations →
          </Link>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="grid gap-2.5">
            {funnel.map((row, i) => {
              const pct = funnel[0].n ? (row.n / funnel[0].n) * 100 : 0;
              const prev = i ? funnel[i - 1].n : 0;
              const conv = i && prev ? (row.n / prev) * 100 : null;
              return (
                <div key={row.label} className="grid grid-cols-[150px_1fr_44px_56px] items-center gap-3 text-[13.5px]">
                  <span className="text-[var(--body)]">{row.label}</span>
                  <span className="relative h-6 overflow-hidden rounded-(--radius-sm) bg-[var(--sunken)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-(--radius-sm) bg-[var(--sky-300)] transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-y-0 w-[2px] bg-[var(--link)]" style={{ left: `calc(${pct}% - 2px)` }} />
                  </span>
                  <span className="text-right font-mono text-[13px] text-[var(--ink)]">{row.n}</span>
                  <span className={`text-right font-mono text-[12px] ${conv !== null && conv < 85 ? "text-[var(--red)]" : "text-[var(--mute)]"}`}>
                    {conv === null ? "—" : `${conv.toFixed(0)}%`}
                  </span>
                </div>
              );
            })}
          </div>
          <LiveCalls doctor={doctor} />
        </div>
      </Section>

      <ScheduledCalls doctor={doctor} />

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
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
            <Empty>No one is waiting. New patients ring the first free GP.</Empty>
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

        <Section title="Needs attention" sub={`${myDrafts.length} AI draft${myDrafts.length === 1 ? "" : "s"} to check & approve`}>
          {myDrafts.length === 0 ? (
            <Empty>Nothing waiting on you.</Empty>
          ) : (
            <ul className="grid gap-2">
              {myDrafts.map((c) => (
                <Attention
                  key={c.id}
                  tone="warn"
                  to={c.id}
                  title={`Check & approve — ${c.member.name}`}
                  note={`${c.notes.diagnosis || "AI draft"} · call ended ${c.callEndedAt ? minutesAgo(c.callEndedAt, now) : ""}`}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Doctors on duty" sub={`${CLINIC_HOURS.days} · 9 AM–6 PM PKT`}>
          <ul className="divide-y divide-[var(--hair)]">
            {doctors.map((d) => {
              const current = consultations.find((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === d.id);
              return (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <Avatar initials={d.initials} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">
                      {d.name} {d.id === doctor.id ? <span className="font-normal text-[var(--mute)]">(you)</span> : null}
                    </div>
                    <div className="truncate text-[12px] text-[var(--mute)]">
                      {current ? `${current.status === "ringing" ? "Ringing" : "With"} ${current.member.name}` : d.available ? "Free" : "Off the rota"}
                    </div>
                  </div>
                  {d.id === doctor.id ? (
                    <Button size="sm" onClick={() => setAvailability(d.id, !d.available)}>
                      {d.available ? "Go unavailable" : "Go available"}
                    </Button>
                  ) : (
                    <span
                      className={`rounded-(--radius-pill) px-2 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
                        current ? "bg-[var(--amber-tint)] text-[var(--amber-ink)]" : d.available ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--sunken)] text-[var(--mute)]"
                      }`}
                    >
                      {current ? "busy" : d.available ? "free" : "off"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {callbacks.length ? (
            <div className="mt-3 rounded-(--radius-md) bg-[var(--sunken)] px-3 py-2.5 text-[12.5px] text-[var(--body)]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <Clock size={13} /> Call backs
              </div>
              {callbacks.map((c) => (
                <div key={c.id} className="flex justify-between">
                  <span>{c.member.name}</span>
                  <span className="font-mono">{c.callbackAt ? fmtTime(c.callbackAt) : "—"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

function Attention({ tone, title, note, to }: { tone: "warn" | "err"; title: string; note: string; to: string }) {
  const link = { to: "/portal/consultations/$id" as const, params: { id: to } };
  return (
    <li>
      <Link {...link} className="group flex items-start gap-3 rounded-(--radius-md) px-2 py-2 hover:bg-[var(--sunken)]">
        <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-[2px] ${tone === "err" ? "bg-[var(--red)]" : "bg-[var(--amber)]"}`} />
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
const fmtMinutes = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} min`;
