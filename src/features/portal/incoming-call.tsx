/* Incoming call — rings over whatever screen the doctor has open, like
   WhatsApp Web. In production the backend pushes this over the portal's
   WebSocket; here the shared store does (store/consult-store.ts). */

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import { DURATIONS } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { usePlatform } from "@/store/consult-store";
import type { Consultation } from "@/lib/types";

/** A soft two-tone ring, every two seconds, while the card is up. */
function useRingTone(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const ring = () => {
      if (!ctx || ctx.state !== "running") return;
      [0, 0.22].forEach((offset, i) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.frequency.value = i ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, ctx!.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx!.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx!.currentTime + offset + 0.18);
        osc.connect(gain).connect(ctx!.destination);
        osc.start(ctx!.currentTime + offset);
        osc.stop(ctx!.currentTime + offset + 0.2);
      });
    };
    void ctx.resume().then(ring).catch(() => {});
    const timer = window.setInterval(ring, 2000);
    return () => {
      window.clearInterval(timer);
      void ctx?.close();
    };
  }, [on]);
}

export default function IncomingCall({ consult, doctorId }: { consult: Consultation | undefined; doctorId: string }) {
  const navigate = useNavigate();
  const acceptCall = usePlatform((s) => s.acceptCall);
  const declineCall = usePlatform((s) => s.declineCall);
  useRingTone(Boolean(consult));

  if (!consult) return null;
  const complaint = complaintText(consult.symptoms) || "—";
  const duration = DURATIONS.find((d) => d.key === consult.symptoms?.duration)?.en ?? "";

  return (
    <div className="fixed inset-0 z-[60000] flex items-end justify-end p-6 pointer-events-none">
      <div
        role="alertdialog"
        aria-label={`Incoming call from ${consult.member.name}`}
        className="pointer-events-auto w-[360px] overflow-hidden rounded-(--radius-xl) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-menu) line-in"
      >
        <div className="flex items-center justify-between bg-[var(--green-tint)] px-4 py-2.5">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-green-ink)]">
            <Video size={13} /> Incoming video consult
          </span>
          <span className="font-mono text-[11px] text-[var(--color-green-ink)]">{consult.id}</span>
        </div>
        <div className="flex items-center gap-4 px-5 pt-5">
          <span className="relative inline-flex">
            <span className="ring-halo" />
            <span className="ring-halo delay" />
            <Avatar initials={initialsOf(consult.member.name)} size={56} className="relative" />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-[var(--ink)]">{consult.member.name}</div>
            <div className="text-[12.5px] text-[var(--mute)]">
              {consult.member.age} yrs · {consult.member.gender === "M" ? "Male" : "Female"} · speaks {consult.lang === "ur" ? "Urdu" : "English"}
            </div>
          </div>
        </div>
        <dl className="mx-5 mt-4 grid grid-cols-[88px_1fr] gap-y-1.5 rounded-(--radius-md) bg-[var(--sunken)] px-3 py-2.5 text-[12.5px]">
          <dt className="text-[var(--mute)]">Complaint</dt>
          <dd className="text-[var(--ink)] font-medium">
            {complaint}
            {duration ? <span className="text-[var(--mute)] font-normal"> · {duration}</span> : null}
          </dd>
          <dt className="text-[var(--mute)]">Severity</dt>
          <dd className="font-mono text-[var(--ink)]">{consult.symptoms?.severity ?? "—"}/10</dd>
          {consult.symptoms?.details ? (
            <>
              <dt className="text-[var(--mute)]">Notes</dt>
              <dd className="text-[var(--body)]">{consult.symptoms.details}</dd>
            </>
          ) : null}
        </dl>
        <div className="flex gap-2 px-5 py-4">
          <button
            type="button"
            onClick={() => declineCall(consult.id, doctorId)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] px-4 py-2.5 text-[13px] font-semibold text-[var(--body)] hover:border-[var(--red)] hover:text-[var(--red)]"
          >
            <PhoneOff size={15} /> Later
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              acceptCall(consult.id, doctorId);
              navigate({ to: "/portal/consultations/$id", params: { id: consult.id } });
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-(--radius-md) border border-[var(--green)] bg-[var(--green)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-on-fill)] hover:brightness-110"
          >
            <Phone size={15} /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
