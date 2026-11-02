/* Side panels shared by the consult room and the review screen: who the
   patient is and what they reported, and this consultation's audit trail. */

import { TriangleAlert } from "lucide-react";
import Section from "@/components/ui/section";
import { DURATIONS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { Consultation } from "@/lib/types";

export function PatientPanel({ consult }: { consult: Consultation }) {
  const s = consult.symptoms;
  const flags = RED_FLAGS.filter((f) => s?.redFlags.includes(f.key));
  return (
    <Section title="Patient & intake" sub={`${consult.member.relation === "self" ? "Policyholder" : `Dependant · ${consult.member.relation}`}`}>
      <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
        <dt className="text-[var(--mute)]">Name</dt>
        <dd className="font-semibold text-[var(--ink)]">
          {consult.member.name} <span lang="ur" className="ms-1 text-[13px] font-normal text-[var(--mute)]">{consult.member.nameUr}</span>
        </dd>
        <dt className="text-[var(--mute)]">Age / sex</dt>
        <dd className="text-[var(--ink)]">
          {consult.member.age} · {consult.member.gender === "M" ? "Male" : "Female"}
        </dd>
        <dt className="text-[var(--mute)]">MRN</dt>
        <dd className="font-mono text-[12.5px] text-[var(--ink)]">{consult.member.mrn}</dd>
        <dt className="text-[var(--mute)]">Language</dt>
        <dd className="text-[var(--ink)]">{consult.lang === "ur" ? "Urdu" : "English"}</dd>
        <dt className="text-[var(--mute)]">Consent</dt>
        <dd className="text-[var(--ink)]">{consult.consentAt ? `Video + transcript · ${fmtTime(consult.consentAt)}` : "—"}</dd>
        <dt className="text-[var(--mute)]">Complaint</dt>
        <dd className="text-[var(--ink)]">
          {complaintText(s) || "—"}
          {s?.duration ? <span className="text-[var(--mute)]"> · {DURATIONS.find((d) => d.key === s.duration)?.en}</span> : null}
        </dd>
        <dt className="text-[var(--mute)]">Severity</dt>
        <dd>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--hair)]">
              <span
                className={`block h-full ${(s?.severity ?? 0) >= 7 ? "bg-[var(--red)]" : (s?.severity ?? 0) >= 4 ? "bg-[var(--amber)]" : "bg-[var(--green)]"}`}
                style={{ width: `${(s?.severity ?? 0) * 10}%` }}
              />
            </span>
            <span className="font-mono text-[12.5px] text-[var(--ink)]">{s?.severity ?? "—"}/10</span>
          </span>
        </dd>
        {s?.details ? (
          <>
            <dt className="text-[var(--mute)]">In their words</dt>
            <dd className="text-[var(--body)]">"{s.details}"</dd>
          </>
        ) : null}
      </dl>
      {flags.length ? (
        <p className="mt-3 flex items-center gap-2 rounded-(--radius-md) bg-[var(--red-tint)] px-3 py-2 text-[12.5px] font-semibold text-[var(--color-red-ink)]">
          <TriangleAlert size={14} /> Red flags: {flags.map((f) => f.en).join(", ")}
        </p>
      ) : null}
    </Section>
  );
}

export function TimelinePanel({ consultId }: { consultId: string }) {
  const audit = usePlatform((s) => s.audit);
  const events = audit.filter((e) => e.consultId === consultId).sort((a, b) => a.at - b.at);
  return (
    <Section title="Audit trail" sub={`${events.length} events`}>
      {events.length === 0 ? (
        <p className="text-[12.5px] text-[var(--mute)]">No events yet.</p>
      ) : (
        <ol className="relative ms-1.5 border-s border-[var(--line)]">
          {events.map((e) => (
            <li key={e.id} className="relative ps-4 pb-3 last:pb-0">
              <span className="absolute -start-[4.5px] top-1.5 h-2 w-2 rounded-full bg-[var(--sky-300)] ring-2 ring-[var(--white)]" />
              <div className="text-[13px] font-semibold text-[var(--ink)]">{e.action}</div>
              <div className="text-[12px] text-[var(--mute)]">
                {e.actor} · <span className="font-mono">{fmtDateTime(e.at)}</span>
              </div>
              {e.detail ? <div className="text-[12px] text-[var(--body)]">{e.detail}</div> : null}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
