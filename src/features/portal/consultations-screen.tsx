/* Consultations — the rail's views over one list: live queue, the signed-in
   doctor's AI-drafted prescriptions to check and approve, released ones,
   everything, and triage outcomes (sent to ER / not eligible). */

import { useNavigate } from "@tanstack/react-router";
import PageHero from "@/components/layout/page-hero";
import StatusTag from "@/components/ui/status-tag";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import { RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, isOthersActive } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import type { Consultation } from "@/lib/types";

type View = "live" | "drafts" | "released" | "all" | "triage";

const VIEWS: Record<View, { title: string; sub: string; filter: (c: Consultation, me: string) => boolean }> = {
  live: {
    title: "Live queue",
    sub: "Patients waiting, being rung, on a call, or booked for a call back.",
    filter: (c) => ["queued", "ringing", "in_call", "callback"].includes(c.status),
  },
  drafts: {
    title: "To approve",
    sub: "Your finished calls. AI assist has drafted the notes & prescription — check, edit and approve to release it to the patient.",
    filter: (c, me) => c.status === "drafting" && c.prescriberId === me,
  },
  released: {
    title: "Released",
    sub: "Prescriptions approved by the consulting doctor and released to the patient's portal and email.",
    filter: (c) => ["approved", "closed"].includes(c.status),
  },
  all: { title: "All consultations", sub: "Every consultation on the platform, newest first.", filter: () => true },
  triage: {
    title: "Triage outcomes",
    sub: "Stopped before the queue — red flags sent to the ER, or cover CCPL support is following up.",
    filter: (c) => ["emergency", "ineligible"].includes(c.status),
  },
};

export default function ConsultationsScreen({ view }: { view: View }) {
  const doctor = useCurrentDoctor()!;
  const navigate = useNavigate();
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const meta = VIEWS[view];
  const rows = consultations.filter((c) => meta.filter(c, doctor.id) && !isOthersActive(c, doctor.id)).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <PageHero crumb={[{ label: "Consultations", to: "/portal/consultations" }, { label: meta.title }]} title={meta.title} sub={meta.sub} />
      <main className="p-6">
        <Table
          head={["Ref", "Patient", "Complaint", "Language", "Doctor", "Started", "Status"]}
          empty={rows.length ? null : <EmptyRow>Nothing here right now.</EmptyRow>}
        >
          {rows.map((c) => (
            <Row key={c.id} onClick={() => navigate({ to: "/portal/consultations/$id", params: { id: c.id } })}>
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
              <Cell>{doctors.find((d) => d.id === c.prescriberId)?.name ?? "—"}</Cell>
              <Cell mono>{fmtDateTime(c.createdAt)}</Cell>
              <Cell>
                <StatusTag status={c.status} />
              </Cell>
            </Row>
          ))}
        </Table>
      </main>
    </>
  );
}
