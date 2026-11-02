/* Today's scheduled calls — booked follow-ups and patients' call backs, as a
   queue in time order with a countdown to each. Upcoming by default; "All
   today" brings back the ones already done. */

import { useState } from "react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Section from "@/components/ui/section";
import Tag from "@/components/ui/tag";
import { Cell, Row } from "@/components/ui/table";
import { SCHEDULED_TODAY } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, clinicToday, fmtTime } from "@/lib/clinic";
import { useNow } from "@/lib/use-now";
import { usePlatform } from "@/store/consult-store";
import type { Doctor } from "@/lib/types";

type Slot = { id: string; name: string; at: number; kind: "Follow-up" | "Call back"; doctorId?: string; reason: string };

const DUE_WINDOW = 15 * 60_000;
const HEAD = ["#", "Time", "Patient", "Reason", "Type", "Doctor", "Status"];

export default function ScheduledCalls({ doctor }: { doctor: Doctor }) {
  const now = useNow(30_000);
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const [view, setView] = useState<"upcoming" | "all">("upcoming");

  const dayStart = clinicToday(CLINIC_HOURS.open, 0, now);
  const dayEnd = clinicToday(CLINIC_HOURS.close, 0, now);
  const slots: Slot[] = [
    ...SCHEDULED_TODAY.map((s) => ({ ...s, at: clinicToday(s.at[0], s.at[1], now) })),
    ...consultations
      .filter((c) => c.status === "callback" && c.callbackAt && c.callbackAt >= dayStart && c.callbackAt < dayEnd)
      .map((c) => ({ id: c.id, name: c.member.name, at: c.callbackAt!, kind: "Call back" as const, reason: complaintText(c.symptoms) || "Call back" })),
  ].sort((a, b) => a.at - b.at);

  const isDone = (s: Slot) => s.at + DUE_WINDOW < now;
  const done = slots.filter(isDone).length;
  const mine = slots.filter((s) => s.doctorId === doctor.id).length;
  const rows = view === "upcoming" ? slots.filter((s) => !isDone(s)) : slots;
  const docName = (id?: string) => (id ? (doctors.find((d) => d.id === id)?.name ?? "—") : "First free GP");

  return (
    <Section
      className="mt-5"
      title="Today's scheduled calls"
      sub={`${slots.length} booked · ${done} done · ${slots.length - done} still to come · ${mine} with you`}
      bodyClassName="!px-0 !pb-0"
      action={
        <div className="flex rounded-(--radius-pill) border border-[var(--line)] p-0.5 text-[12px] font-semibold">
          {(["upcoming", "all"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-(--radius-pill) px-3 py-1 ${view === v ? "bg-[var(--link)] text-white" : "text-[var(--mute)] hover:text-[var(--ink)]"}`}
            >
              {v === "upcoming" ? `Upcoming (${slots.length - done})` : `All today (${slots.length})`}
            </button>
          ))}
        </div>
      }
    >
      <div className="max-h-[360px] overflow-auto border-t border-[var(--line)]">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-[1] bg-(--color-surface)">
            <tr>
              {HEAD.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap border-b border-[var(--line)] px-4 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mute)] first:pl-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const past = isDone(s);
              const due = !past && s.at <= now + DUE_WINDOW;
              return (
                <Row key={s.id}>
                  <Cell mono className={`pl-5 ${past ? "opacity-55" : ""}`}>
                    {i + 1}
                  </Cell>
                  <Cell mono strong className={past ? "opacity-55" : due ? "!text-[var(--amber-ink)]" : ""}>
                    {fmtTime(s.at)}
                  </Cell>
                  <Cell className={past ? "opacity-55" : ""}>
                    <span className="flex items-center gap-2.5">
                      <Avatar initials={initialsOf(s.name)} size={28} />
                      <span className="font-semibold text-[var(--ink)]">
                        {s.name} {s.doctorId === doctor.id ? <span className="font-normal text-[var(--mute)]">(you)</span> : null}
                      </span>
                    </span>
                  </Cell>
                  <Cell className={past ? "opacity-55" : ""}>{s.reason}</Cell>
                  <Cell className={past ? "opacity-55" : ""}>{s.kind}</Cell>
                  <Cell className={past ? "opacity-55" : ""}>{docName(s.doctorId)}</Cell>
                  <Cell>{past ? <Tag tone="ok">Done</Tag> : due ? <Tag tone="warn">Due now</Tag> : <Tag tone="neutral">in {untilText(s.at - now)}</Tag>}</Cell>
                </Row>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-10 text-center text-[13px] text-[var(--mute)]">No more calls booked today.</p> : null}
      </div>
    </Section>
  );
}

function untilText(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
