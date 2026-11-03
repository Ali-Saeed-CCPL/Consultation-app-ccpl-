/* Side panels shared by the consult room and the review screen: who the
   patient is and what they reported, and this consultation's audit trail. */

import { TriangleAlert } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Section from "@/components/ui/section";
import { DURATIONS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { Consultation } from "@/lib/types";

export function PatientPanel({ consult }: { consult: Consultation }) {
  return (
    <Section title="Patient & intake" sub={`${consult.member.relation === "self" ? "Policyholder" : `Dependant · ${consult.member.relation}`}`}>
      <PatientDetails consult={consult} />
    </Section>
  );
}

/** Who the patient is and what they reported — the panel's body, also used on its own inside a tab. */
export function PatientDetails({ consult }: { consult: Consultation }) {
  const s = consult.symptoms;
  const flags = RED_FLAGS.filter((f) => s?.redFlags.includes(f.key));
  return (
    <>
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
    </>
  );
}

/** The Patient tab in the live call: who they are, what they reported, their past
    visits with us and this consultation's activity — one dense column, no empty card. */
export function PatientTab({ consult }: { consult: Consultation }) {
  const s = consult.symptoms;
  const m = consult.member;
  const flags = RED_FLAGS.filter((f) => s?.redFlags.includes(f.key));
  const severity = s?.severity ?? 0;
  const past = usePlatform((st) => st.consultations)
    .filter((c) => c.member.mrn === m.mrn && c.id !== consult.id && c.callStartedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
  const label = "mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]";

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(m.name)} size={44} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--ink)]">
            {m.name} <span lang="ur" className="ms-1 text-[13px] font-normal text-[var(--mute)]">{m.nameUr}</span>
          </p>
          <p className="text-[12.5px] text-[var(--mute)]">
            {m.relation === "self" ? "Policyholder" : `Dependant · ${m.relation}`} · {m.age} · {m.gender === "M" ? "Male" : "Female"} ·{" "}
            <span className="font-mono">{m.mrn}</span> · {consult.lang === "ur" ? "Urdu" : "English"}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Tile k="Complaint">
          {complaintText(s) || "—"}
          {s?.duration ? <span className="block text-[12px] font-normal text-[var(--mute)]">{DURATIONS.find((d) => d.key === s.duration)?.en}</span> : null}
        </Tile>
        <Tile k="Severity">
          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--hair)]">
              <span className={`block h-full ${severity >= 7 ? "bg-[var(--red)]" : severity >= 4 ? "bg-[var(--amber)]" : "bg-[var(--green)]"}`} style={{ width: `${severity * 10}%` }} />
            </span>
            <span className="font-mono text-[12.5px]">{s?.severity ?? "—"}/10</span>
          </span>
        </Tile>
        <Tile k="Red flags">
          {flags.length ? <span className="text-[var(--red)]">{flags.map((f) => f.en).join(", ")}</span> : <span className="text-[var(--green)]">None</span>}
        </Tile>
      </div>
      {s?.details ? <p className="rounded-(--radius-md) bg-[var(--sunken)] px-3 py-2 text-[13px] italic text-[var(--body)]">"{s.details}"</p> : null}

      <div>
        <p className={label}>Past visits · {past.length}</p>
        {past.length ? (
          <ul className="divide-y divide-[var(--hair)] rounded-(--radius-md) border border-[var(--line)]">
            {past.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--ink)]">{c.notes.diagnosis || complaintText(c.symptoms) || "—"}</span>
                  <span className="font-mono text-[11px] text-[var(--mute)]">
                    {c.id} · {fmtDateTime(c.createdAt)}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[12px] text-[var(--mute)]">{c.rx.map((r) => r.drug.split(" ")[0]).filter(Boolean).join(", ") || "Advice only"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-[var(--faint)]">First consultation with us.</p>
        )}
      </div>

      <div>
        <p className={label}>This consultation</p>
        <TimelineList consultId={consult.id} />
      </div>
    </div>
  );
}

function Tile({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="rounded-(--radius-md) border border-[var(--line)] bg-[var(--sunken)] px-3 py-2">
      <p className="text-[11.5px] text-[var(--mute)]">{k}</p>
      <div className="mt-0.5 text-[13px] font-semibold text-[var(--ink)]">{children}</div>
    </div>
  );
}

export function TimelinePanel({ consultId }: { consultId: string }) {
  const audit = usePlatform((s) => s.audit);
  const events = audit.filter((e) => e.consultId === consultId);
  return (
    <Section title="Audit trail" sub={`${events.length} events`}>
      <TimelineList consultId={consultId} />
    </Section>
  );
}

function TimelineList({ consultId }: { consultId: string }) {
  const audit = usePlatform((s) => s.audit);
  const events = audit.filter((e) => e.consultId === consultId).sort((a, b) => a.at - b.at);
  return (
    <>
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
    </>
  );
}
