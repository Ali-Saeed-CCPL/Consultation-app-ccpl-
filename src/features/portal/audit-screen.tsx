/* Audit log — every step of every journey writes here: who, what, when.
   Filtered the way an admin thinks about it rather than by internal role:

     search (ref, person or detail) · date range · activity (calls,
     prescriptions, emergencies …) · done by (patients, doctors, admin, the
     system) · doctor

   The list pages 25 at a time. */

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  LogIn,
  PhoneCall,
  ShieldCheck,
  ToggleRight,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import DateRangePicker from "@/components/ui/date-range-picker";
import { FilterBar, FilterField, SearchFilter, SelectFilter } from "@/components/ui/filter-bar";
import { CLINIC_HOURS } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { AuditEvent } from "@/lib/types";

const PAGE = 25;
const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

/* ── What happened ─────────────────────────────────────────────────────── */

type Category = "intake" | "calls" | "prescriptions" | "emergency" | "availability" | "doctors" | "access" | "other";
const CATEGORIES: Record<Category, { label: string; icon: LucideIcon; tint: string }> = {
  intake: { label: "Patient intake", icon: ClipboardList, tint: "bg-[var(--tint)] text-[var(--link)]" },
  calls: { label: "Calls", icon: PhoneCall, tint: "bg-[var(--green-tint)] text-[var(--color-green-ink)]" },
  prescriptions: { label: "Prescriptions", icon: FileCheck2, tint: "bg-[var(--primary)] text-[var(--ink)]" },
  emergency: { label: "Emergencies", icon: AlertTriangle, tint: "bg-[var(--red-tint)] text-[var(--color-red-ink)]" },
  availability: { label: "Doctor availability", icon: ToggleRight, tint: "bg-[var(--amber-tint)] text-[var(--amber-ink)]" },
  doctors: { label: "Doctor accounts", icon: UserCog, tint: "bg-[var(--sunken)] text-[var(--ink)]" },
  access: { label: "Sign-ins", icon: LogIn, tint: "bg-[var(--sunken)] text-[var(--body)]" },
  other: { label: "Other", icon: Activity, tint: "bg-[var(--sunken)] text-[var(--mute)]" },
};

function categoryOf(e: AuditEvent): Category {
  const a = e.action.toLowerCase();
  if (a.includes("red flag") || a.includes("support follow-up") || a.includes("emergency")) return "emergency";
  if (a.startsWith("signed in") || a.includes("sign-in") || a.includes("password")) return "access";
  if (a.includes("doctor") && e.actorRole === "admin") return "doctors";
  if (a.startsWith("went available") || a.startsWith("went unavailable")) return "availability";
  if (a.includes("prescription") || a.includes("drafted notes") || a.startsWith("closed consultation")) return "prescriptions";
  if (a.includes("call") || a.startsWith("rang")) return "calls";
  if (a.includes("consultation") || a.includes("consent") || a.includes("queue") || a.includes("eligibility")) return "intake";
  return "other";
}

/* ── Who did it ────────────────────────────────────────────────────────── */

type Who = "patients" | "doctors" | "admin" | "system";
const WHO: Record<Who, { label: string; roles: AuditEvent["actorRole"][] }> = {
  patients: { label: "Patients", roles: ["patient"] },
  doctors: { label: "Doctors", roles: ["doctor"] },
  admin: { label: "Clinic admin", roles: ["admin"] },
  system: { label: "System & AI", roles: ["platform", "ai", "support"] },
};
const ROLE_LABEL: Record<AuditEvent["actorRole"], string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
  platform: "System",
  ai: "AI assist",
  support: "CCPL support",
};

export default function AuditScreen() {
  const audit = usePlatform((s) => s.audit);
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const consultIds = useMemo(() => new Set(consultations.map((c) => c.id)), [consultations]);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [who, setWho] = useState<"all" | Who>("all");
  const [doctorName, setDoctorName] = useState("all");
  const [page, setPage] = useState(0);
  const active = Boolean(q || from || category !== "all" || who !== "all" || doctorName !== "all");
  const reset = () => {
    setQ("");
    setFrom("");
    setTo("");
    setCategory("all");
    setWho("all");
    setDoctorName("all");
    setPage(0);
  };
  const on =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  const needle = q.trim().toLowerCase();
  const rows = audit
    .filter((e) => !needle || [e.consultId, e.actor, e.action, e.detail ?? ""].some((s) => s.toLowerCase().includes(needle)))
    .filter((e) => !from || (dayOf(e.at) >= from && dayOf(e.at) <= to))
    .filter((e) => who === "all" || WHO[who].roles.includes(e.actorRole))
    // A doctor's trail: what they did, and what happened on calls that rang them.
    .filter((e) => doctorName === "all" || e.actor === doctorName || e.detail === doctorName)
    .filter((e) => category === "all" || categoryOf(e) === category)
    .sort((a, b) => b.at - a.at);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = rows.slice(current * PAGE, current * PAGE + PAGE);
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);

  return (
    <>
      <PageHero crumb={[{ label: "Audit log" }]} title="Audit log" />
      <main className="p-6">
        <FilterBar active={active} onReset={reset}>
          <FilterField label="Search">
            <SearchFilter value={q} onChange={on(setQ)} placeholder="Ref, person or detail…" />
          </FilterField>
          <FilterField label="Date">
            <DateRangePicker
              start={from}
              end={to}
              today={new Date(ty, tm - 1, td)}
              align="start"
              onChange={(s, e) => {
                setFrom(s);
                setTo(e);
                setPage(0);
              }}
            />
          </FilterField>
          <FilterField label="Activity">
            <SelectFilter
              value={category}
              onChange={on(setCategory)}
              options={[{ key: "all" as const, label: "All activity" }, ...(Object.keys(CATEGORIES) as Category[]).map((k) => ({ key: k, label: CATEGORIES[k].label }))]}
            />
          </FilterField>
          <FilterField label="Done by">
            <SelectFilter
              value={who}
              onChange={on(setWho)}
              options={[{ key: "all" as const, label: "Anyone" }, ...(Object.keys(WHO) as Who[]).map((k) => ({ key: k, label: WHO[k].label }))]}
            />
          </FilterField>
          <FilterField label="Doctor">
            <SelectFilter value={doctorName} onChange={on(setDoctorName)} options={[{ key: "all", label: "All doctors" }, ...doctors.map((d) => ({ key: d.name, label: d.name }))]} />
          </FilterField>
        </FilterBar>

        <div className="overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["When", "Activity", "What happened", "Done by", "Consultation"].map((h) => (
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
                {shown.map((e) => {
                  const C = CATEGORIES[categoryOf(e)];
                  const system = e.actorRole === "platform" || e.actorRole === "ai" || e.actorRole === "support";
                  return (
                    <tr key={e.id} className="border-t border-[var(--hair)] first:border-t-0 hover:bg-[var(--sunken)]">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="block text-[12.5px] font-semibold text-[var(--ink)]">
                          {new Date(e.at).toLocaleDateString("en-PK", { timeZone: CLINIC_HOURS.tz, day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="block font-mono text-[11.5px] text-[var(--mute)]">
                          {new Date(e.at).toLocaleTimeString("en-PK", { timeZone: CLINIC_HOURS.tz, hour: "numeric", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-(--radius-pill) px-2.5 py-[3px] text-[12px] font-semibold ${C.tint}`}>
                          <C.icon size={13} /> {C.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-[var(--ink)]">{e.action}</span>
                        {e.detail ? <span className="block max-w-[420px] truncate text-[12px] text-[var(--mute)]">{e.detail}</span> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          {system ? (
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sunken)] text-[var(--mute)]">
                              {e.actorRole === "ai" ? <Bot size={14} /> : <ShieldCheck size={14} />}
                            </span>
                          ) : (
                            <Avatar initials={initialsOf(e.actor)} size={28} />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-[var(--ink)]">{e.actor}</span>
                            <span className="block text-[11.5px] text-[var(--mute)]">{ROLE_LABEL[e.actorRole]}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12.5px] font-semibold">
                        {consultIds.has(e.consultId) ? (
                          <Link to="/admin/consultations/$id" params={{ id: e.consultId }}>
                            {e.consultId}
                          </Link>
                        ) : (
                          <span className="font-sans font-normal text-[var(--faint)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-[var(--mute)]">No events match these filters.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--sunken)] px-4 py-2.5 text-[12.5px] text-[var(--mute)]">
              <span>
                Showing <b className="text-[var(--ink)]">{current * PAGE + 1}</b>–<b className="text-[var(--ink)]">{Math.min(rows.length, (current + 1) * PAGE)}</b> of{" "}
                <b className="text-[var(--ink)]">{rows.length}</b> events
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
