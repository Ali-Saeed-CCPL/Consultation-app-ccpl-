/* Admin · one doctor — profile, their figures, availability, Edit, and every
   consultation they've taken (date filter on the CCPL calendar). */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import KpiTile from "@/components/common/kpi-tile";
import PageHero from "@/components/layout/page-hero";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import DateRangePicker from "@/components/ui/date-range-picker";
import StatusTag from "@/components/ui/status-tag";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import DoctorForm from "@/features/admin/doctor-form";
import { DoctorStatus } from "@/features/admin/doctors-screen";
import { doctorStats, fmtMinutes } from "@/features/admin/doctor-stats";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDateTime, fmtDuration } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";

const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

export default function DoctorDetailScreen({ id }: { id: string }) {
  const navigate = useNavigate();
  const doctor = usePlatform((s) => s.doctors.find((d) => d.id === id));
  const all = usePlatform((s) => s.consultations);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (!doctor) {
    return (
      <>
        <PageHero crumb={[{ label: "Doctors", to: "/admin/doctors" }, { label: id }]} back="/admin/doctors" title="Doctor not found" />
        <main className="p-6 text-[13px] text-[var(--mute)]">
          <Link to="/admin/doctors">Back to doctors</Link>
        </main>
      </>
    );
  }

  const inRange = all.filter((c) => !from || (dayOf(c.createdAt) >= from && dayOf(c.createdAt) <= to));
  const s = doctorStats(inRange, doctor.id);
  const rows = inRange.filter((c) => c.prescriberId === doctor.id && c.callStartedAt).sort((a, b) => b.createdAt - a.createdAt);
  const onCall = all.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);

  return (
    <>
      <PageHero
        crumb={[{ label: "Doctors", to: "/admin/doctors" }, { label: doctor.name }]}
        back="/admin/doctors"
        title={
          <span className="flex items-center gap-3">
            <Avatar initials={doctor.initials} size={40} />
            {doctor.name}
          </span>
        }
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12.5px]">{doctor.pmdc}</span> · General practitioner · Sign-in{" "}
            <span className="font-mono text-[12.5px]">{doctor.username ?? "none"}</span> · <DoctorStatus doctor={doctor} onCall={onCall} />
          </span>
        }
        actions={
          // Availability is the doctor's own switch (the server allows only them to change it).
          <Button variant="primary" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit
          </Button>
        }
      />
      <main className="grid gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--mute)]">{from ? "Figures for the selected dates" : "All-time figures"}</p>
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
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile index={0} accent="teal" label="Patients received" value={String(s.received)} detail={`${s.patients} unique`} />
          <KpiTile index={1} accent="green" label="Prescriptions released" value={String(s.released)} detail={s.received ? `${Math.round((s.released / s.received) * 100)}% of calls` : "—"} />
          <KpiTile index={2} accent="indigo" label="Total call time" value={fmtMinutes(s.callMs)} detail="On video with patients" />
          <KpiTile index={3} accent="violet" label="Avg call" value={s.avgCallMs ? fmtDuration(s.avgCallMs) : "—"} detail="Per consultation" />
          <KpiTile index={4} accent="amber" label="Avg wait" value={fmtMinutes(s.avgWaitMs)} detail="Patient consent → call" />
          <KpiTile index={5} accent="teal" label="Last consult" value={s.lastAt ? fmtDateTime(s.lastAt).split(",")[0] : "—"} detail={s.lastAt ? fmtDateTime(s.lastAt) : "None yet"} />
        </div>
        <Table head={["Ref", "Patient", "Complaint", "Started", "Call length", "Status"]} empty={rows.length ? null : <EmptyRow>No consultations in this period.</EmptyRow>}>
          {rows.map((c) => (
            <Row key={c.id} onClick={() => navigate({ to: "/admin/consultations/$id", params: { id: c.id } })}>
              <Cell mono strong>
                {c.id}
              </Cell>
              <Cell>
                <div className="font-semibold text-[var(--ink)]">{c.member.name}</div>
                <div className="text-[11.5px] text-[var(--mute)]">
                  {c.member.age} · {c.member.gender} · <span className="font-mono">{c.member.mrn}</span>
                </div>
              </Cell>
              <Cell>{complaintText(c.symptoms) || "—"}</Cell>
              <Cell mono>{fmtDateTime(c.createdAt)}</Cell>
              <Cell mono>{c.callEndedAt && c.callStartedAt ? fmtDuration(c.callEndedAt - c.callStartedAt) : "—"}</Cell>
              <Cell>
                <StatusTag status={c.status} />
              </Cell>
            </Row>
          ))}
        </Table>
      </main>
      <DoctorForm open={editing} onClose={() => setEditing(false)} doctor={doctor} />
    </>
  );
}
