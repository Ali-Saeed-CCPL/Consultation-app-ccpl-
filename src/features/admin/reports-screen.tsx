/* Admin · Reports — the overall picture for any date range: totals, a per-doctor
   breakdown (patients received, call time, waits, prescriptions), and splits by
   complaint and by day. Downloads as a formatted Excel workbook or a PDF report
   (features/admin/report-export.ts), built from the same figures as the screen. */

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import KpiTile from "@/components/common/kpi-tile";
import PageHero from "@/components/layout/page-hero";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import DateRangePicker from "@/components/ui/date-range-picker";
import Section from "@/components/ui/section";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { COMPLAINTS } from "@/data/seed";
import { complaintKeys } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDateTime, fmtDuration } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { downloadReportPdf, downloadReportXlsx, type ReportData } from "@/features/admin/report-export";

const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

export default function ReportsScreen() {
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);

  const rows = consultations.filter((c) => !from || (dayOf(c.createdAt) >= from && dayOf(c.createdAt) <= to));
  const seen = rows.filter((c) => c.callStartedAt);
  const ended = seen.filter((c) => c.callEndedAt);
  const callMs = ended.reduce((s, c) => s + (c.callEndedAt! - c.callStartedAt!), 0);
  const waits = seen.map((c) => c.callStartedAt! - (c.consentAt ?? c.createdAt));
  const released = rows.filter((c) => c.status === "approved" || c.status === "closed");
  const er = rows.filter((c) => c.status === "emergency").length;
  const ineligible = rows.filter((c) => c.status === "ineligible").length;
  const avgWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;

  const perDoctor = doctors
    .map((d) => ({ d, s: doctorStats(rows, d.id) }))
    .filter(({ d, s }) => s.received > 0 || d.active !== false)
    .sort((a, b) => b.s.received - a.s.received);

  const complaintCounts = new Map<string, number>();
  for (const c of seen) for (const k of complaintKeys(c.symptoms?.complaint)) complaintCounts.set(k, (complaintCounts.get(k) ?? 0) + 1);
  const byComplaint = [...complaintCounts].map(([k, n]) => ({ label: COMPLAINTS.find((x) => x.key === k)?.en ?? k, n })).sort((a, b) => b.n - a.n);

  const days = new Map<string, { started: number; seen: number; released: number }>();
  for (const c of rows) {
    const d = days.get(dayOf(c.createdAt)) ?? { started: 0, seen: 0, released: 0 };
    d.started++;
    if (c.callStartedAt) d.seen++;
    if (c.status === "approved" || c.status === "closed") d.released++;
    days.set(dayOf(c.createdAt), d);
  }
  const byDay = [...days].sort((a, b) => b[0].localeCompare(a[0]));

  const period = from ? (from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`) : "All time";
  const fileBase = `consultation-report-${from ? (from === to ? from : `${from}_to_${to}`) : "all-time"}`;

  const min = (ms: number, dp = 0) => +(ms / 60_000).toFixed(dp);
  const report: ReportData = {
    period,
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
    days: byDay.map(([d, v]) => ({ date: dayLabel(d), ...v })),
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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--mute)]">
            <span className="font-semibold text-[var(--ink)]">{period}</span> · {rows.length} consultation{rows.length === 1 ? "" : "s"}
          </p>
          <DateRangePicker
            start={from}
            end={to}
            today={new Date(ty, tm - 1, td)}
            onChange={(a, b) => {
              setFrom(a);
              setTo(b);
            }}
          />
        </div>

        <div className="grid gap-5">

          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <KpiTile index={0} accent="teal" label="Consultations" value={String(rows.length)} detail={`${seen.length} seen by a doctor`} />
            <KpiTile index={1} accent="green" label="Prescriptions released" value={String(released.length)} detail={`${pct(released.length, seen.length)} of patients seen`} />
            <KpiTile index={2} accent="indigo" label="Total call time" value={fmtMinutes(callMs)} detail={ended.length ? `${fmtDuration(callMs / ended.length)} avg call` : "—"} />
            <KpiTile index={3} accent="amber" label="Avg wait" value={fmtMinutes(avgWait)} detail={`${er} sent to ER · ${ineligible} not eligible`} />
          </div>

          <Section title="By doctor" sub={`${perDoctor.length} doctor${perDoctor.length === 1 ? "" : "s"}`} bodyClassName="!px-0 !pb-0">
            <Table
              head={["Doctor", "Patients received", "Unique patients", "Call time", "Avg call", "Avg wait", "Prescriptions released", "Share"]}
              empty={perDoctor.length ? null : <EmptyRow>No doctors.</EmptyRow>}
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
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--hair)]">
                        <span className="block h-full rounded-full bg-[var(--action)]" style={{ width: seen.length ? `${(s.received / seen.length) * 100}%` : 0 }} />
                      </span>
                      <span className="text-[12.5px]">{pct(s.received, seen.length)}</span>
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          </Section>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Section title="By complaint" bodyClassName="!px-0 !pb-0">
              <Table head={["Complaint", "Consultations", "Share"]} empty={byComplaint.length ? null : <EmptyRow>No consultations in this period.</EmptyRow>}>
                {byComplaint.map((c) => (
                  <Row key={c.label}>
                    <Cell strong>{c.label}</Cell>
                    <Cell>{c.n}</Cell>
                    <Cell>{pct(c.n, seen.length)}</Cell>
                  </Row>
                ))}
              </Table>
            </Section>
            <Section title="By day" bodyClassName="!px-0 !pb-0">
              <Table head={["Date", "Started", "Seen", "Released"]} empty={byDay.length ? null : <EmptyRow>No consultations in this period.</EmptyRow>}>
                {byDay.map(([d, v]) => (
                  <Row key={d}>
                    <Cell strong>{dayLabel(d)}</Cell>
                    <Cell>{v.started}</Cell>
                    <Cell>{v.seen}</Cell>
                    <Cell>{v.released}</Cell>
                  </Row>
                ))}
              </Table>
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
