/* Audit log — every step of every journey writes here: who, what, when. */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import { Cell, EmptyRow, Row, Table } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { AuditEvent } from "@/lib/types";

const ROLE_CLS: Record<AuditEvent["actorRole"], string> = {
  patient: "j-teal",
  platform: "j-violet",
  ai: "j-amber",
  doctor: "j-green",
  support: "j-red",
};

export default function AuditScreen() {
  const audit = usePlatform((s) => s.audit);
  const consultations = usePlatform((s) => s.consultations);
  const consultIds = useMemo(() => new Set(consultations.map((c) => c.id)), [consultations]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<AuditEvent["actorRole"] | "all">("all");
  const needle = q.trim().toLowerCase();
  const rows = audit
    .filter((e) => role === "all" || e.actorRole === role)
    .filter((e) => !needle || [e.consultId, e.actor, e.action, e.detail ?? ""].some((s) => s.toLowerCase().includes(needle)))
    .sort((a, b) => b.at - a.at);

  return (
    <>
      <PageHero
        crumb={[{ label: "Audit log" }]}
        title="Audit log"
        sub="Append-only. Every sign-in, consultation started, consent, call, AI draft, approval and release is recorded."
      />
      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
            <input
              className="field-input w-[280px] py-2 pl-8 text-[13px]"
              placeholder="Search ref, person or action…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {(["all", "patient", "platform", "ai", "doctor", "support"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-(--radius-pill) border px-3 py-1.5 text-[12.5px] font-semibold capitalize ${
                role === r ? "border-[var(--sky-300)] bg-[var(--primary)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--white)] text-[var(--mute)] hover:text-[var(--ink)]"
              }`}
            >
              {r}
            </button>
          ))}
          <span className="ml-auto font-mono text-[12px] text-[var(--mute)]">{rows.length} events</span>
        </div>
        <Table head={["When", "Ref", "Actor", "Role", "Action", "Detail"]} empty={rows.length ? null : <EmptyRow>No events match.</EmptyRow>}>
          {rows.map((e) => (
            <Row key={e.id}>
              <Cell mono className="whitespace-nowrap">
                {fmtDateTime(e.at)}
              </Cell>
              <Cell mono strong>
                {consultIds.has(e.consultId) ? (
                  <Link to="/portal/consultations/$id" params={{ id: e.consultId }}>
                    {e.consultId}
                  </Link>
                ) : (
                  e.consultId
                )}
              </Cell>
              <Cell strong>{e.actor}</Cell>
              <Cell>
                <span className={`jc ${ROLE_CLS[e.actorRole]} inline-block !px-2 !py-0.5`}>
                  <span className="i uppercase tracking-[0.08em]">{e.actorRole}</span>
                </span>
              </Cell>
              <Cell>{e.action}</Cell>
              <Cell className="text-[var(--mute)]">{e.detail ?? "—"}</Cell>
            </Row>
          ))}
        </Table>
      </main>
    </>
  );
}
