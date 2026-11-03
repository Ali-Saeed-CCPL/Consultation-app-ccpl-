/* The patient's video call, laid out like Google Meet inside the app's own
   chrome: a white card (title, reference, timer, fullscreen) around a dark
   video stage — the doctor as the main tile, your real camera in the corner,
   live captions along the bottom — and a control bar (mic, camera, captions,
   leave). The transcript / details panel is a white card beside it. The
   fullscreen button puts the card alone on screen, dark, Meet-style.
   Camera and mic are this device's own (features/consult/use-local-media). */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Captions,
  CaptionsOff,
  Download,
  FileText,
  Info,
  Lock,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  PhoneOff,
  RefreshCw,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { initialsOf } from "@/components/ui/avatar";
import RxDocument, { downloadRx, rxLabels } from "@/features/consult/rx-document";
import SelfVideo from "@/features/consult/self-video";
import { useLocalMedia, type LocalMedia } from "@/features/consult/use-local-media";
import { complaintText } from "@/lib/complaint";
import { CLINIC_HOURS, fmtDuration } from "@/lib/clinic";
import { useT } from "@/lib/i18n";
import { useNow } from "@/lib/use-now";
import type { Consultation, Doctor, Lang, TranscriptLine } from "@/lib/types";

// No transcript panel: the transcript is stored for the record, the patient only sees the on-video captions.
type Panel = "rx" | "details" | null;

export default function MeetCall({ consult, doctor, onLeave }: { consult: Consultation; doctor: Doctor; onLeave: () => void }) {
  const { t, lang } = useT();
  const now = useNow(1000);
  const media = useLocalMedia();
  const [cc, setCc] = useState(true);
  const [panel, setPanel] = useState<Panel>("rx");
  const panels = ["rx", "details"] as const;
  const card = useRef<HTMLElement>(null);
  const side = useRef<HTMLElement>(null);
  const { full, filled, toggle: toggleFull } = useFullscreen(card);
  // The moment the doctor releases it, the prescription is put in front of the patient:
  // out of full screen (which covers the panel), the tab opened, and scrolled into view
  // (below xl the panel sits under the video).
  useEffect(() => {
    if (!consult.approvedAt) return;
    if (full) toggleFull();
    setPanel("rx");
    // A tab in the background doesn't scroll, so wait until the patient is looking at it.
    let id = 0;
    const reveal = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", reveal);
      id = window.setTimeout(() => side.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
    };
    document.addEventListener("visibilitychange", reveal);
    reveal();
    return () => {
      document.removeEventListener("visibilitychange", reveal);
      window.clearTimeout(id);
    };
  }, [consult.approvedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- once per release

  const last = consult.transcript[consult.transcript.length - 1];
  // "Speaking": the doctor for a few seconds after each of their lines; you from your real mic level.
  const doctorSpeaking = last?.speaker === "doctor" && now - last.at < 3500;
  const youSpeaking = media.level > 0.12;
  const memberName = lang === "ur" ? consult.member.nameUr : consult.member.name;
  const doctorShort = doctor.name.split(" ").slice(0, 2).join(" ");
  const time = new Date(now).toLocaleTimeString("en-PK", { timeZone: CLINIC_HOURS.tz, hour: "numeric", minute: "2-digit" });

  const leave = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (filled) toggleFull();
    onLeave();
  };

  return (
    <div className={`line-in grid gap-5 ${panel ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      {/* ── Call card ─────────────────────────────────────────────────── */}
      <section
        ref={card}
        dir="ltr"
        className={
          full
            ? `flex h-screen flex-col bg-[#0d1420] text-[#e8eaed] ${filled ? "fixed inset-0 z-[70000]" : ""}`
            : "flex min-w-0 flex-col overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)"
        }
      >
        {/* header */}
        <header className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${full ? "" : "border-b border-[var(--hair)]"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={`truncate text-[16px] font-semibold ${full ? "" : "text-[var(--ink)]"}`}>{t("j_consult")}</span>
            <span className={`font-mono text-[12.5px] ${full ? "text-white/50" : "text-[var(--mute)]"}`}>{consult.id}</span>
            <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) bg-[var(--red-tint)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-red-ink)]">
              <span className="live-dot" /> {t("callLive")}
            </span>
          </div>
          <div className={`flex items-center gap-3 text-[12.5px] ${full ? "text-white/60" : "text-[var(--mute)]"}`}>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <Lock size={13} /> {t("encrypted")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} /> 2
            </span>
            <span className={`rounded-(--radius-pill) px-2.5 py-1 font-mono ${full ? "bg-white/10 text-white" : "bg-[var(--sunken)] text-[var(--ink)]"}`}>
              {consult.callStartedAt ? fmtDuration(now - consult.callStartedAt) : "00:00"}
            </span>
            <button
              type="button"
              onClick={toggleFull}
              title={full ? t("exitFullScreen") : t("fullScreen")}
              className={`inline-flex items-center gap-1.5 rounded-(--radius-md) border px-3 py-1.5 text-[12.5px] font-semibold ${
                full ? "border-white/20 text-white hover:bg-white/10" : "border-[var(--border-input)] text-[var(--ink)] hover:border-[var(--link)] hover:bg-[var(--tint)]"
              }`}
            >
              {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {full ? t("exitFullScreen") : t("fullScreen")}
            </button>
          </div>
        </header>

        {media.status !== "ready" ? <MediaNotice media={media} dark={full} /> : null}

        {/* dark stage — the only black part */}
        <div className={`relative mx-4 overflow-hidden rounded-(--radius-xl) ${full ? "min-h-0 flex-1" : "mt-4 h-[min(54vh,540px)] min-h-[340px]"}`} style={{ background: "#0d1420" }}>
          {/* the doctor */}
          <Tile speaking={doctorSpeaking} className="absolute inset-0 rounded-none">
            <div className="flex h-full items-center justify-center">
              <span
                className={`flex h-32 w-32 items-center justify-center rounded-full font-mono text-[40px] font-semibold text-white transition-shadow ${
                  doctorSpeaking ? "shadow-[0_0_0_6px_rgba(52,168,83,0.35)]" : ""
                }`}
                style={{ background: "linear-gradient(135deg,#3a6fd8,#1e3f8a)" }}
              >
                {doctor.initials}
              </span>
            </div>
            <TileLabel name={doctor.name} sub={doctor.pmdc} speaking={doctorSpeaking} />
          </Tile>

          {/* you — this device's camera */}
          <Tile speaking={youSpeaking} className="absolute bottom-4 right-4 z-10 aspect-video w-[min(28%,280px)] min-w-[170px] shadow-2xl">
            {media.stream && media.hasVideo && media.camOn ? (
              <SelfVideo stream={media.stream} />
            ) : (
              <div className="flex h-full items-center justify-center" style={{ background: "#1c2433" }}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5f6e8a] font-mono text-[18px] font-semibold text-white">
                  {initialsOf(consult.member.name)}
                </span>
              </div>
            )}
            <TileLabel name={`${memberName} (${t("you")})`} muted={!media.micOn || !media.hasAudio} speaking={youSpeaking} small />
          </Tile>

          {/* captions */}
          {cc && last ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex justify-start px-4 pr-[calc(min(28%,280px)+32px)] md:justify-center">
              <div className="max-w-[720px] rounded-(--radius-lg) bg-black/70 px-4 py-2.5 text-[15px] leading-relaxed text-white">
                <span className="me-2 font-semibold text-white/70">{last.speaker === "doctor" ? doctorShort : t("you")}</span>
                <CaptionText line={last} lang={lang} />
              </div>
            </div>
          ) : null}
        </div>

        {/* controls */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4">
          <div className={`hidden min-w-0 items-center gap-3 text-[13.5px] sm:flex ${full ? "" : "text-[var(--body)]"}`}>
            <span className="font-semibold">{time}</span>
            <span className="opacity-40">|</span>
            <span className="truncate opacity-80">{doctor.name}</span>
          </div>
          <div className="col-start-2 flex items-center gap-2.5">
            <RoundButton dark={full} on={media.micOn} disabled={!media.hasAudio} onClick={media.toggleMic} label={media.micOn ? t("mute") : t("unmute")}>
              {media.micOn && media.hasAudio ? <Mic size={20} /> : <MicOff size={20} />}
            </RoundButton>
            <RoundButton dark={full} on={media.camOn} disabled={!media.hasVideo} onClick={media.toggleCam} label={media.camOn ? t("camOff") : t("camOn")}>
              {media.camOn && media.hasVideo ? <Video size={20} /> : <VideoOff size={20} />}
            </RoundButton>
            <RoundButton dark={full} on active={cc} onClick={() => setCc((c) => !c)} label={t("captionsTitle")}>
              {cc ? <Captions size={20} /> : <CaptionsOff size={20} />}
            </RoundButton>
            <button
              type="button"
              onClick={leave}
              aria-label={t("leave")}
              title={t("leave")}
              className="ms-1 inline-flex h-12 items-center gap-2 rounded-(--radius-pill) bg-[#e5484d] px-6 text-[14px] font-semibold text-white hover:brightness-110"
            >
              <PhoneOff size={20} /> <span className="hidden sm:inline">{t("leave")}</span>
            </button>
          </div>
          <div className="col-start-3 flex items-center justify-end gap-2">
            {!full ? (
              <>
                <RoundButton subtle on active={panel === "details"} onClick={() => setPanel((p) => (p === "details" ? null : "details"))} label={t("consultWith")}>
                  <Info size={20} />
                </RoundButton>
                <RoundButton subtle on active={panel === "rx"} onClick={() => setPanel((p) => (p === "rx" ? null : "rx"))} label={t("prescriptionLabel")}>
                  <FileText size={20} />
                </RoundButton>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Side panel ───────────────────────────────────────────────── */}
      {panel ? (
        <aside
          ref={side}
          className="flex h-[420px] flex-col overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) xl:h-0 xl:min-h-full"
          dir={lang === "ur" ? "rtl" : "ltr"}
        >
          <header className="flex items-center justify-between border-b border-[var(--hair)] px-4 py-3">
            <div className="flex gap-1 rounded-(--radius-pill) bg-[var(--sunken)] p-0.5">
              {panels.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPanel(p)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-(--radius-pill) px-3 py-1 text-[12.5px] font-semibold ${
                    panel === p ? "bg-[var(--white)] text-[var(--ink)] shadow-(--shadow-xs)" : "text-[var(--mute)]"
                  }`}
                >
                  {p === "rx" ? t("prescriptionLabel") : t("details")}
                  {p === "rx" && consult.approvedAt ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" /> : null}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close panel" className="rounded-full p-1.5 text-[var(--mute)] hover:bg-[var(--hair)]">
              <X size={16} />
            </button>
          </header>
          {panel === "rx" && !consult.approvedAt ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tint)] text-[var(--link)]">
                <FileText size={26} />
                <span className="live-dot absolute -end-0.5 -top-0.5" />
              </span>
              <p className="text-[15px] font-semibold text-[var(--ink)]">{t("rxWritingTitle")}</p>
            </div>
          ) : panel === "rx" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--sunken)] p-3 slim-scrollbar">
                <RxDocument consult={consult} prescriber={doctor} labels={rxLabels(t)} />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[var(--hair)] px-4 py-3">
                <span className="text-[12px] text-[var(--mute)]">{t("emailed")}</span>
                <button
                  type="button"
                  onClick={() => downloadRx(consult.id)}
                  className="inline-flex items-center gap-1.5 rounded-(--radius-md) bg-[var(--action)] px-3.5 py-2 text-[13px] font-semibold text-[var(--color-on-fill)] hover:brightness-110"
                >
                  <Download size={15} /> {t("download")}
                </button>
              </div>
            </>
          ) : (
            <div className="grid content-start gap-4 overflow-y-auto overflow-x-hidden px-5 py-4 text-[13px]">
              <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-y-2.5">
                <dt className="text-[var(--mute)]">{t("patientLabel")}</dt>
                <dd className="font-semibold text-[var(--ink)]">{memberName}</dd>
                <dt className="text-[var(--mute)]">{t("doctorLabel")}</dt>
                <dd className="text-[var(--ink)]">
                  {doctor.name}
                  <span className="block font-mono text-[11.5px] text-[var(--mute)]" dir="ltr">
                    {doctor.pmdc}
                  </span>
                </dd>
                <dt className="text-[var(--mute)]">{t("complaintLabel")}</dt>
                <dd className="text-[var(--ink)]">{complaintText(consult.symptoms, lang) || "—"}</dd>
                <dt className="text-[var(--mute)]">{t("qSeverityShort")}</dt>
                <dd className="font-mono text-[var(--ink)]" dir="ltr">
                  {consult.symptoms?.severity ?? "—"}/10
                </dd>
                <dt className="text-[var(--mute)]">{t("refLabel")}</dt>
                <dd className="font-mono text-[var(--ink)]" dir="ltr">
                  {consult.id} · {consult.member.mrn}
                </dd>
                <dt className="text-[var(--mute)]">{t("cameraLabel")}</dt>
                <dd className="truncate text-[var(--ink)]" title={media.cameraLabel}>
                  {media.cameraLabel || "—"}
                </dd>
                <dt className="text-[var(--mute)]">{t("micLabel")}</dt>
                <dd className="text-[var(--ink)]">
                  <span className="block truncate" title={media.micLabel}>
                    {media.micLabel || "—"}
                  </span>
                  {media.hasAudio ? <LevelMeter level={media.level} /> : null}
                </dd>
              </dl>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

/** Fullscreen for one element; `full` while it's showing. Uses the browser's
    Fullscreen API, and if that's refused (some embedded browsers) fills the
    window instead — Esc leaves either. */
function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const sync = () => setNative(document.fullscreenElement === ref.current && ref.current !== null);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [ref]);
  useEffect(() => {
    if (!filled) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilled(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filled]);
  const toggle = () => {
    if (document.fullscreenElement) return void document.exitFullscreen();
    if (filled) return setFilled(false);
    const el = ref.current;
    if (!el?.requestFullscreen) return setFilled(true);
    el.requestFullscreen().catch(() => setFilled(true));
    // A refusal can also be silent: fall back if nothing happened.
    window.setTimeout(() => {
      if (!document.fullscreenElement) setFilled(true);
    }, 400);
  };
  return { full: native || filled, filled, toggle };
}

/** Why the camera/mic aren't live, and a way to try again. */
function MediaNotice({ media, dark }: { media: LocalMedia; dark: boolean }) {
  const { t } = useT();
  const msg =
    media.status === "requesting" ? t("mediaAsking") : media.status === "denied" ? t("mediaDenied") : media.status === "unavailable" ? t("mediaNone") : t("mediaError");
  const tone = media.status === "requesting" ? "info" : "warn";
  return (
    <div
      className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-(--radius-md) px-4 py-2.5 text-[13px] ${
        dark ? "bg-white/10 text-white" : tone === "info" ? "bg-[var(--tint)] text-[var(--body)]" : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
      }`}
    >
      <span className="flex items-center gap-2">
        {media.status === "requesting" ? <span className="live-dot !bg-[var(--link)]" /> : <VideoOff size={15} />}
        {msg}
      </span>
      {media.status !== "requesting" ? (
        <button type="button" onClick={media.retry} className="inline-flex flex-shrink-0 items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
          <RefreshCw size={13} /> {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

function LevelMeter({ level }: { level: number }) {
  return (
    <span className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--hair)]">
      <span className="h-full rounded-full bg-[var(--green)] transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} />
    </span>
  );
}

function Tile({ speaking, className = "", children }: { speaking?: boolean; className?: string; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-(--radius-xl) text-white transition-shadow ${speaking ? "shadow-[inset_0_0_0_3px_#34a853]" : ""} ${className}`}
      style={{ background: "radial-gradient(120% 90% at 30% 20%, #26344d 0%, #141c2c 70%)" }}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function TileLabel({ name, sub, speaking, muted, small }: { name: string; sub?: string; speaking?: boolean; muted?: boolean; small?: boolean }) {
  return (
    <div className={`absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-center gap-2 ${small ? "text-[12px]" : "text-[14px]"}`}>
      {muted ? (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black/50">
          <MicOff size={12} />
        </span>
      ) : speaking ? (
        <SpeakingBars />
      ) : null}
      <span className="truncate rounded-(--radius-sm) bg-black/45 px-2 py-0.5 font-medium">
        {name}
        {sub ? <span className="ms-2 font-mono text-[11.5px] text-white/60">{sub}</span> : null}
      </span>
    </div>
  );
}

/** Three bouncing bars — Meet's "this person is talking". */
function SpeakingBars() {
  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center gap-[2px] rounded-full bg-[#1a73e8]">
      {[0, 150, 300].map((d) => (
        <span key={d} className="w-[3px] animate-pulse rounded-full bg-white" style={{ height: d === 150 ? 10 : 6, animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

/** A line in the patient's language when we have it, else as spoken. */
function CaptionText({ line, lang }: { line: TranscriptLine; lang: Lang }) {
  const text = line.lang === lang || !line.gloss ? line.text : line.gloss;
  const urdu = line.lang === "ur" && text === line.text;
  return (
    <span lang={urdu ? "ur" : "en"} dir={urdu ? "rtl" : "ltr"}>
      {text}
    </span>
  );
}


function RoundButton({
  on,
  active,
  subtle,
  dark,
  disabled,
  onClick,
  label,
  children,
}: {
  on: boolean;
  active?: boolean;
  subtle?: boolean;
  dark?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  // Meet: neutral when on, red when a device is off, blue when a panel / captions are on.
  const cls = disabled
    ? "cursor-not-allowed bg-[#ea4335]/60 text-white"
    : active
      ? dark
        ? "bg-[#8ab4f8] text-[#0d1420]"
        : "bg-[var(--primary)] text-[var(--link)] border border-[var(--sky-300)]"
      : !on
        ? "bg-[#ea4335] text-white"
        : subtle
          ? dark
            ? "text-white hover:bg-white/10"
            : "text-[var(--body)] hover:bg-[var(--sunken)]"
          : dark
            ? "bg-[#3c4043] text-white hover:bg-[#4a4e52]"
            : "border border-[var(--line)] bg-[var(--sunken)] text-[var(--ink)] hover:bg-[var(--hair)]";
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`flex h-12 w-12 items-center justify-center rounded-full ${cls}`}>
      {children}
    </button>
  );
}
