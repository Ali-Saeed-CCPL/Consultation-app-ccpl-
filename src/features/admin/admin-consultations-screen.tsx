/* Admin · Consultation records — every doctor's consultations in one list,
   styled like the Doctors table (avatars, coloured complaint and outcome tags,
   each doctor in their chart colour), with working filters above it:

     search (patient, MRN or ref) · date range · doctor · complaint ·
     language · outcome

   A summary row reflects the filtered set, and the list pages 20 at a time.
   Opening a row shows the consultation read-only (/admin/consultations/$id). */

import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, FileCheck2, Stethoscope, Users } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import DateRangePicker from "@/components/ui/date-range-picker";
import { FilterBar, FilterField, SearchFilter, SegmentedFilter, SelectFilter } from "@/components/ui/filter-bar";
import Tag from "@/components/ui/tag";
import { COMPLAINTS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDuration } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { Consultation } from "@/lib/types";

const PAGE = 20;
const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

type Outcome = "prescribed" | "advice" | "er" | "live" | "ineligible";
const OUTCOMES: Record<Outcome, { label: string; tone: "ok" | "neutral" | "err" | "warn" }> = {
  prescribed: { label: "Prescribed", tone: "ok" },
  advice: { label: "Advice only", tone: "neutral" },
  er: { label: "Sent to ER", tone: "err" },
  live: { label: "In progress", tone: "warn" },
  ineligible: { label: "Not eligible", tone: "err" },
};

function outcomeOf(c: Consultation): Outcome {
  if (c.status === "emergency") return "er";
  if (c.status === "ineligible") return "ineligible";
  if (c.status === "approved" || c.status === "closed" || c.status === "drafting") return c.rxVersion > 0 ? "prescribed" : "advice";
  return "live";
}

/** A tint per complaint, so the column scans at a glance. */
const COMPLAINT_TINT: Record<string, string> = {
  fever: "bg-[var(--red-tint)] text-[var(--color-red-ink)]",
  cough: "bg-[var(--tint)] text-[var(--link)]",
  stomach: "bg-[var(--amber-tint)] text-[var(--amber-ink)]",
  skin: "bg-[var(--green-tint)] text-[var(--color-green-ink)]",
  headache: "bg-[var(--primary)] text-[var(--ink)]",
  other: "bg-[var(--sunken)] text-[var(--body)]",
};

export default function AdminConsultationsScreen() {
  const navigate = useNavigate();
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [doctorId, setDoctorId] = useState("all");
  const [complaint, setComplaint] = useState("all");
  const [lang, setLang] = useState<"all" | "ur" | "en">("all");
  const [outcome, setOutcome] = useState<"all" | Outcome>("all");
  const [page, setPage] = useState(0);
  const active = Boolean(q || from || doctorId !== "all" || complaint !== "all" || lang !== "all" || outcome !== "all");
  const reset = () => {
    setQ("");
    setFrom("");
    setTo("");
    setDoctorId("all");
    setComplaint("all");
    setLang("all");
    setOutcome("all");
    setPage(0);
  };
  // Any filter change goes back to the first page.
  const on =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  const colour = useMemo(() => new Map(doctors.map((d, i) => [d.id, `var(--series-${(i % 8) + 1})`])), [doctors]);
  const doctorOf = (id?: string) => doctors.find((d) => d.id === id);

  const needle = q.trim().toLowerCase();
  const rows = consultations
    // Records are consultations that got somewhere — not half-filled intake forms.
    .filter((c) => c.status !== "intake" || c.callStartedAt)
    .filter((c) => !needle || c.member.name.toLowerCase().includes(needle) || c.member.mrn.toLowerCase().includes(needle) || c.id.toLowerCase().includes(needle))
    .filter((c) => !from || (dayOf(c.createdAt) >= from && dayOf(c.createdAt) <= to))
    .filter((c) => doctorId === "all" || (doctorId === "none" ? !c.prescriberId : c.prescriberId === doctorId))
    .filter((c) => complaint === "all" || c.symptoms?.complaint === complaint)
    .filter((c) => lang === "all" || c.lang === lang)
    .filter((c) => outcome === "all" || outcomeOf(c) === outcome)
    .sort((a, b) => b.createdAt - a.createdAt);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);
  const finished = rows.filter((c) => c.callStartedAt && c.callEndedAt);
  const prescribed = rows.filter((c) => outcomeOf(c) === "prescribed").length;
  const avgCall = finished.length ? finished.reduce((n, c) => n + (c.callEndedAt! - c.callStartedAt!), 0) / finished.length : 0;
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);

  return (
    <>
      <PageHero crumb={[{ label: "Consultation records" }]} title="Consultation records" />
      <main className="viz-root p-6">
        <FilterBar active={active} onReset={reset}>
          <FilterField label="Search">
            <SearchFilter value={q} onChange={on(setQ)} placeholder="Patient, MRN or ref…" />
          </FilterField>
          <FilterField label="Date">
            <DateRangePicker
              start={from}
              end={to}
              today={new Date(ty, tm - 1, td)}
              onChange={(s, e) => {
                setFrom(s);
                setTo(e);
                setPage(0);
              }}
            />
          </FilterField>
          <FilterField label="Doctor">
            <SelectFilter
              value={doctorId}
              onChange={on(setDoctorId)}
              options={[{ key: "all", label: "All doctors" }, ...doctors.map((d) => ({ key: d.id, label: d.name })), { key: "none", label: "No doctor (not seen)" }]}
            />
          </FilterField>
          <FilterField label="Complaint">
            <SelectFilter value={complaint} onChange={on(setComplaint)} options={[{ key: "all", label: "All complaints" }, ...COMPLAINTS.map((c) => ({ key: c.key, label: c.en }))]} />
          </FilterField>
          <FilterField label="Language">
            <SegmentedFilter
              value={lang}
              onChange={on(setLang)}
              options={[
                { key: "all", label: "All" },
                { key: "ur", label: "Urdu" },
                { key: "en", label: "English" },
              ]}
            />
          </FilterField>
          <FilterField label="Outcome">
            <SelectFilter
              value={outcome}
              onChange={on(setOutcome)}
              options={[{ key: "all" as const, label: "All outcomes" }, ...(Object.keys(OUTCOMES) as Outcome[]).map((k) => ({ key: k, label: OUTCOMES[k].label }))]}
            />
          </FilterField>
        </FilterBar>

        {/* ── Summary of the filtered set ───────────────────────────────── */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Summary icon={<Stethoscope size={16} />} label="Consultations" value={String(rows.length)} note={active ? "Matching the filters" : "All records"} />
          <Summary icon={<FileCheck2 size={16} />} label="Prescribed" value={rows.length ? `${Math.round((prescribed / rows.length) * 100)}%` : "—"} note={`${prescribed} with a prescription`} />
          <Summary icon={<Clock size={16} />} label="Avg call" value={avgCall ? fmtDuration(avgCall) : "—"} note={`${finished.length} finished calls`} />
          <Summary icon={<Users size={16} />} label="Patients" value={String(new Set(rows.map((c) => c.member.mrn)).size)} note="Unique MRNs" />
        </div>

        <div className="overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Ref", "Patient", "Complaint", "Language", "Doctor", "Call", "Outcome", "Started"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-[var(--line)] bg-[var(--sunken)] px-4 py-3 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const d = doctorOf(c.prescriberId);
                  const o = OUTCOMES[outcomeOf(c)];
                  const key = c.symptoms?.complaint ?? "other";
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate({ to: "/admin/consultations/$id", params: { id: c.id } })}
                      className="cursor-pointer border-t border-[var(--hair)] first:border-t-0 hover:bg-[var(--sunken)]"
                    >
                      <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-[var(--ink)]">{c.id}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar initials={initialsOf(c.member.name)} size={34} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-[var(--ink)]">{c.member.name}</span>
                            <span className="block text-[11.5px] text-[var(--mute)]">
                              {c.member.age} · {c.member.gender === "M" ? "Male" : "Female"} · <span className="font-mono">{c.member.mrn}</span>
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex max-w-[200px] truncate rounded-(--radius-pill) px-2.5 py-[3px] text-[12px] font-semibold ${c.status === "emergency" ? COMPLAINT_TINT.fever : COMPLAINT_TINT[key] ?? COMPLAINT_TINT.other}`}>
                          {c.status === "emergency"
                            ? RED_FLAGS.filter((f) => c.symptoms?.redFlags.includes(f.key)).map((f) => f.en).join(", ") || "Red flag"
                            : complaintText(c.symptoms) || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-(--radius-pill) border border-[var(--line)] px-2 py-[2px] text-[11.5px] font-semibold text-[var(--body)]">
                          {c.lang === "ur" ? "اردو · Urdu" : "English"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d ? (
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colour.get(d.id) }} />
                            <span className="truncate text-[var(--ink)]">{d.name}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--faint)]">Not seen</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12.5px] text-[var(--body)]">
                        {c.callStartedAt && c.callEndedAt ? fmtDuration(c.callEndedAt - c.callStartedAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Tag tone={o.tone}>{o.label}</Tag>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block whitespace-nowrap text-[12.5px] font-semibold text-[var(--ink)]">
                          {new Date(c.createdAt).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="block font-mono text-[11.5px] text-[var(--mute)]">
                          {new Date(c.createdAt).toLocaleTimeString("en-PK", { timeZone: CLINIC_HOURS.tz, hour: "numeric", minute: "2-digit" })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-[var(--mute)]">No consultations match these filters.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--sunken)] px-4 py-2.5 text-[12.5px] text-[var(--mute)]">
              <span>
                Showing <b className="text-[var(--ink)]">{current * PAGE + 1}</b>–<b className="text-[var(--ink)]">{Math.min(rows.length, (current + 1) * PAGE)}</b> of{" "}
                <b className="text-[var(--ink)]">{rows.length}</b>
              </span>
              <span className="flex items-center gap-1">
                <PageButton disabled={current === 0} onClick={() => setPage(current - 1)} label="Previous page">
                  <ChevronLeft size={15} />
                </PageButton>
                <span className="px-2 font-mono text-[12px] text-[var(--ink)]">
                  {current + 1} / {pages}
                </span>
                <PageButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)} label="Next page">
                  <ChevronRight size={15} />
                </PageButton>
              </span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Summary({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-4 py-3 shadow-(--shadow-sm)">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--tint)] text-[var(--link)]">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--mute)]">{label}</span>
        <span className="block text-[20px] font-bold leading-tight text-[var(--ink)]">{value}</span>
        <span className="block truncate text-[12px] text-[var(--mute)]">{note}</span>
      </span>
    </div>
  );
}

function PageButton({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[var(--link)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
