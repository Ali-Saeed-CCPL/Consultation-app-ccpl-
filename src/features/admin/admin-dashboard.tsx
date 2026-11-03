/* Admin overview — the management view of the clinic. A light-green hero (the
   patient home's brand band, in the admin colour) with the greeting; today's
   figures in a row under it; then doctor performance — every active doctor ranked, with a
   filters, ranking and trend charts (doctor-performance.tsx); then each doctor's
   day and the latest admin activity. No live queue or call handling — that's
   the doctors' side; consultation detail lives in Reports and the records list. */

import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowRight, BarChart3, Clock, FileCheck2, Hourglass, Siren, Stethoscope, UserPlus, Users } from "lucide-react";
import LiveClock from "@/components/common/live-clock";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Section from "@/components/ui/section";
import Tag from "@/components/ui/tag";
import DoctorPerformance from "@/features/admin/doctor-performance";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { CLINIC_HOURS, fmtDateTime, fmtDuration, greetingKey } from "@/lib/clinic";
import { useNow } from "@/lib/use-now";
import { usePlatform } from "@/store/consult-store";

const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const now = useNow(30_000);
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const audit = usePlatform((s) => s.audit);

  const today = dayOf(now);
  const month = today.slice(0, 7);
  const todays = consultations.filter((c) => dayOf(c.createdAt) === today);
  const seenToday = todays.filter((c) => c.callStartedAt);
  const endedToday = seenToday.filter((c) => c.callEndedAt);
  const releasedToday = todays.filter((c) => c.status === "approved" || c.status === "closed");
  const callMs = endedToday.reduce((s, c) => s + (c.callEndedAt! - c.callStartedAt!), 0);
  const waits = seenToday.map((c) => c.callStartedAt! - (c.consentAt ?? c.createdAt));
  const monthSeen = consultations.filter((c) => c.callStartedAt && dayOf(c.createdAt).startsWith(month)).length;

  const active = doctors.filter((d) => d.active !== false);
  const onCall = (id: string) => consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === id);
  const roster = active
    .map((d) => ({ d, s: doctorStats(todays, d.id), busy: onCall(d.id) }))
    .sort((a, b) => b.s.received - a.s.received);
  const busyNow = roster.filter((r) => r.busy).length;
  const availableNow = active.filter((d) => d.available).length;
  const adminActivity = audit.filter((e) => e.actorRole === "admin").slice(0, 8);

  return (
    <div className="grid gap-5 p-6">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="surface-admin rounded-(--radius-xl) px-6 py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium opacity-75">
              {new Date(now).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
              {CLINIC_HOURS.days}, 9 AM–6 PM
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[28px]">Good {greetingKey(now)}, Admin</h1>
            <p className="mt-1.5 text-[13.5px] opacity-80">
              {availableNow} of {active.length} doctors available · {busyNow} on a call · {seenToday.length} consultation{seenToday.length === 1 ? "" : "s"} today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveClock />
            <Button onClick={() => navigate({ to: "/admin/reports" })}>
              <BarChart3 size={15} /> Reports
            </Button>
            <Button variant="primary" onClick={() => navigate({ to: "/admin/doctors" })}>
              <UserPlus size={15} /> Manage doctors
            </Button>
          </div>
        </div>
      </section>

      {/* ── Today's figures, under the hero ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
          <HeroStat icon={<Stethoscope size={16} />} label="Active doctors" value={String(active.length)} note={`${availableNow} available now`} />
          <HeroStat icon={<Users size={16} />} label="Consultations today" value={String(seenToday.length)} note={`${monthSeen} this month`} />
          <HeroStat
            icon={<FileCheck2 size={16} />}
            label="Prescriptions today"
            value={String(releasedToday.length)}
            note={seenToday.length ? `${Math.round((releasedToday.length / seenToday.length) * 100)}% of consultations` : "None yet today"}
          />
          <HeroStat icon={<Clock size={16} />} label="Call time today" value={fmtMinutes(callMs)} note={endedToday.length ? `${fmtDuration(callMs / endedToday.length)} avg call` : "No calls ended yet"} />
          <HeroStat icon={<Hourglass size={16} />} label="Avg wait today" value={fmtMinutes(waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0)} note="Consent → doctor" />
          <HeroStat icon={<Siren size={16} />} label="Sent to ER today" value={String(todays.filter((c) => c.status === "emergency").length)} note="Red flags at intake" danger />
      </div>

      {/* ── Doctor performance ─────────────────────────────────────────── */}
      <DoctorPerformance consultations={consultations} doctors={active} now={now} />

      {/* ── Today, per doctor · admin activity ─────────────────────────── */}
      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Section
          className="flex flex-col"
          title="Doctors today"
          sub={`${active.length} active · ${doctors.length - active.length} inactive · ${busyNow} on a call`}
          action={
            <Link to="/admin/doctors" className="text-[13px] font-semibold">
              All doctors →
            </Link>
          }
          bodyClassName="!px-0 !pb-0 flex-1"
        >
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Doctor", "Status", "Patients", "Call time", "Avg call", "Avg wait", "Prescriptions"].map((h, i) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap border-b border-[var(--line)] bg-[var(--sunken)] px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--mute)] ${i >= 2 ? "text-end" : "text-start"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map(({ d, s, busy }) => (
                  <tr
                    key={d.id}
                    onClick={() => navigate({ to: "/admin/doctors/$id", params: { id: d.id } })}
                    className="cursor-pointer border-t border-[var(--hair)] first:border-t-0 hover:bg-[var(--sunken)]"
                  >
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar initials={d.initials} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[var(--ink)]">{d.name}</span>
                          <span className="block font-mono text-[11.5px] text-[var(--mute)]">{d.pmdc}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3">{busy ? <Tag tone="warn">On a call</Tag> : d.available ? <Tag tone="ok">Available</Tag> : <Tag tone="neutral">Unavailable</Tag>}</td>
                    <td className="px-5 py-3 text-end font-mono font-semibold text-[var(--ink)]">{s.received}</td>
                    <td className="px-5 py-3 text-end text-[var(--body)]">{fmtMinutes(s.callMs)}</td>
                    <td className="px-5 py-3 text-end font-mono text-[var(--body)]">{s.avgCallMs ? fmtDuration(s.avgCallMs) : "—"}</td>
                    <td className="px-5 py-3 text-end text-[var(--body)]">{fmtMinutes(s.avgWaitMs)}</td>
                    <td className="px-5 py-3 text-end font-mono text-[var(--body)]">{s.released}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {roster.length === 0 ? <p className="px-5 py-8 text-center text-[13px] text-[var(--mute)]">No active doctors. Add one from Doctors.</p> : null}
          </div>
        </Section>

        <Section
          className="flex flex-col"
          bodyClassName="flex flex-1 flex-col"
          title="Admin activity"
          sub="Latest changes made in the admin portal"
          action={
            <Link to="/admin/audit" className="text-[13px] font-semibold">
              Audit log →
            </Link>
          }
        >
          {adminActivity.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-6 text-center">
              <Activity size={20} className="text-[var(--faint)]" />
              <p className="text-[13px] text-[var(--mute)]">No admin changes yet. Adding, editing or deactivating a doctor shows up here.</p>
            </div>
          ) : (
            <ul className="grid flex-1 content-start gap-1">
              {adminActivity.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-(--radius-md) px-2 py-2">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-[2px] bg-[var(--action)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-[var(--ink)]">{e.action}</span>
                    <span className="block truncate text-[12px] text-[var(--mute)]">
                      {e.detail ?? "—"} · {fmtDateTime(e.at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/reports"
            className="mt-3 flex items-center justify-between rounded-(--radius-md) bg-[var(--sunken)] px-3.5 py-3 text-[13px] font-semibold !text-[var(--ink)] hover:bg-[var(--tint)]"
          >
            Full report with every doctor's figures <ArrowRight size={15} className="text-[var(--link)]" />
          </Link>
        </Section>
      </div>
    </div>
  );
}

/** One of today's figures — the row of tiles under the hero. */
function HeroStat({ icon, label, value, note, danger }: { icon: ReactNode; label: string; value: string; note: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3.5 shadow-(--shadow-sm)">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--mute)]">
        <span className={danger ? "text-[var(--red)]" : "text-[var(--green)]"}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-[26px] font-bold leading-none tracking-tight text-[var(--ink)]">{value}</div>
      <div className="mt-1.5 truncate text-[12px] text-[var(--mute)]">{note}</div>
    </div>
  );
}
