/* Side panels shared by the consult room and the review screen: who the
   patient is and what they reported, and this consultation's audit trail. */

import { ChevronDown, History, Info, ListChecks, Pill, ShieldAlert, Stethoscope, Thermometer, TriangleAlert } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Section from "@/components/ui/section";
import { DURATIONS, RED_FLAGS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { allergiesText, bmi, bmiBand, conditionName, conditionsText, considerations, medicinesText } from "@/lib/profile";
import { fmtDateTime, fmtTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { Consultation, HealthProfile } from "@/lib/types";

/** The health profile the patient confirmed at intake, else the one on their Members page. */
export const useHealthProfile = (consult: Consultation): HealthProfile | undefined =>
  usePlatform((s) => consult.profile ?? s.profiles[consult.member.id]);

/** Allergies up front (red when there are any), then conditions, medicines and the rest. */
export function HealthHistory({ consult }: { consult: Consultation }) {
  const p = useHealthProfile(consult);
  const allergies = allergiesText(p);
  const index = bmi(p);
  const extra = [
    p?.pregnant === "yes" ? "Pregnant" : p?.pregnant === "unsure" ? "May be pregnant" : "",
    p?.bloodGroup && p.bloodGroup !== "unknown" ? `Blood ${p.bloodGroup}` : "",
    index ? `BMI ${index}` : "",
    p?.smoking === "current" ? "Smoker" : p?.smoking === "former" ? "Ex-smoker" : "",
  ].filter(Boolean);
  const rows: [string, string | null | undefined][] = [
    ["Conditions", conditionsText(p)],
    ["Regular meds", medicinesText(p)],
    ["Past history", p?.history],
    ["Family", p?.family.length ? p.family.map((k) => conditionName({ key: k })).join(", ") : ""],
  ];
  return (
    <div className="grid gap-2">
      <p
        className={`flex items-start gap-2 rounded-(--radius-md) px-3 py-2 text-[12.5px] font-semibold ${
          allergies ? "bg-[var(--red-tint)] text-[var(--color-red-ink)]" : p?.allergies ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
        }`}
      >
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
        {allergies ? `Allergies: ${allergies}` : p?.allergies ? "No known allergies" : "Allergies not recorded — ask the patient"}
      </p>
      {p ? (
        <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--mute)]">{k}</dt>
              <dd className={v ? "text-[var(--ink)]" : "text-[var(--faint)]"}>{v || (k === "Conditions" || k === "Regular meds" ? (v === "" ? "None" : "Not recorded") : "—")}</dd>
            </div>
          ))}
          {extra.length ? (
            <>
              <dt className="text-[var(--mute)]">Also</dt>
              <dd className="text-[var(--ink)]">{extra.join(" · ")}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      <p className="text-[11.5px] text-[var(--faint)]">{consult.profileConfirmed
          ? "Confirmed by the patient at intake"
          : p
            ? "From the patient's Members page — not confirmed for this visit"
            : "Not given before the call — ask about conditions, allergies and regular medicines"}</p>
    </div>
  );
}

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
      <p className="mb-2 mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Health history</p>
      <HealthHistory consult={consult} />
    </>
  );
}

/** The Patient tab in the live call — one clinical summary for prescribing: who the patient is with
    their measurements, allergies, today's complaint, what to weigh before prescribing, their medical
    history, past visits with us, and (folded away) this consultation's activity. */
export function PatientTab({ consult }: { consult: Consultation }) {
  const m = consult.member;
  const s = consult.symptoms;
  const p = useHealthProfile(consult);
  const doctors = usePlatform((st) => st.doctors);
  const past = usePlatform((st) => st.consultations)
    .filter((c) => c.member.mrn === m.mrn && c.id !== consult.id && c.callStartedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
  const eventCount = usePlatform((st) => st.audit.filter((e) => e.consultId === consult.id).length);
  const flags = RED_FLAGS.filter((f) => s?.redFlags.includes(f.key));
  const severity = s?.severity ?? 0;
  const index = bmi(p);
  const notes = considerations(p, m).filter((n) => n.level !== "danger"); // allergies have their own banner
  const allergies = p?.allergies;
  const thisYear = new Date().getFullYear();
  const source = consult.profileConfirmed
    ? { tone: "ok", text: "Profile confirmed at intake" }
    : p
      ? { tone: "neutral", text: `Profile from ${p.updatedAt ? fmtDate(p.updatedAt) : "Members page"} · not confirmed` }
      : { tone: "warn", text: "No health profile — ask" };

  const stats: [string, string][] = [
    ["Age", `${m.age} yrs`],
    ["Sex", m.gender === "M" ? "Male" : "Female"],
    ["Weight", p?.weightKg ? `${p.weightKg} kg` : "—"],
    ["Height", p?.heightCm ? `${p.heightCm} cm` : "—"],
    ["BMI", index ? `${index} · ${BMI_WORD[bmiBand(index)]}` : "—"],
    ["Blood", p?.bloodGroup && p.bloodGroup !== "unknown" ? p.bloodGroup : "—"],
  ];
  const lifestyle = [
    p?.pregnant ? `Pregnant: ${p.pregnant === "yes" ? "yes" : p.pregnant === "no" ? "no" : "not sure"}` : "",
    p?.smoking ? (p.smoking === "current" ? "Smokes" : p.smoking === "former" ? "Ex-smoker" : "Non-smoker") : "",
  ].filter(Boolean);

  return (
    <div className="grid gap-4">
      {/* ── Identity & measurements ───────────────────────────── */}
      <section className="overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)]">
        <div className="flex flex-wrap items-center gap-3.5 px-4 py-3.5">
          <Avatar initials={initialsOf(m.name)} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-[var(--ink)]">
              {m.name}{" "}
              <span lang="ur" className="ms-1 text-[13px] font-normal text-[var(--mute)]">
                {m.nameUr}
              </span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--mute)]">
              <span className="rounded-(--radius-sm) bg-[var(--sunken)] px-1.5 py-px font-semibold text-[var(--body)]">{m.relation === "self" ? "Policyholder" : `Dependant · ${m.relation}`}</span>
              <span className="font-mono">{m.mrn}</span>
              <span>·</span>
              <span>Speaks {consult.lang === "ur" ? "Urdu" : "English"}</span>
              {lifestyle.length ? (
                <>
                  <span>·</span>
                  <span>{lifestyle.join(" · ")}</span>
                </>
              ) : null}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-(--radius-pill) px-2.5 py-1 text-[11.5px] font-semibold ${
              source.tone === "ok" ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : source.tone === "warn" ? "bg-[var(--amber-tint)] text-[var(--amber-ink)]" : "bg-[var(--sunken)] text-[var(--mute)]"
            }`}
          >
            <Info size={12} /> {source.text}
          </span>
        </div>
        <dl className="grid grid-cols-3 border-t border-[var(--hair)] bg-[var(--sunken)] sm:grid-cols-6">
          {stats.map(([k, v], i) => (
            <div key={k} className={`px-4 py-2.5 ${i % 3 ? "border-s border-[var(--hair)]" : ""} ${i >= 3 ? "border-t border-[var(--hair)] sm:border-t-0" : ""} ${i === 3 ? "sm:border-s" : ""}`}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)]">{k}</dt>
              <dd className="mt-0.5 truncate text-[13.5px] font-semibold text-[var(--ink)]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Allergies ─────────────────────────────────────────── */}
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-(--radius-card) border px-4 py-3 ${
          allergies?.length ? "border-[var(--color-danger-border)] bg-[var(--red-tint)]" : allergies ? "border-[var(--line)] bg-[var(--white)]" : "border-[var(--line)] bg-[var(--amber-tint)]"
        }`}
      >
        <span
          className={`flex items-center gap-2 text-[13px] font-semibold ${allergies?.length ? "text-[var(--color-red-ink)]" : allergies ? "text-[var(--color-green-ink)]" : "text-[var(--amber-ink)]"}`}
        >
          <ShieldAlert size={16} />
          {allergies?.length ? "Allergies" : allergies ? "No known allergies" : "Allergies not recorded — ask before prescribing"}
        </span>
        {allergies?.map((a) => (
          <span key={a.name} className="inline-flex items-center gap-1.5 rounded-(--radius-md) border border-[var(--color-danger-border)] bg-[var(--white)] px-2.5 py-1 text-[12.5px]">
            <span className="font-semibold text-[var(--color-red-ink)]">{a.name}</span>
            {a.reaction ? <span className="text-[var(--body)]">· {a.reaction}</span> : null}
            <span className="text-[11px] text-[var(--mute)]">({a.kind})</span>
          </span>
        ))}
      </div>

      {/* ── Today's visit ─────────────────────────────────────── */}
      <Card icon={<Thermometer size={14} />} title="Today's visit" aside={<span className="font-mono">{fmtDateTime(consult.createdAt)}</span>}>
        <dl className="grid gap-x-6 text-[13px] sm:grid-cols-2">
          <Row k="Complaint">
            <span className="font-semibold">{complaintText(s) || "—"}</span>
          </Row>
          <Row k="How long">{s?.duration ? DURATIONS.find((d) => d.key === s.duration)?.en : "—"}</Row>
          <Row k="Severity">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--hair)]">
                <span className={`block h-full ${severity >= 7 ? "bg-[var(--red)]" : severity >= 4 ? "bg-[var(--amber)]" : "bg-[var(--green)]"}`} style={{ width: `${severity * 10}%` }} />
              </span>
              <span className="font-mono text-[12.5px]">{s?.severity ?? "—"}/10</span>
            </span>
          </Row>
          <Row k="Red flags">{flags.length ? <span className="font-semibold text-[var(--red)]">{flags.map((f) => f.en).join(", ")}</span> : <span className="text-[var(--green)]">None</span>}</Row>
          {s?.details ? (
            <div className="sm:col-span-2">
              <Row k="In their words">
                <span className="italic text-[var(--body)]">“{s.details}”</span>
              </Row>
            </div>
          ) : null}
        </dl>
      </Card>

      {/* ── Before you prescribe ──────────────────────────────── */}
      {notes.length ? (
        <Card icon={<TriangleAlert size={14} />} title="Before you prescribe">
          <ul className="grid gap-2">
            {notes.map((n) => (
              <li key={n.text} className="flex items-start gap-2.5 text-[13px] text-[var(--ink)]">
                <span className={`mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${n.level === "caution" ? "bg-[var(--amber)]" : "bg-[var(--link)]"}`} />
                {n.text}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* ── Medical history ───────────────────────────────────── */}
      <Card icon={<Stethoscope size={14} />} title="Medical history">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <p className={SUB}>Long-term conditions</p>
            {p?.conditions?.length ? (
              <ul className="divide-y divide-[var(--hair)]">
                {p.conditions.map((c) => (
                  <li key={c.key} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                    <span className="font-semibold text-[var(--ink)]">{conditionName(c)}</span>
                    <span className="text-[12px] text-[var(--mute)]">{c.since ? `since ${c.since} · ${Math.max(0, thisYear - Number(c.since))} yrs` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{p?.conditions ? "None" : "Not recorded"}</Muted>
            )}
          </div>
          <div>
            <p className={SUB}>Regular medicines</p>
            {p?.medicines?.length ? (
              <ul className="divide-y divide-[var(--hair)]">
                {p.medicines.map((x) => (
                  <li key={x.name} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                      <Pill size={12} className="text-[var(--mute)]" /> {x.name}
                    </span>
                    <span className="text-[12px] text-[var(--mute)]">{x.dose}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{p?.medicines ? "None" : "Not recorded"}</Muted>
            )}
          </div>
          <div>
            <p className={SUB}>Operations &amp; hospital stays</p>
            {p?.history ? <p className="text-[13px] text-[var(--ink)]">{p.history}</p> : <Muted>None given</Muted>}
          </div>
          <div>
            <p className={SUB}>Family history</p>
            {p?.family.length ? <p className="text-[13px] text-[var(--ink)]">{p.family.map((k) => conditionName({ key: k })).join(", ")}</p> : <Muted>None given</Muted>}
          </div>
        </div>
      </Card>

      {/* ── Past visits ───────────────────────────────────────── */}
      <Card icon={<History size={14} />} title="Past visits with us" aside={past.length ? `${past.length}` : undefined} flush>
        {past.length ? (
          <ul className="divide-y divide-[var(--hair)]">
            {past.slice(0, 6).map((c) => (
              <li key={c.id} className="grid gap-1 px-4 py-2.5 text-[13px] sm:grid-cols-[110px_1fr]">
                <span className="font-mono text-[11.5px] text-[var(--mute)]">{fmtDate(c.createdAt)}</span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[var(--ink)]">{c.notes.diagnosis || complaintText(c.symptoms) || "—"}</span>
                  <span className="block text-[12px] text-[var(--mute)]">
                    {c.rx.length ? c.rx.map((r) => r.drug).join(" · ") : "Advice only"} · {doctors.find((d) => d.id === c.prescriberId)?.name ?? "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-[13px] text-[var(--faint)]">First consultation with us.</p>
        )}
      </Card>

      {/* ── Activity, folded away ─────────────────────────────── */}
      <details className="group rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-[var(--ink)]">
          <ListChecks size={14} className="text-[var(--mute)]" /> Consultation activity
          <span className="font-mono text-[11.5px] font-normal text-[var(--mute)]">{eventCount} events</span>
          <ChevronDown size={15} className="ms-auto text-[var(--mute)] transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[var(--hair)] px-4 py-3">
          <TimelineList consultId={consult.id} />
        </div>
      </details>
    </div>
  );
}

const BMI_WORD = { under: "underweight", normal: "healthy", over: "overweight", obese: "obese" } as const;
const SUB = "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)]";
const fmtDate = (at: number) => new Date(at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

function Card({ icon, title, aside, flush, children }: { icon: React.ReactNode; title: string; aside?: React.ReactNode; flush?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)]">
      <header className="flex items-center gap-2 border-b border-[var(--hair)] px-4 py-2.5">
        <span className="text-[var(--mute)]">{icon}</span>
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">{title}</h3>
        {aside ? <span className="ms-auto text-[11.5px] text-[var(--mute)]">{aside}</span> : null}
      </header>
      <div className={flush ? "" : "px-4 py-3"}>{children}</div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-baseline gap-3 border-b border-[var(--hair)] py-2 last:border-b-0">
      <dt className="text-[12px] text-[var(--mute)]">{k}</dt>
      <dd className="min-w-0 text-[var(--ink)]">{children}</dd>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[var(--faint)]">{children}</p>;
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

/** One line at the top of the Prescription tab: allergies, conditions and regular medicines at a glance. */
export function HistoryStrip({ consult, onOpen }: { consult: Consultation; onOpen: () => void }) {
  const p = useHealthProfile(consult);
  const allergies = allergiesText(p);
  const conditions = conditionsText(p);
  const medicines = medicinesText(p);
  const bits = [conditions ?? "", medicines ? `on ${medicines}` : "", consult.member.age < 12 && p?.weightKg ? `${p.weightKg} kg` : ""].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mb-3 flex w-full items-start gap-2 rounded-(--radius-md) border px-3 py-2 text-start text-[12.5px] ${
        allergies ? "border-[var(--color-danger-border)] bg-[var(--red-tint)]" : "border-[var(--line)] bg-[var(--sunken)] hover:border-[var(--sky-300)]"
      }`}
    >
      <ShieldAlert size={14} className={`mt-0.5 flex-shrink-0 ${allergies ? "text-[var(--red)]" : "text-[var(--mute)]"}`} />
      <span className="min-w-0 flex-1">
        <span className={`font-semibold ${allergies ? "text-[var(--color-red-ink)]" : "text-[var(--ink)]"}`}>
          {allergies ? `Allergies: ${allergies}` : p?.allergies ? "No known allergies" : "Allergies not recorded"}
        </span>
        {bits.length ? <span className="text-[var(--body)]"> · {bits.join(" · ")}</span> : null}
      </span>
      <span className="flex-shrink-0 font-semibold text-[var(--link)]">Full history →</span>
    </button>
  );
}
