/* One consultation, from the consulting doctor's side. What it shows follows
   the status:
     ringing (yours)        → accept / later
     queued                 → waiting; rings the next free GP by itself
     in_call (yours)        → consult room: video, live transcript, AI assist, and the prescription
                              the doctor edits and releases during the call (End call unlocks once released)
     approved               → the released prescription, read-only
   Anyone else's consultation is read-only. */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, Download, FileText, MessageSquareText, Phone, PhoneOff, Printer, Sparkles, UserRound } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import StatusTag from "@/components/ui/status-tag";
import AiAssist, { AiWave } from "@/features/consult/ai-assist";
import ChatPanel from "@/features/consult/chat-panel";
import { PatientPanel, PatientTab, TimelinePanel } from "@/features/consult/consult-panels";
import NotesRxEditor, { draftProblems } from "@/features/consult/notes-rx-editor";
import RxDocument, { downloadRx } from "@/features/consult/rx-document";
import TranscriptPanel from "@/features/consult/transcript-panel";
import { useScriptedTranscript } from "@/features/consult/use-scripted-transcript";
import VideoStage from "@/features/consult/video-stage";
import { AI_DRAFT, DURATIONS, RED_FLAGS, TRANSCRIPT_SCRIPT } from "@/data/seed";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtDuration, isOthersActive, minutesAgo } from "@/lib/clinic";
import type { Consultation, Doctor } from "@/lib/types";


/** `admin`: the clinic admin opening any doctor's consultation — read-only, no call or approve actions. */
export default function ConsultRoom({ id, admin = false }: { id: string; admin?: boolean }) {
  const signedIn = useCurrentDoctor();
  const consult = useConsult(id);
  const doctors = usePlatform((s) => s.doctors);
  const base = admin ? "/admin/consultations" : "/portal/consultations";

  if (!consult) {
    return (
      <>
        <PageHero crumb={[{ label: "Consultations", to: base }, { label: id }]} back={base} title="Consultation not found" />
        <main className="p-6 text-[13px] text-[var(--mute)]">
          No consultation {id}. <Link to={base}>Back to the list</Link>
        </main>
      </>
    );
  }

  const doctor = signedIn!;
  const mine = !admin && consult.prescriberId === doctor.id;
  const prescriber = doctors.find((d) => d.id === consult.prescriberId);
  // A released visit is history: just its prescription, no working panels.
  const released = consult.status === "approved" || consult.status === "closed";
  // Back to the list this consultation lives in — not always the live queue.
  const parent = ["drafting", "approved", "closed"].includes(consult.status)
    ? { label: "History", view: "history" }
    : ["emergency", "ineligible"].includes(consult.status)
      ? { label: "Triage outcomes", view: "triage" }
      : { label: "Live queue", view: "live" };

  return (
    <>
      <PageHero
        back={base}
        crumb={
          admin
            ? [{ label: "Consultation records", to: base }, { label: consult.id }]
            : [{ label: "Consultations" }, { label: parent.label, to: base, search: { view: parent.view } }, { label: consult.id }]
        }
        title={
          <span className="flex items-center gap-3">
            {consult.member.name} {released ? null : <StatusTag status={consult.status} />}
          </span>
        }
        sub={
          <span className="font-mono text-[12px]">
            {consult.id} · {consult.member.age} {consult.member.gender} · {consult.member.mrn} · {consult.lang === "ur" ? "Urdu" : "English"}
            {prescriber ? ` · ${prescriber.name}` : ""}
          </span>
        }
        actions={admin ? (released ? <RxActions id={consult.id} /> : null) : <HeroActions consult={consult} doctor={doctor} mine={mine} />}
      />
      <main className="p-6">
        {admin ? (
          released ? (
            <ReleasedView consult={consult} prescriber={prescriber} />
          ) : (
            <ReadOnly consult={consult} prescriber={prescriber} />
          )
        ) : isOthersActive(consult, doctor.id) ? (
          <NotYours doctorName={prescriber?.name} />
        ) : consult.status === "in_call" && mine ? (
          <LiveRoom consult={consult} doctor={doctor} />
        ) : released ? (
          <ReleasedView consult={consult} prescriber={prescriber} />
        ) : (
          <ReadOnly consult={consult} doctor={doctor} prescriber={prescriber} />
        )}
      </main>
    </>
  );
}

function HeroActions({ consult, doctor, mine }: { consult: Consultation; doctor: Doctor; mine: boolean }) {
  const { acceptCall, declineCall, endCall } = usePlatform.getState();
  if (consult.status === "ringing" && mine) {
    return (
      <>
        <Button size="sm" onClick={() => declineCall(consult.id, doctor.id)}>
          <PhoneOff size={14} /> Later
        </Button>
        <Button size="sm" variant="primary" onClick={() => acceptCall(consult.id, doctor.id)}>
          <Phone size={14} /> Accept call
        </Button>
      </>
    );
  }
  if (consult.status === "in_call" && mine) {
    return (
      <Button
        size="sm"
        variant="danger"
        disabled={!consult.approvedAt}
        title={consult.approvedAt ? undefined : "Release the prescription first"}
        onClick={() => endCall(consult.id, doctor.id)}
      >
        <PhoneOff size={14} /> End call
      </Button>
    );
  }
  if (consult.status === "approved" || consult.status === "closed") return <RxActions id={consult.id} />;
  return null;
}

function RxActions({ id }: { id: string }) {
  return (
    <>
      <Button size="sm" onClick={() => downloadRx(id)}>
        <Printer size={14} /> Print
      </Button>
      <Button size="sm" variant="primary" onClick={() => downloadRx(id)}>
        <Download size={14} /> Download PDF
      </Button>
    </>
  );
}

/** In the call, side by side: video and transcript pinned on the left, so the doctor
    keeps seeing the patient while checking, editing and releasing the prescription on the right. */
function LiveRoom({ consult, doctor }: { consult: Consultation; doctor: Doctor }) {
  const { endCall, saveDraft, approve } = usePlatform.getState();
  const [tried, setTried] = useState(false);
  const problems = draftProblems(consult.notes, consult.rx);
  const release = () => {
    setTried(true);
    if (problems.length) return;
    approve(consult.id, doctor.id);
    toast.success(`Prescription v${consult.rxVersion + 1} released to ${consult.member.name}`);
  };
  const heard = consult.transcript.length;
  // An auto-answered call's transcript is played by the patient's tab.
  useScriptedTranscript(consult, doctor.name, !consult.autoAnswered);
  // Two tabs saving the same live consult would overwrite each other (last write wins), so
  // once the doctor is here the transcript moves from the patient's tab to this one.
  useEffect(() => {
    if (consult.autoAnswered) usePlatform.getState().claimTranscript(consult.id);
  }, [consult.id, consult.autoAnswered]);

  const last = consult.transcript[heard - 1];
  // The doctor's order of work: listen with AI assist (summary, what to ask next), then write the prescription.
  const [tab, setTab] = useState<"rx" | "ai" | "chat" | "patient">(consult.scripted ? "ai" : "rx");
  // Patient messages that arrived while the chat tab was closed — a dot on the tab.
  const patientMsgs = (consult.chat ?? []).filter((m) => m.from === "patient").length;
  const [seenMsgs, setSeenMsgs] = useState(patientMsgs);
  if (tab === "chat" && seenMsgs !== patientMsgs) setSeenMsgs(patientMsgs);
  const [filling, setFilling] = useState(false);
  const tabs = [
    // The dot says AI assist has a draft plan worth a look.
    { key: "ai" as const, label: "AI assist", icon: <Sparkles size={15} />, dot: consult.scripted && heard >= Math.ceil(TRANSCRIPT_SCRIPT.length * 0.7) && tab !== "ai", hidden: !consult.scripted },
    { key: "rx" as const, label: "Prescription", icon: <FileText size={15} /> },
    { key: "chat" as const, label: "Chat", icon: <MessageSquareText size={15} />, dot: tab !== "chat" && patientMsgs > seenMsgs },
    { key: "patient" as const, label: "Patient", icon: <UserRound size={15} /> },
  ].filter((t) => !t.hidden);
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid content-start gap-5 xl:sticky xl:top-[120px]">
        <VideoStage
          className="h-[340px]"
          remoteName={consult.member.name}
          remoteInitials={initialsOf(consult.member.name)}
          remoteSub={`${consult.member.age} ${consult.member.gender} · patient`}
          selfLabel="You"
          selfInitials={doctor.initials}
          startedAt={consult.callStartedAt}
          caption={last ? (last.gloss ?? last.text) : undefined}
          labels={{ mute: "Mute", unmute: "Unmute", camOff: "Camera off", camOn: "Camera on", live: "Recording · transcript on" }}
          leaveLabel="End call"
          onLeave={() => (consult.approvedAt ? endCall(consult.id, doctor.id) : toast("Release the prescription first, then end the call."))}
        />
        <TranscriptPanel
          className="h-[calc(100vh-500px)] min-h-[200px]"
          lines={consult.transcript}
          live
          startedAt={consult.callStartedAt}
          doctorName={doctor.name}
          patientName={consult.member.name}
        />
      </div>
      {/* One card, three tabs — Approve stays in view; only the tab body scrolls. */}
      <section className="flex min-w-0 flex-col rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) xl:sticky xl:top-[120px] xl:h-[calc(100vh-140px)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--hair)] px-4">
          <nav role="tablist" className="flex gap-1">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                role="tab"
                aria-selected={tab === tb.key}
                onClick={() => setTab(tb.key)}
                className={`relative inline-flex items-center gap-1.5 px-3 py-3.5 text-[13.5px] font-semibold ${
                  tab === tb.key ? "text-[var(--ink)] after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[var(--link)]" : "text-[var(--mute)] hover:text-[var(--ink)]"
                }`}
              >
                {tb.icon} {tb.label}
                {tb.dot ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {consult.approvedAt ? <span className="hidden text-[12px] font-medium text-[var(--green)] 2xl:inline">v{consult.rxVersion} with the patient</span> : null}
            <Button variant="primary" size="sm" disabled={Boolean(consult.approvedAt)} onClick={release}>
              <BadgeCheck size={14} /> {consult.approvedAt ? "Released" : consult.rxVersion ? "Approve & overwrite" : "Approve & release"}
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 slim-scrollbar">
          {tab === "rx" ? (
            <>
              {tried && problems.length && !consult.approvedAt ? (
                <ul className="mb-3 grid gap-1 rounded-(--radius-md) bg-[var(--amber-tint)] px-3 py-2 text-[12.5px] font-medium text-[var(--amber-ink)]">
                  {problems.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              ) : null}
              {filling ? (
                <p className="line-in mb-3 flex items-center gap-2 rounded-(--radius-md) bg-[var(--tint)] px-3 py-2 text-[12.5px] font-semibold text-[var(--link)]">
                  <AiWave /> AI is writing the draft…
                </p>
              ) : null}
              <div className={filling ? "ai-glow pointer-events-none rounded-(--radius-md) p-2" : ""}>
                <NotesRxEditor notes={consult.notes} rx={consult.rx} onChange={(n, r) => saveDraft(consult.id, n, r)} />
              </div>
            </>
          ) : tab === "ai" ? (
            <AiAssist
              bare
              heard={heard}
              total={TRANSCRIPT_SCRIPT.length}
              live
              onUseDraft={() => {
                if (filling || !applyAiDraft(consult, saveDraft, () => setFilling(false))) return;
                setFilling(true);
                setTab("rx");
              }}
            />
          ) : tab === "chat" ? (
            <div className="-mx-4 -my-4 flex h-[calc(100%+2rem)] flex-col">
              <ChatPanel consult={consult} me="doctor" otherName={consult.member.name} />
            </div>
          ) : (
            <PatientTab consult={consult} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Another doctor's live consultation or unapproved draft — not shown to anyone else. */
function NotYours({ doctorName }: { doctorName?: string }) {
  return (
    <p className="rounded-(--radius-card) border border-dashed border-[var(--sky-200)] px-4 py-10 text-center text-[13px] text-[var(--mute)]">
      This consultation is with {doctorName ?? "another doctor"}. <Link to="/portal/consultations" search={{ view: "live" }}>Back to the live queue</Link>
    </p>
  );
}

/** A released visit, opened from History: the prescription takes the page, with the
    visit's key facts beside it — no working panels (those were used in the live call). */
function ReleasedView({ consult, prescriber }: { consult: Consultation; prescriber?: Doctor }) {
  const s = consult.symptoms;
  const m = consult.member;
  const severity = s?.severity ?? 0;
  const flags = RED_FLAGS.filter((f) => s?.redFlags.includes(f.key));
  const rows: [string, React.ReactNode][] = [
    ["Complaint", <>{complaintText(s) || "—"}{s?.duration ? <span className="block text-[12px] font-normal text-[var(--mute)]">{DURATIONS.find((d) => d.key === s.duration)?.en}</span> : null}</>],
    [
      "Severity",
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--hair)]">
          <span className={`block h-full ${severity >= 7 ? "bg-[var(--red)]" : severity >= 4 ? "bg-[var(--amber)]" : "bg-[var(--green)]"}`} style={{ width: `${severity * 10}%` }} />
        </span>
        <span className="font-mono text-[12.5px]">{s?.severity ?? "—"}/10</span>
      </span>,
    ],
    ["Red flags", flags.length ? <span className="text-[var(--red)]">{flags.map((f) => f.en).join(", ")}</span> : <span className="text-[var(--green)]">None</span>],
    ["Consulted", consult.callStartedAt ? fmtDateTime(consult.callStartedAt) : "—"],
    ["Call length", <span className="font-mono">{consult.callStartedAt && consult.callEndedAt ? fmtDuration(consult.callEndedAt - consult.callStartedAt) : "—"}</span>],
    ["Released", consult.approvedAt ? fmtDateTime(consult.approvedAt) : "—"],
    ["Doctor", prescriber?.name ?? "—"],
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <RxDocument consult={consult} prescriber={prescriber} />
      <aside className="grid gap-5 xl:sticky xl:top-[120px]">
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-5 shadow-(--shadow-sm)">
          <div className="flex items-center gap-3">
            <Avatar initials={initialsOf(m.name)} size={48} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold text-[var(--ink)]">
                {m.name} <span lang="ur" className="ms-1 text-[13px] font-normal text-[var(--mute)]">{m.nameUr}</span>
              </p>
              <p className="text-[12.5px] text-[var(--mute)]">
                {m.relation === "self" ? "Policyholder" : `Dependant · ${m.relation}`} · {m.age} · {m.gender === "M" ? "Male" : "Female"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Fact k="MRN" v={<span className="font-mono text-[12.5px]">{m.mrn}</span>} />
            <Fact k="Language" v={consult.lang === "ur" ? "Urdu" : "English"} />
          </div>
        </section>
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
          <h2 className="border-b border-[var(--hair)] px-5 py-3.5 section-title">This visit</h2>
          <dl className="divide-y divide-[var(--hair)] px-5 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[100px_1fr] gap-3 py-2.5">
                <dt className="text-[var(--mute)]">{k}</dt>
                <dd className="min-w-0 font-medium text-[var(--ink)]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-(--radius-md) bg-[var(--sunken)] px-3 py-2">
      <p className="text-[11px] text-[var(--mute)]">{k}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-[var(--ink)]">{v}</p>
    </div>
  );
}

/** Without a `doctor` (the admin) it's view-only: no call panel. */
function ReadOnly({ consult, doctor, prescriber }: { consult: Consultation; doctor?: Doctor; prescriber?: Doctor }) {
  const hasRx = consult.rxVersion > 0;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {hasRx ? (
          <RxDocument consult={consult} prescriber={prescriber} />
        ) : null}
        {consult.transcript.length || consult.callStartedAt ? (
          <TranscriptPanel
            className="max-h-[460px]"
            lines={consult.transcript}
            live={consult.status === "in_call"}
            startedAt={consult.callStartedAt}
            doctorName={prescriber?.name ?? doctor?.name ?? "Doctor"}
            patientName={consult.member.name}
          />
        ) : null}
        {doctor && ["queued", "ringing"].includes(consult.status) ? <CallPanel consult={consult} doctor={doctor} prescriber={prescriber} /> : null}
        {!hasRx && !consult.callStartedAt && !["queued", "ringing"].includes(consult.status) ? (
          <p className="rounded-(--radius-card) border border-dashed border-[var(--sky-200)] px-4 py-10 text-center text-[13px] text-[var(--mute)]">
            {consult.status === "emergency"
              ? "Sent to the ER — red flags at intake."
              : consult.status === "ineligible"
                ? "Cover not confirmed — CCPL support following up."
                : "No call yet."}
          </p>
        ) : null}
      </div>
      <div className="grid content-start gap-5">
        <PatientPanel consult={consult} />
        <TimelinePanel consultId={consult.id} />
      </div>
    </div>
  );
}

/** Waiting or ringing — the way into the live call. Patients call in; a waiting one
    rings the next free GP by itself. Accepting puts the consult in_call, and the page
    switches to the consult room. */
function CallPanel({ consult, doctor, prescriber }: { consult: Consultation; doctor: Doctor; prescriber?: Doctor }) {
  const { acceptCall, declineCall } = usePlatform.getState();
  // Re-render when the doctor's own call state changes, so the button enables.
  usePlatform((s) => s.consultations.filter((c) => c.prescriberId === doctor.id && (c.status === "in_call" || c.status === "ringing")).length);
  const ringingMe = consult.status === "ringing" && consult.prescriberId === doctor.id;
  const ringingOther = consult.status === "ringing" && !ringingMe;

  const title = ringingMe
    ? `${consult.member.name} is calling you`
    : ringingOther
      ? `Ringing ${prescriber?.name ?? "another GP"}`
      : "Waiting for a free GP";
  const sub = consult.status === "queued" ? `In the queue ${minutesAgo(consult.consentAt ?? consult.createdAt)} · rings the next free GP` : null;

  return (
    <section className="flex flex-col items-center gap-4 rounded-(--radius-card) border border-[var(--line)] bg-(--color-surface) px-6 py-10 text-center shadow-(--shadow-sm)">
      <span className="relative inline-flex">
        <span className="ring-halo" style={{ background: consult.status === "queued" ? "var(--amber)" : "var(--green)" }} />
        <span className="ring-halo delay" style={{ background: consult.status === "queued" ? "var(--amber)" : "var(--green)" }} />
        <Avatar initials={initialsOf(consult.member.name)} size={72} className="relative" />
      </span>
      <div>
        <h2 className="flex items-center justify-center gap-2 text-[18px] font-semibold text-[var(--ink)]">
          {title}
        </h2>
        {sub ? <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-[var(--mute)]">{sub}</p> : null}
        <p className="mt-2 text-[12.5px] text-[var(--body)]">
          {complaintText(consult.symptoms) || "—"} · {consult.lang === "ur" ? "Urdu" : "English"}
        </p>
      </div>
      {ringingMe ? (
        <div className="flex gap-2">
          <Button onClick={() => declineCall(consult.id, doctor.id)}>
            <PhoneOff size={15} /> Later
          </Button>
          <Button variant="primary" onClick={() => acceptCall(consult.id, doctor.id)}>
            <Phone size={15} /> Accept call
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** Copy the AI draft into the notes & prescription — the doctor edits from there. */
/** Writes the AI draft into the notes and prescription as if typed: diagnosis, plan
    and follow-up fill in over the first part, then each medicine drops in. Every
    frame is a normal draft save, so the patient-side and approve checks see the
    same thing a doctor typing would produce. Returns false if the doctor kept theirs. */
function applyAiDraft(consult: Consultation, saveDraft: (id: string, n: Consultation["notes"], r: Consultation["rx"]) => void, onDone: () => void) {
  const hasContent = consult.notes.diagnosis || consult.notes.plan || consult.rx.length;
  if (hasContent && !window.confirm("Replace your current notes & prescription with the AI draft?")) return false;
  const notes = AI_DRAFT.notes;
  const rx = AI_DRAFT.rx.map((r) => ({ ...r, id: Math.random().toString(36).slice(2, 9) }));
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const FRAMES = reduce ? 1 : 36;
  const part = (text: string, f: number) => text.slice(0, Math.ceil(text.length * Math.max(0, Math.min(1, f))));
  let frame = 0;
  const tick = () => {
    frame++;
    const f = frame / FRAMES;
    saveDraft(
      consult.id,
      { diagnosis: part(notes.diagnosis, f * 4), plan: part(notes.plan, (f - 0.15) * 2.4), followUp: part(notes.followUp, (f - 0.35) * 2.6) },
      rx.slice(0, f <= 0.6 ? 0 : Math.ceil(((f - 0.6) / 0.4) * rx.length)),
    );
    if (frame < FRAMES) return void setTimeout(tick, 45);
    onDone();
    toast.success("AI draft filled in — review it before you release");
  };
  tick();
  return true;
}
