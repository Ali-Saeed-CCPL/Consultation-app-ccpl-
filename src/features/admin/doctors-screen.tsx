/* Admin · Doctors — the GP roster with each doctor's figures, and Add doctor. */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Tag from "@/components/ui/tag";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import DoctorForm from "@/features/admin/doctor-form";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { fmtDateTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { DEMO_ACCOUNTS } from "@/data/seed";
import type { Doctor } from "@/lib/types";

export default function DoctorsScreen() {
  const navigate = useNavigate();
  const doctors = usePlatform((s) => s.doctors);
  const consultations = usePlatform((s) => s.consultations);
  const logins = usePlatform((s) => s.logins);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const needle = q.trim().toLowerCase();
  const rows = doctors.filter((d) => !needle || d.name.toLowerCase().includes(needle) || d.pmdc.toLowerCase().includes(needle));
  const onCall = (d: Doctor) => consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === d.id);

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
      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-[300px]">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
            <input className="field-input pl-8 text-[13.5px]" placeholder="Search name or PMDC…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <p className="text-[13px] text-[var(--mute)]">
            <span className="font-semibold text-[var(--ink)]">{doctors.filter((d) => d.active !== false).length}</span> active ·{" "}
            <span className="font-semibold text-[var(--ink)]">{doctors.filter((d) => d.available).length}</span> available now
          </p>
        </div>
        <Table
          head={["Doctor", "Sign-in", "Status", "Patients received", "Unique patients", "Call time", "Avg call", "Released", "Last consult"]}
          empty={rows.length ? null : <EmptyRow>No doctors match.</EmptyRow>}
        >
          {rows.map((d) => {
            const s = doctorStats(consultations, d.id);
            return (
              <Row key={d.id} onClick={() => navigate({ to: "/admin/doctors/$id", params: { id: d.id } })}>
                <Cell>
                  <span className="flex items-center gap-3">
                    <Avatar initials={d.initials} size={34} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-[var(--ink)]">{d.name}</span>
                      <span className="block font-mono text-[11.5px] text-[var(--mute)]">{d.pmdc}</span>
                    </span>
                  </span>
                </Cell>
                <Cell mono>{signInOf(d.id, logins) ?? <span className="font-sans text-[var(--faint)]">None</span>}</Cell>
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
            );
          })}
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
