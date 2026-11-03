/* Admin overview — the management view of the clinic: today's figures, each
   doctor's day (status, patients received, call time), and the latest admin
   activity. No live queue or call handling — that's the doctors'
   side; consultation detail lives in Reports and the records list. */

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, UserPlus } from "lucide-react";
import KpiTile from "@/components/common/kpi-tile";
import LiveClock from "@/components/common/live-clock";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Section from "@/components/ui/section";
import Tag from "@/components/ui/tag";
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
  const adminActivity = audit.filter((e) => e.actorRole === "admin").slice(0, 6);

  return (
    <div className="p-6">
      <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-end justify-between gap-3 hero-band border-b border-[var(--line)] px-6 py-5">
        <div>
          <p className="text-[12.5px] text-[var(--mute)]">
            {new Date(now).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="page-title mt-0.5">Good {greetingKey(now)}, Admin</h1>
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

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile index={0} accent="teal" label="Active doctors" value={String(active.length)} detail={`${active.filter((d) => d.available).length} available now`} />
        <KpiTile index={1} accent="indigo" label="Consultations today" value={String(seenToday.length)} detail={`${monthSeen} this month`} />
        <KpiTile index={2} accent="green" label="Prescriptions today" value={String(releasedToday.length)} detail={seenToday.length ? `${Math.round((releasedToday.length / seenToday.length) * 100)}% of consultations` : "—"} />
        <KpiTile index={3} accent="violet" label="Call time today" value={fmtMinutes(callMs)} detail={endedToday.length ? `${fmtDuration(callMs / endedToday.length)} avg call` : "—"} />
        <KpiTile index={4} accent="amber" label="Avg wait today" value={fmtMinutes(waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0)} detail="Consent → doctor" />
        <KpiTile index={5} accent="red" label="Sent to ER today" value={String(todays.filter((c) => c.status === "emergency").length)} detail="Red flags at intake" />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Section
          title="Doctors today"
          sub={`${active.length} active · ${doctors.length - active.length} inactive`}
          action={
            <Link to="/admin/doctors" className="text-[13px] font-semibold">
              All doctors →
            </Link>
          }
          bodyClassName="!px-0 !pb-0"
        >
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Doctor", "Status", "Patients received", "Call time", "Avg call", "Prescriptions"].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-[var(--line)] bg-[var(--sunken)] px-5 py-2.5 text-start text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--mute)]">
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
                        <span>
                          <span className="block font-semibold text-[var(--ink)]">{d.name}</span>
                          <span className="block font-mono text-[11.5px] text-[var(--mute)]">{d.pmdc}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3">{busy ? <Tag tone="warn">On a call</Tag> : d.available ? <Tag tone="ok">Available</Tag> : <Tag tone="neutral">Unavailable</Tag>}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--ink)]">{s.received}</td>
                    <td className="px-5 py-3 text-[var(--body)]">{fmtMinutes(s.callMs)}</td>
                    <td className="px-5 py-3 text-[var(--body)]">{s.avgCallMs ? fmtDuration(s.avgCallMs) : "—"}</td>
                    <td className="px-5 py-3 text-[var(--body)]">{s.released}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {roster.length === 0 ? <p className="px-5 py-8 text-center text-[13px] text-[var(--mute)]">No active doctors. Add one from Doctors.</p> : null}
          </div>
        </Section>

        <Section
          title="Admin activity"
          action={
            <Link to="/admin/audit" className="text-[13px] font-semibold">
              Audit log →
            </Link>
          }
        >
          {adminActivity.length === 0 ? (
            <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-6 text-center text-[13px] text-[var(--mute)]">No admin changes yet.</p>
          ) : (
            <ul className="grid gap-1">
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
