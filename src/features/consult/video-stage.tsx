/* Video stage — stands in for the LiveKit room both sides join. Browsers talk
   to the video server directly; the backend only issues the tokens. Here the
   remote feed is a dark tile with the other person's initials and the self
   view a picture-in-picture, both kept dark in either theme. */

import { useEffect, useState, type ReactNode } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import SelfVideo from "@/features/consult/self-video";
import { useLocalMedia } from "@/features/consult/use-local-media";
import { fmtDuration } from "@/lib/clinic";

export default function VideoStage({
  remoteName,
  remoteInitials,
  remoteSub,
  selfLabel,
  selfInitials,
  startedAt,
  caption,
  labels,
  onLeave,
  leaveLabel,
  overlay,
  className = "",
}: {
  remoteName: string;
  remoteInitials: string;
  remoteSub?: string;
  selfLabel: string;
  selfInitials: string;
  startedAt?: number;
  /** Live caption under the remote feed (the latest transcript line). */
  caption?: ReactNode;
  labels: { mute: string; unmute: string; camOff: string; camOn: string; live: string };
  onLeave: () => void;
  leaveLabel: string;
  overlay?: ReactNode;
  className?: string;
}) {
  // This device's real camera and mic.
  const media = useLocalMedia();
  const muted = !media.micOn || !media.hasAudio;
  const camOff = !media.camOn || !media.hasVideo;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`video-tile relative overflow-hidden rounded-(--radius-xl) ${className}`} dir="ltr">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="inline-flex items-center gap-2 rounded-(--radius-pill) bg-black/35 px-2.5 py-1 text-[11.5px] font-semibold">
          <span className="live-dot" /> {labels.live}
        </span>
        {startedAt ? (
          <span className="rounded-(--radius-pill) bg-black/35 px-2.5 py-1 font-mono text-[12px]">{fmtDuration(now - startedAt)}</span>
        ) : null}
      </div>

      {/* remote */}
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-4 pb-20 pt-12">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 font-mono text-[30px] font-semibold ring-1 ring-white/20">
          {remoteInitials}
        </span>
        <div className="text-center">
          <div className="text-[16px] font-semibold">{remoteName}</div>
          {remoteSub ? <div className="text-[12.5px] text-white/70">{remoteSub}</div> : null}
        </div>
      </div>

      {caption ? (
        <div className="absolute inset-x-4 bottom-[76px] z-10 flex justify-center">
          <div className="max-w-[90%] rounded-(--radius-md) bg-black/55 px-3 py-1.5 text-center text-[13.5px] leading-relaxed">{caption}</div>
        </div>
      ) : null}

      {/* self view */}
      <div className="absolute bottom-[76px] right-4 z-0 flex aspect-video w-[200px] flex-col items-center justify-center gap-1 overflow-hidden rounded-(--radius-lg) bg-black/40 ring-1 ring-white/15 max-sm:hidden">
        {media.stream && !camOff ? (
          <SelfVideo stream={media.stream} className="absolute inset-0 rounded-(--radius-lg)" />
        ) : camOff ? (
          <VideoOff size={18} className="text-white/60" />
        ) : (
          <span className="font-mono text-[15px] font-semibold">{selfInitials}</span>
        )}
        <span className="absolute bottom-1.5 rounded-(--radius-sm) bg-black/40 px-1.5 text-[11px] text-white/80">
          {selfLabel}
          {media.status === "denied" ? " · camera blocked" : media.status === "requesting" ? " · allow camera…" : ""}
        </span>
      </div>

      {overlay}

      {/* controls */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 bg-gradient-to-t from-black/50 to-transparent px-4 pb-4 pt-6">
        <ControlButton active={!muted} onClick={media.toggleMic} label={muted ? labels.unmute : labels.mute}>
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </ControlButton>
        <ControlButton active={!camOff} onClick={media.toggleCam} label={camOff ? labels.camOn : labels.camOff}>
          {camOff ? <VideoOff size={18} /> : <Video size={18} />}
        </ControlButton>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex h-11 items-center gap-2 rounded-(--radius-pill) bg-[#e5484d] px-5 text-[13.5px] font-semibold text-white hover:brightness-110"
        >
          <PhoneOff size={17} /> {leaveLabel}
        </button>
      </div>
    </div>
  );
}

function ControlButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${active ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-[#1f2329]"}`}
    >
      {children}
    </button>
  );
}
