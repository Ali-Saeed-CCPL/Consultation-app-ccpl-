/* Live incoming calls — every patient ringing a GP or waiting for one, with a
   ticking wait. A call ringing this doctor can be answered or let go from
   here; a queued one can be taken if the doctor is free. */

import { useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff, Radio } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import { complaintText } from "@/lib/complaint";
import { fmtDuration, isOthersActive } from "@/lib/clinic";
import { useNow } from "@/lib/use-now";
import { usePlatform } from "@/store/consult-store";
import type { Consultation, Doctor } from "@/lib/types";

export default function LiveCalls({ doctor }: { doctor: Doctor }) {
  const navigate = useNavigate();
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const { acceptCall, declineCall } = usePlatform.getState();
  const now = useNow(1000);

  const calls = consultations
    .filter((c) => (c.status === "ringing" || c.status === "queued") && !isOthersActive(c, doctor.id))
    .sort((a, b) => Number(b.status === "ringing") - Number(a.status === "ringing") || a.createdAt - b.createdAt);
  const ringing = calls.filter((c) => c.status === "ringing").length;
  const iAmBusy = consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);
  const canTake = doctor.available && !iAmBusy;

  const openLive = () => navigate({ to: "/portal/consultations", search: { view: "live" } });

  const answer = (c: Consultation) => {
    acceptCall(c.id, doctor.id);
    navigate({ to: "/portal/consultations/$id", params: { id: c.id } });
  };

  return (
    <div className="flex h-full min-h-[236px] flex-col rounded-(--radius-lg) border border-[var(--line)]">
      <button
        type="button"
        onClick={openLive}
        className="flex items-center justify-between gap-2 rounded-t-(--radius-lg) border-b border-[var(--hair)] px-4 py-2.5 text-left hover:bg-[var(--sunken)]"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
          {calls.length ? <span className="live-dot" /> : <Radio size={14} className="text-[var(--faint)]" />} Live incoming calls
        </span>
        <span className="font-mono text-[11.5px] text-[var(--mute)]">
          {ringing} ringing · {calls.length - ringing} waiting · <span className="font-sans font-semibold text-[var(--link)]">Open →</span>
        </span>
      </button>

      {calls.length === 0 ? (
        <div onClick={openLive} className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sunken)] text-[var(--faint)]">
            <Phone size={16} />
          </span>
          <p className="text-[13px] text-[var(--mute)]">
            Listening for calls. A new patient rings the first free GP{doctor.available ? "" : " — you're unavailable"}.
          </p>
        </div>
      ) : (
        <ul className="max-h-[300px] flex-1 divide-y divide-[var(--hair)] overflow-y-auto">
          {calls.map((c) => {
            const isRinging = c.status === "ringing";
            const forMe = isRinging && c.prescriberId === doctor.id;
            const rung = doctors.find((d) => d.id === c.prescriberId);
            const tint = isRinging ? "var(--green)" : "var(--amber)";
            return (
              <li
                key={c.id}
                onClick={openLive}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 line-in ${forMe ? "bg-[var(--green-tint)]" : "hover:bg-[var(--sunken)]"}`}
              >
                <span className="relative inline-flex flex-shrink-0">
                  <span className="ring-halo" style={{ background: tint }} />
                  {isRinging ? <span className="ring-halo delay" style={{ background: tint }} /> : null}
                  <Avatar initials={initialsOf(c.member.name)} size={36} className="relative" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--ink)]">{c.member.name}</div>
                  <div className="truncate text-[12px] text-[var(--mute)]">
                    {complaintText(c.symptoms) || "—"} · {c.lang === "ur" ? "Urdu" : "English"}
                  </div>
                  <div className={`mt-0.5 text-[11.5px] font-medium ${isRinging ? "text-[var(--color-green-ink)]" : "text-[var(--amber-ink)]"}`}>
                    {forMe ? "Ringing you" : isRinging ? `Ringing ${rung?.name ?? "a GP"}` : "Waiting for a free GP"} ·{" "}
                    <span className="font-mono">{fmtDuration(now - (c.consentAt ?? c.createdAt))}</span>
                  </div>
                </div>
                {forMe ? (
                  <div className="flex flex-shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Let the call from ${c.member.name} go`}
                      onClick={() => declineCall(c.id, doctor.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--red)] text-white hover:brightness-110"
                    >
                      <PhoneOff size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Answer ${c.member.name}`}
                      onClick={() => answer(c)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--green)] text-white hover:brightness-110"
                    >
                      <Phone size={14} />
                    </button>
                  </div>
                ) : !isRinging && canTake ? (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      answer(c);
                    }}
                  >
                    <Phone size={13} /> Take
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
