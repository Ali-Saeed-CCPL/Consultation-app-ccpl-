/* Admin · Doctors — the GP roster with each doctor's figures, and Add doctor.
   Filters above the table: search, status, sign-in, the period the figures
   cover (the date-range picker with quick ranges), and the sort order. Each doctor carries their chart colour. */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import DateRangePicker from "@/components/ui/date-range-picker";
import { FilterBar, FilterField, SearchFilter, SegmentedFilter, SelectFilter } from "@/components/ui/filter-bar";
import Tag from "@/components/ui/tag";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import DoctorForm from "@/features/admin/doctor-form";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { CLINIC_HOURS, fmtDateTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { DEMO_ACCOUNTS } from "@/data/seed";
import type { Doctor } from "@/lib/types";

type StatusFilter = "all" | "available" | "oncall" | "unavailable" | "inactive";
const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All statuses" },
  { key: "available", label: "Available" },
  { key: "oncall", label: "On a call" },
  { key: "unavailable", label: "Unavailable" },
  { key: "inactive", label: "Inactive" },
];
const stateOf = (d: Doctor, busy: boolean): Exclude<StatusFilter, "all"> =>
  d.active === false ? "inactive" : busy ? "oncall" : d.available ? "available" : "unavailable";

const DAY = 86_400_000;
/** Midnight in Pakistan (UTC+5, no DST) of a YYYY-MM-DD clinic day. */
const dayStart = (isoDay: string) => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - 5 * 3_600_000;
};

type Sort = "received" | "callTime" | "released" | "last" | "name";
const SORT_OPTIONS: { key: Sort; label: string }[] = [
  { key: "received", label: "Patients received" },
  { key: "callTime", label: "Call time" },
  { key: "released", label: "Prescriptions" },
  { key: "last", label: "Last consult" },
  { key: "name", label: "Name" },
];

export default function DoctorsScreen() {
  const navigate = useNavigate();
  const doctors = usePlatform((s) => s.doctors);
  const consultations = usePlatform((s) => s.consultations);
  const logins = usePlatform((s) => s.logins);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [signIn, setSignIn] = useState<"all" | "yes" | "no">("all");
  // Empty range = all time.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<Sort>("received");
  const [adding, setAdding] = useState(false);
  const active = Boolean(q || status !== "all" || signIn !== "all" || from !== "" || sort !== "received");
  const onCall = (d: Doctor) => consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === d.id);
  const colour = useMemo(() => new Map(doctors.map((d, i) => [d.id, `var(--series-${(i % 8) + 1})`])), [doctors]);

  // The figures cover the chosen period.
  const since = from ? dayStart(from) : 0;
  const until = to ? dayStart(to) + DAY : Infinity;
  const inPeriod = consultations.filter((c) => c.createdAt >= since && c.createdAt < until);
  const [ty, tm, td] = new Date().toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz }).split("-").map(Number);
  const needle = q.trim().toLowerCase();
  const rows = doctors
    .map((d) => ({ d, s: doctorStats(inPeriod, d.id), state: stateOf(d, onCall(d)), login: signInOf(d.id, logins) }))
    .filter(({ d }) => !needle || d.name.toLowerCase().includes(needle) || d.pmdc.toLowerCase().includes(needle))
    .filter(({ state }) => status === "all" || state === status)
    .filter(({ login }) => signIn === "all" || (signIn === "yes" ? Boolean(login) : !login))
    .sort((a, b) =>
      sort === "name"
        ? a.d.name.localeCompare(b.d.name)
        : sort === "callTime"
          ? b.s.callMs - a.s.callMs
          : sort === "released"
            ? b.s.released - a.s.released
            : sort === "last"
              ? (b.s.lastAt ?? 0) - (a.s.lastAt ?? 0)
              : b.s.received - a.s.received,
    );

  return (
    <>
      <PageHero
        crumb={[{ label: "Doctors" }]}
        title="Doctors"
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add doctor
          </Button>
        }
      />
      <main className="viz-root p-6">
        <FilterBar
          active={active}
          onReset={() => {
            setQ("");
            setStatus("all");
            setSignIn("all");
            setFrom("");
            setTo("");
            setSort("received");
          }}
        >
          <FilterField label="Search">
            <SearchFilter value={q} onChange={setQ} placeholder="Name or PMDC…" />
          </FilterField>
          <FilterField label="Status">
            <SelectFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </FilterField>
          <FilterField label="Sign-in">
            <SegmentedFilter
              value={signIn}
              onChange={setSignIn}
              options={[
                { key: "all", label: "All" },
                { key: "yes", label: "Has sign-in" },
                { key: "no", label: "None" },
              ]}
            />
          </FilterField>
          <FilterField label="Figures for">
            <DateRangePicker
              start={from}
              end={to}
              today={new Date(ty, tm - 1, td)}
              align="start"
              onChange={(s2, e2) => {
                setFrom(s2);
                setTo(e2);
              }}
            />
          </FilterField>
          <FilterField label="Sort by">
            <SelectFilter value={sort} onChange={setSort} options={SORT_OPTIONS} />
          </FilterField>
          <p className="self-end pb-1.5 text-[13px] text-[var(--mute)]">
            <span className="font-semibold text-[var(--ink)]">{doctors.filter((d) => d.active !== false).length}</span> active ·{" "}
            <span className="font-semibold text-[var(--ink)]">{doctors.filter((d) => d.available).length}</span> available now
          </p>
        </FilterBar>
        <Table
          head={["Doctor", "Sign-in", "Status", "Patients received", "Unique patients", "Call time", "Avg call", "Prescriptions", "Last consult"]}
          empty={rows.length ? null : <EmptyRow>No doctors match these filters.</EmptyRow>}
        >
          {rows.map(({ d, s, login }) => (
            <Row key={d.id} onClick={() => navigate({ to: "/admin/doctors/$id", params: { id: d.id } })}>
              <Cell>
                <span className="flex items-center gap-3">
                  <span className="h-8 w-1 flex-shrink-0 rounded-full" style={{ background: colour.get(d.id) }} />
                  <Avatar initials={d.initials} size={34} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-[var(--ink)]">{d.name}</span>
                    <span className="block font-mono text-[11.5px] text-[var(--mute)]">{d.pmdc}</span>
                  </span>
                </span>
              </Cell>
              <Cell mono>{login ?? <span className="font-sans text-[var(--faint)]">None</span>}</Cell>
              <Cell>
                <DoctorStatus doctor={d} onCall={onCall(d)} />
              </Cell>
              <Cell strong>{s.received}</Cell>
              <Cell>{s.patients}</Cell>
              <Cell>{fmtMinutes(s.callMs)}</Cell>
              <Cell>{fmtMinutes(s.avgCallMs)}</Cell>
              <Cell>{s.released}</Cell>
              <Cell mono>{s.lastAt ? fmtDateTime(s.lastAt) : "—"}</Cell>
            </Row>
          ))}
        </Table>
      </main>
      <DoctorForm open={adding} onClose={() => setAdding(false)} onSaved={(id) => id && navigate({ to: "/admin/doctors/$id", params: { id } })} />
    </>
  );
}

/** The doctor's username: the one the admin set, else a built-in demo account. */
export function signInOf(doctorId: string, logins: { doctorId: string; username: string }[]) {
  return logins.find((l) => l.doctorId === doctorId)?.username ?? DEMO_ACCOUNTS.find((a) => "doctorId" in a && a.doctorId === doctorId)?.username;
}

export function DoctorStatus({ doctor, onCall }: { doctor: Doctor; onCall: boolean }) {
  if (doctor.active === false) return <Tag tone="neutral">Inactive</Tag>;
  if (onCall) return <Tag tone="warn">On a call</Tag>;
  return doctor.available ? <Tag tone="ok">Available</Tag> : <Tag tone="neutral">Unavailable</Tag>;
}
