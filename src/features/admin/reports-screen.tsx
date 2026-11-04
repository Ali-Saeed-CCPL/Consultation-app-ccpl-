/* Admin · Reports — a custom report built from filters, in the same filter bar as
   the other admin pages: period (with quick ranges), doctors, complaints,
   language and outcome narrow the consultations; "Group by" sets the time
   breakdown (day, week or month); "Contents" picks the sections. The screen shows
   totals, a per-doctor breakdown and, side by side, splits by complaint and over
   time (paged, so nothing scrolls on and on). Downloads as a formatted Excel
   workbook or a PDF (features/admin/report-export.ts) with exactly the same
   filters and sections as the screen. */

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import KpiTile from "@/components/common/kpi-tile";
import PageHero from "@/components/layout/page-hero";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import DateRangePicker, { presetLabel, quickRanges } from "@/components/ui/date-range-picker";
import { FilterBar, FilterField, MultiSelectFilter, SegmentedFilter } from "@/components/ui/filter-bar";
import Pager, { usePage } from "@/components/ui/pager";
import Section from "@/components/ui/section";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { OUTCOMES, outcomeOf, type Outcome } from "@/features/admin/outcome";
import { COMPLAINTS } from "@/data/seed";
import { complaintKeys } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDateTime, fmtDuration } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { downloadReportPdf, downloadReportXlsx, type ReportData, type ReportSection } from "@/features/admin/report-export";

const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

type Group = "day" | "week" | "month";
/** The bucket a clinic day falls in: itself, the Monday of its week, or its month. */
function bucketOf(iso: string, group: Group): string {
  if (group === "day") return iso;
  if (group === "month") return iso.slice(0, 7);
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString("en-CA");
}
function bucketLabel(key: string, group: Group): string {
  if (group === "day") return dayLabel(key);
  if (group === "month") return new Date(`${key}-01T12:00:00`).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  const end = new Date(`${key}T12:00:00`);
  end.setDate(end.getDate() + 6);
  return `Week of ${shortDay(key)} – ${shortDay(end.toLocaleDateString("en-CA"))}`;
}

const SECTIONS: { key: ReportSection; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "doctors", label: "By doctor" },
  { key: "complaints", label: "By complaint" },
  { key: "time", label: "Over time" },
];
const OUTCOME_KEYS = Object.keys(OUTCOMES) as Outcome[];
const COMPLAINT_KEYS = COMPLAINTS.map((c) => c.key);

export default function ReportsScreen() {
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  const last30 = quickRanges(today).find((q) => q.label === "Last 30 Days")!;

  const [from, setFrom] = useState(last30.start);
  const [to, setTo] = useState(last30.end);
  const [doctorIds, setDoctorIds] = useState<string[]>(() => doctors.map((d) => d.id));
  const [complaints, setComplaints] = useState<string[]>(COMPLAINT_KEYS);
  const [lang, setLang] = useState<"all" | "en" | "ur">("all");
  const [outcomes, setOutcomes] = useState<string[]>(OUTCOME_KEYS);
  const [group, setGroup] = useState<Group>("day");
  const [sections, setSections] = useState<string[]>(SECTIONS.map((s) => s.key));
  const show = (k: ReportSection) => sections.includes(k);

  const allDoctors = doctorIds.length === doctors.length;
  const allComplaints = complaints.length === COMPLAINT_KEYS.length;
  const allOutcomes = outcomes.length === OUTCOME_KEYS.length;
  const active =
    from !== last30.start || to !== last30.end || !allDoctors || !allComplaints || lang !== "all" || !allOutcomes || group !== "day" || sections.length !== SECTIONS.length;
  const reset = () => {
    setFrom(last30.start);
    setTo(last30.end);
    setDoctorIds(doctors.map((d) => d.id));
    setComplaints(COMPLAINT_KEYS);
    setLang("all");
    setOutcomes(OUTCOME_KEYS);
    setGroup("day");
    setSections(SECTIONS.map((s) => s.key));
  };

  // ── The consultations in the report ────────────────────────────────────
  const rows = consultations
    .filter((c) => !from || (dayOf(c.createdAt) >= from && dayOf(c.createdAt) <= to))
    // A doctor filter keeps only calls those doctors took; unassigned ones drop out.
    .filter((c) => allDoctors || (c.prescriberId !== undefined && doctorIds.includes(c.prescriberId)))
    .filter((c) => allComplaints || complaintKeys(c.symptoms?.complaint).some((k) => complaints.includes(k)))
    .filter((c) => lang === "all" || c.lang === lang)
    .filter((c) => allOutcomes || outcomes.includes(outcomeOf(c)));
  const seen = rows.filter((c) => c.callStartedAt);
  const ended = seen.filter((c) => c.callEndedAt);
  const callMs = ended.reduce((s, c) => s + (c.callEndedAt! - c.callStartedAt!), 0);
  const waits = seen.map((c) => c.callStartedAt! - (c.consentAt ?? c.createdAt));
  const released = rows.filter((c) => c.status === "approved" || c.status === "closed");
  const er = rows.filter((c) => c.status === "emergency").length;
  const ineligible = rows.filter((c) => c.status === "ineligible").length;
  const avgWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;

  const perDoctor = doctors
    .filter((d) => allDoctors || doctorIds.includes(d.id))
    .map((d) => ({ d, s: doctorStats(rows, d.id) }))
    .filter(({ d, s }) => s.received > 0 || d.active !== false)
    .sort((a, b) => b.s.received - a.s.received);

  const complaintCounts = new Map<string, number>();
  for (const c of seen) for (const k of complaintKeys(c.symptoms?.complaint)) if (allComplaints || complaints.includes(k)) complaintCounts.set(k, (complaintCounts.get(k) ?? 0) + 1);
  const byComplaint = [...complaintCounts].map(([k, n]) => ({ label: COMPLAINTS.find((x) => x.key === k)?.en ?? k, n })).sort((a, b) => b.n - a.n);
  const topComplaint = Math.max(1, ...byComplaint.map((c) => c.n));

  const buckets = new Map<string, { started: number; seen: number; released: number }>();
  for (const c of rows) {
    const key = bucketOf(dayOf(c.createdAt), group);
    const b = buckets.get(key) ?? { started: 0, seen: 0, released: 0 };
    b.started++;
    if (c.callStartedAt) b.seen++;
    if (c.status === "approved" || c.status === "closed") b.released++;
    buckets.set(key, b);
  }
  const overTime = [...buckets].sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({ label: bucketLabel(k, group), ...v }));
  const topBucket = Math.max(1, ...overTime.map((b) => b.started));
  const timePage = usePage(overTime, 8);

  // ── What the report says it covers ─────────────────────────────────────
  const period = from ? (presetLabel(from, to, today) ? `${presetLabel(from, to, today)} (${dayLabel(from)} – ${dayLabel(to)})` : from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`) : "All time";
  const filters = [
    !allDoctors && `Doctors: ${doctors.filter((d) => doctorIds.includes(d.id)).map((d) => d.name).join(", ")}`,
    !allComplaints && `Complaints: ${COMPLAINTS.filter((c) => complaints.includes(c.key)).map((c) => c.en).join(", ")}`,
    lang !== "all" && `Language: ${lang === "ur" ? "Urdu" : "English"}`,
    !allOutcomes && `Outcome: ${OUTCOME_KEYS.filter((k) => outcomes.includes(k)).map((k) => OUTCOMES[k].label).join(", ")}`,
  ].filter(Boolean) as string[];
  const fileBase = `consultation-report-${from ? (from === to ? from : `${from}_to_${to}`) : "all-time"}${filters.length ? "-filtered" : ""}`;
  const groupWord = group === "day" ? "Day" : group === "week" ? "Week" : "Month";

  const min = (ms: number, dp = 0) => +(ms / 60_000).toFixed(dp);
  const report: ReportData = {
    period,
    filters,
    sections: sections as ReportSection[],
    generated: fmtDateTime(Date.now()),
    fileBase,
    totals: [
      { label: "Consultations started", value: rows.length },
      { label: "Seen by a doctor", value: seen.length },
      { label: "Unique patients", value: new Set(seen.map((c) => c.member.mrn)).size },
      { label: "Prescriptions released", value: released.length },
      { label: "Total call time (min)", value: min(callMs) },
      { label: "Average call (min)", value: ended.length ? min(callMs / ended.length, 1) : 0 },
      { label: "Average wait (min)", value: min(avgWait, 1) },
      { label: "Sent to ER / not eligible", value: `${er} / ${ineligible}` },
    ],
    doctors: perDoctor.map(({ d, s }) => ({
      name: d.name,
      pmdc: d.pmdc,
      received: s.received,
      patients: s.patients,
      callMin: min(s.callMs),
      avgCallMin: min(s.avgCallMs, 1),
      avgWaitMin: min(s.avgWaitMs, 1),
      released: s.released,
      share: seen.length ? s.received / seen.length : 0,
    })),
    complaints: byComplaint.map((c) => ({ label: c.label, n: c.n, share: seen.length ? c.n / seen.length : 0 })),
    timeLabel: groupWord,
    time: overTime,
  };
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const run = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      await (kind === "pdf" ? downloadReportPdf(report) : downloadReportXlsx(report));
    } catch {
      toast.error("Couldn't create the file — try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHero
        crumb={[{ label: "Reports" }]}
        title="Reports"
        actions={
          <>
            <Button onClick={() => run("xlsx")} disabled={busy !== null}>
              {busy === "xlsx" ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Excel
            </Button>
            <Button variant="primary" onClick={() => run("pdf")} disabled={busy !== null}>
              {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Download PDF
            </Button>
          </>
        }
      />
      <main className="p-6">
        <FilterBar active={active} onReset={reset}>
          <FilterField label="Period">
            <DateRangePicker
              start={from}
              end={to}
              today={today}
              align="start"
              onChange={(a, b) => {
                setFrom(a);
                setTo(b);
                timePage.setPage(0);
              }}
            />
          </FilterField>
          <FilterField label="Doctors">
            <MultiSelectFilter noun="doctors" options={doctors.map((d) => ({ key: d.id, label: d.name }))} selected={doctorIds} onChange={setDoctorIds} />
          </FilterField>
          <FilterField label="Complaints">
            <MultiSelectFilter noun="complaints" options={COMPLAINTS.map((c) => ({ key: c.key, label: c.en }))} selected={complaints} onChange={setComplaints} />
          </FilterField>
          <FilterField label="Language">
            <SegmentedFilter
              value={lang}
              onChange={setLang}
              options={[
                { key: "all", label: "All" },
                { key: "en", label: "English" },
                { key: "ur", label: "Urdu" },
              ]}
            />
          </FilterField>
          <FilterField label="Outcome">
            <MultiSelectFilter noun="outcomes" options={OUTCOME_KEYS.map((k) => ({ key: k, label: OUTCOMES[k].label }))} selected={outcomes} onChange={setOutcomes} />
          </FilterField>
          <FilterField label="Group by">
            <SegmentedFilter
              value={group}
              onChange={(g) => {
                setGroup(g);
                timePage.setPage(0);
              }}
              options={[
                { key: "day", label: "Day" },
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
              ]}
            />
          </FilterField>
          <FilterField label="Contents">
            <MultiSelectFilter noun="sections" options={SECTIONS} selected={sections} onChange={setSections} />
          </FilterField>
        </FilterBar>

        {/* What this report covers — the same lines go on the PDF and the workbook. */}
        <p className="mb-5 text-[13px] text-[var(--mute)]">
          <span className="font-semibold text-[var(--ink)]">{period}</span> · {rows.length} consultation{rows.length === 1 ? "" : "s"}
          {filters.length ? <> · {filters.join(" · ")}</> : null}
        </p>

        <div className="grid gap-5">
          {show("summary") ? (
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <KpiTile index={0} accent="teal" label="Consultations" value={String(rows.length)} detail={`${seen.length} seen by a doctor`} />
              <KpiTile index={1} accent="green" label="Prescriptions released" value={String(released.length)} detail={`${pct(released.length, seen.length)} of patients seen`} />
              <KpiTile index={2} accent="indigo" label="Total call time" value={fmtMinutes(callMs)} detail={ended.length ? `${fmtDuration(callMs / ended.length)} avg call` : "—"} />
              <KpiTile index={3} accent="amber" label="Avg wait" value={fmtMinutes(avgWait)} detail={`${er} sent to ER · ${ineligible} not eligible`} />
            </div>
          ) : null}

          {show("doctors") ? (
            <Section title="By doctor" sub={`${perDoctor.length} doctor${perDoctor.length === 1 ? "" : "s"}`} bodyClassName="!px-0 !pb-0">
              <Table
                head={["Doctor", "Patients received", "Unique patients", "Call time", "Avg call", "Avg wait", "Prescriptions released", "Share"]}
                empty={perDoctor.length ? null : <EmptyRow>No doctors match these filters.</EmptyRow>}
              >
                {perDoctor.map(({ d, s }) => (
                  <Row key={d.id}>
                    <Cell>
                      <span className="flex items-center gap-3">
                        <Avatar initials={d.initials} size={30} />
                        <span>
                          <span className="block font-semibold text-[var(--ink)]">{d.name}</span>
                          <span className="block font-mono text-[11.5px] text-[var(--mute)]">{d.pmdc}</span>
                        </span>
                      </span>
                    </Cell>
                    <Cell strong>{s.received}</Cell>
                    <Cell>{s.patients}</Cell>
                    <Cell>{fmtMinutes(s.callMs)}</Cell>
                    <Cell>{s.avgCallMs ? fmtDuration(s.avgCallMs) : "—"}</Cell>
                    <Cell>{fmtMinutes(s.avgWaitMs)}</Cell>
                    <Cell>{s.released}</Cell>
                    <Cell>
                      <Bar value={s.received} of={seen.length} label={pct(s.received, seen.length)} />
                    </Cell>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}

          {show("complaints") || show("time") ? (
            <div className={`grid items-start gap-5 ${show("complaints") && show("time") ? "lg:grid-cols-2" : ""}`}>
              {show("complaints") ? (
                <Section title="By complaint" sub={`${seen.length} seen`} bodyClassName="!px-0 !pb-0">
                  <Table head={["Complaint", "Consultations", "Share"]} empty={byComplaint.length ? null : <EmptyRow>No consultations match these filters.</EmptyRow>}>
                    {byComplaint.map((c) => (
                      <Row key={c.label}>
                        <Cell strong>{c.label}</Cell>
                        <Cell>
                          <Bar value={c.n} of={topComplaint} label={String(c.n)} />
                        </Cell>
                        <Cell>{pct(c.n, seen.length)}</Cell>
                      </Row>
                    ))}
                  </Table>
                </Section>
              ) : null}
              {show("time") ? (
                <Section title={`By ${groupWord.toLowerCase()}`} sub={`${overTime.length} ${groupWord.toLowerCase()}${overTime.length === 1 ? "" : "s"}`} bodyClassName="!px-0 !pb-0">
                  <Table head={[groupWord, "Started", "Seen", "Released"]} empty={overTime.length ? null : <EmptyRow>No consultations match these filters.</EmptyRow>}>
                    {timePage.rows.map((b) => (
                      <Row key={b.label}>
                        <Cell strong>{b.label}</Cell>
                        <Cell>
                          <Bar value={b.started} of={topBucket} label={String(b.started)} />
                        </Cell>
                        <Cell>{b.seen}</Cell>
                        <Cell>{b.released}</Cell>
                      </Row>
                    ))}
                  </Table>
                  <div className="px-4 pb-3">
                    <Pager {...timePage} />
                  </div>
                </Section>
              ) : null}
            </div>
          ) : null}

          {!sections.length ? <p className="text-[13px] text-[var(--mute)]">Pick at least one section under Contents.</p> : null}
        </div>
      </main>
    </>
  );
}

/** A number with a thin bar showing its size against the largest in the column. */
function Bar({ value, of, label }: { value: number; of: number; label: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--hair)]">
        <span className="block h-full rounded-full bg-[var(--action)]" style={{ width: of ? `${Math.min(100, (value / of) * 100)}%` : 0 }} />
      </span>
      <span className="text-[12.5px] tabular-nums">{label}</span>
    </span>
  );
}
