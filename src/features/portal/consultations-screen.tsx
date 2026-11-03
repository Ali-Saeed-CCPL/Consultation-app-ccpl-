/* Consultations — the rail's views over one list: the live queue, the history
   of finished consultations (filtered by date range on the CCPL calendar), and
   triage outcomes (sent to ER / not eligible). Approval happens in the live
   call, so history has no status tabs — the Status column says where each one is. */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import PageHero from "@/components/layout/page-hero";
import DateRangePicker from "@/components/ui/date-range-picker";
import StatusTag from "@/components/ui/status-tag";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import { RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDateTime, isOthersActive } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import type { Consultation } from "@/lib/types";

type View = "live" | "history" | "triage";

const VIEWS: Record<View, { title: string; filter: (c: Consultation) => boolean }> = {
  live: {
    title: "Live queue",
    filter: (c) => ["queued", "ringing", "in_call"].includes(c.status),
  },
  history: {
    title: "History",
    filter: (c) => ["drafting", "approved", "closed"].includes(c.status),
  },
  triage: {
    title: "Triage outcomes",
    filter: (c) => ["emergency", "ineligible"].includes(c.status),
  },
};

/** YYYY-MM-DD in the clinic's time zone — compares as a string against the picker's range. */
const dayOf = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

/** `admin`: the clinic admin's view — every doctor's consultations, opened read-only under /admin. */
export default function ConsultationsScreen({ view, admin = false }: { view: View; admin?: boolean }) {
  const doctor = useCurrentDoctor();
  const navigate = useNavigate();
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  // Empty range = all time.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const meta = VIEWS[view];
  const history = view === "history";
  const base = admin ? "/admin/consultations" : "/portal/consultations";
  const title = admin ? "Consultation records" : meta.title;

  const rows = consultations
    // A doctor's history is their own consultations; the admin sees every doctor's.
    .filter((c) => meta.filter(c) && (admin || (history ? c.prescriberId === doctor!.id : !isOthersActive(c, doctor!.id))))
    .filter((c) => !history || !from || (dayOf(c.createdAt) >= from && dayOf(c.createdAt) <= to))
    .sort((a, b) => b.createdAt - a.createdAt);
  const [ty, tm, td] = dayOf(Date.now()).split("-").map(Number);
  // In a doctor's own history the Doctor column would always be them.
  const showDoctor = admin || !history;

  return (
    <>
      <PageHero crumb={admin ? [{ label: title }] : [{ label: "Consultations", to: base }, { label: title }]} title={title} />
      <main className="p-6">
        {history ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--mute)]">
              <span className="font-semibold text-[var(--ink)]">{rows.length}</span> consultation{rows.length === 1 ? "" : "s"}
            </p>
            <DateRangePicker
              start={from}
              end={to}
              today={new Date(ty, tm - 1, td)}
              onChange={(s, e) => {
                setFrom(s);
                setTo(e);
              }}
            />
          </div>
        ) : null}
        <Table
          // History is one plain record, not sorted into statuses — no Status column there.
          head={["Ref", "Patient", "Complaint", "Language", ...(showDoctor ? ["Doctor"] : []), "Started", ...(history ? [] : ["Status"])]}
          empty={rows.length ? null : <EmptyRow>{history && from ?"No consultations in this period." : "Nothing here right now."}</EmptyRow>}
        >
          {rows.map((c) => (
            <Row key={c.id} onClick={() => navigate({ to: `${base}/$id`, params: { id: c.id } })}>
              <Cell mono strong>
                {c.id}
              </Cell>
              <Cell>
                <div className="font-semibold text-[var(--ink)]">{c.member.name}</div>
                <div className="text-[11.5px] text-[var(--mute)]">
                  {c.member.age} · {c.member.gender} · <span className="font-mono">{c.member.mrn}</span>
                </div>
              </Cell>
              <Cell>
                {c.status === "emergency"
                  ? RED_FLAGS.filter((f) => c.symptoms?.redFlags.includes(f.key)).map((f) => f.en).join(", ")
                  : complaintText(c.symptoms) || "—"}
              </Cell>
              <Cell>{c.lang === "ur" ? "Urdu" : "English"}</Cell>
              {showDoctor ? <Cell>{doctors.find((d) => d.id === c.prescriberId)?.name ?? "—"}</Cell> : null}
              <Cell mono>{fmtDateTime(c.createdAt)}</Cell>
              {history ? null : (
                <Cell>
                  <StatusTag status={c.status} />
                </Cell>
              )}
            </Row>
          ))}
        </Table>
      </main>
    </>
  );
}
