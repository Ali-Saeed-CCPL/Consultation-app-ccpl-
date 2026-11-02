/* One consultation, from the consulting doctor's side. What it shows follows
   the status:
     ringing (yours)        → accept / later
     queued / call back     → call the patient now, straight into the consult room
     in_call (yours)        → consult room: video, live transcript, AI assist, notes & prescription draft
     drafting (yours)       → AI assist's draft of notes & prescription: check, edit, approve & release
     approved               → the released prescription, read-only; close & audit
   Anyone else's consultation is read-only. */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, CalendarClock, LockKeyhole, MessageSquareText, Phone, PhoneCall, PhoneOff, Sparkles } from "lucide-react";
import PageHero from "@/components/layout/page-hero";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import Section from "@/components/ui/section";
import StatusTag from "@/components/ui/status-tag";
import AiAssist from "@/features/consult/ai-assist";
import ChatPanel from "@/features/consult/chat-panel";
import { PatientPanel, TimelinePanel } from "@/features/consult/consult-panels";
import NotesRxEditor, { draftProblems } from "@/features/consult/notes-rx-editor";
import RxDocument from "@/features/consult/rx-document";
import TranscriptPanel from "@/features/consult/transcript-panel";
import { useScriptedTranscript } from "@/features/consult/use-scripted-transcript";
import VideoStage from "@/features/consult/video-stage";
import { AI_DRAFT, TRANSCRIPT_SCRIPT } from "@/data/seed";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useCurrentDoctor } from "@/store/use-current-doctor";
import { complaintText } from "@/lib/complaint";
import { fmtTime, isOthersActive, minutesAgo } from "@/lib/clinic";
import type { Consultation, Doctor } from "@/lib/types";


export default function ConsultRoom({ id }: { id: string }) {
  const doctor = useCurrentDoctor()!;
  const consult = useConsult(id);
  const doctors = usePlatform((s) => s.doctors);

  if (!consult) {
    return (
      <>
        <PageHero crumb={[{ label: "Consultations", to: "/portal/consultations" }, { label: id }]} title="Consultation not found" />
        <main className="p-6 text-[13px] text-[var(--mute)]">
          No consultation {id}. <Link to="/portal/consultations">Back to the list</Link>
        </main>
      </>
    );
  }

  const mine = consult.prescriberId === doctor.id;
  const prescriber = doctors.find((d) => d.id === consult.prescriberId);

  return (
    <>
      <PageHero
        crumb={[{ label: "Consultations", to: "/portal/consultations" }, { label: consult.id }]}
        title={
          <span className="flex items-center gap-3">
            {consult.member.name} <StatusTag status={consult.status} />
          </span>
        }
        sub={
          <span className="font-mono text-[12px]">
            {consult.id} · {consult.member.age} {consult.member.gender} · {consult.member.mrn} · {consult.lang === "ur" ? "Urdu" : "English"}
            {prescriber ? ` · ${prescriber.name}` : ""}
          </span>
        }
        actions={<HeroActions consult={consult} doctor={doctor} mine={mine} />}
      />
      <main className="p-6">
        {isOthersActive(consult, doctor.id) ? (
          <NotYours doctorName={prescriber?.name} />
        ) : consult.status === "in_call" && mine ? (
          <LiveRoom consult={consult} doctor={doctor} />
        ) : consult.status === "drafting" && mine ? (
          <DraftRoom consult={consult} doctor={doctor} />
        ) : (
          <ReadOnly consult={consult} doctor={doctor} prescriber={prescriber} />
        )}
      </main>
    </>
  );
}

function HeroActions({ consult, doctor, mine }: { consult: Consultation; doctor: Doctor; mine: boolean }) {
  const { acceptCall, declineCall, endCall, closeConsult } = usePlatform.getState();
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
  if (consult.status === "queued" || consult.status === "callback") {
    return (
      <Button size="sm" variant="primary" disabled={!canCall(doctor)} onClick={() => acceptCall(consult.id, doctor.id)}>
        <PhoneCall size={14} /> Call patient now
      </Button>
    );
  }
  if (consult.status === "in_call" && mine) {
    return (
      <Button size="sm" variant="danger" onClick={() => endCall(consult.id, doctor.id)}>
        <PhoneOff size={14} /> End call
      </Button>
    );
  }
  if (consult.status === "approved") {
    return (
      <Button
        size="sm"
        variant="primary"
        onClick={() => {
          closeConsult(consult.id, doctor.id);
          toast.success(`${consult.id} closed`);
        }}
      >
        <LockKeyhole size={14} /> Close & audit
      </Button>
    );
  }
  return null;
}

/** In the call: video and AI assist on the left, the transcript on the right, notes & prescription below. */
function LiveRoom({ consult, doctor }: { consult: Consultation; doctor: Doctor }) {
  const { endCall, saveDraft } = usePlatform.getState();
  const heard = consult.transcript.length;
  // An auto-answered call's transcript is played by the patient's tab.
  useScriptedTranscript(consult, doctor.name, !consult.autoAnswered);

  const last = consult.transcript[heard - 1];
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <VideoStage
            className="h-[380px]"
            remoteName={consult.member.name}
            remoteInitials={initialsOf(consult.member.name)}
            remoteSub={`${consult.member.age} ${consult.member.gender} · patient`}
            selfLabel="You"
            selfInitials={doctor.initials}
            startedAt={consult.callStartedAt}
            caption={last ? (last.gloss ?? last.text) : undefined}
            labels={{ mute: "Mute", unmute: "Unmute", camOff: "Camera off", camOn: "Camera on", live: "Recording · transcript on" }}
            leaveLabel="End call"
            onLeave={() => endCall(consult.id, doctor.id)}
          />
          {consult.scripted ? (
            <AiAssist heard={heard} total={TRANSCRIPT_SCRIPT.length} live onUseDraft={() => applyAiDraft(consult, saveDraft)} />
          ) : null}
        </div>
        <div className="grid content-start gap-5">
          <TranscriptPanel
            className="h-[380px]"
            lines={consult.transcript}
            live
            startedAt={consult.callStartedAt}
            doctorName={doctor.name}
            patientName={consult.member.name}
          />
          <section className="flex h-[340px] flex-col overflow-hidden rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
            <header className="flex items-center gap-2 border-b border-[var(--hair)] px-4 py-3 text-[14px] font-semibold text-[var(--ink)]">
              <MessageSquareText size={16} className="text-[var(--link)]" /> In-call messages
            </header>
            <ChatPanel consult={consult} me="doctor" otherName={consult.member.name} />
          </section>
          <PatientPanel consult={consult} />
        </div>
      </div>
      <Section title="Notes & prescription draft" sub="AI assist drafts these when the call ends, or start them yourself while you talk. Nothing goes to the patient until you approve it.">
        <NotesRxEditor notes={consult.notes} rx={consult.rx} onChange={(n, r) => saveDraft(consult.id, n, r)} />
      </Section>
    </div>
  );
}

/** After the call: AI assist has drafted the notes & prescription; the doctor
    checks and edits them, then approves — which releases it to the patient. */
function DraftRoom({ consult, doctor }: { consult: Consultation; doctor: Doctor }) {
  const navigate = useNavigate();
  const { saveDraft, approve } = usePlatform.getState();
  const [tried, setTried] = useState(false);
  const problems = draftProblems(consult.notes, consult.rx);

  const submit = () => {
    setTried(true);
    if (problems.length) return;
    approve(consult.id, doctor.id);
    toast.success(`Prescription released to ${consult.member.name} — portal + email`);
    navigate({ to: "/portal/consultations", search: { view: "drafts" } });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {consult.aiDrafted ? (
          <div className="flex gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--tint)] px-4 py-3 text-[13px] text-[var(--body)]">
            <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-[var(--link)]" />
            <span>
              <b className="text-[var(--ink)]">Drafted by AI assist from the call.</b> Check the diagnosis, every medicine and the advice, and edit
              anything that's wrong. Approving signs it in your name and releases it to the patient.
            </span>
          </div>
        ) : null}
        <Section
          title="Check & approve prescription"
          sub={`Version ${consult.rxVersion + 1} — released to the patient's portal and email once you approve`}
          action={
            <Button variant="primary" size="sm" onClick={submit}>
              <BadgeCheck size={14} /> Approve & release
            </Button>
          }
        >
          <NotesRxEditor notes={consult.notes} rx={consult.rx} onChange={(n, r) => saveDraft(consult.id, n, r)} />
          {tried && problems.length ? (
            <ul className="mt-3 grid gap-1 rounded-(--radius-md) bg-[var(--amber-tint)] px-3 py-2 text-[12.5px] font-medium text-[var(--amber-ink)]">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          ) : null}
        </Section>
        <TranscriptPanel
          className="max-h-[420px]"
          lines={consult.transcript}
          live={false}
          startedAt={consult.callStartedAt}
          doctorName={doctor.name}
          patientName={consult.member.name}
        />
      </div>
      <div className="grid content-start gap-5">
        {consult.scripted ? (
          <AiAssist heard={consult.transcript.length} total={TRANSCRIPT_SCRIPT.length} live={false} onUseDraft={() => applyAiDraft(consult, saveDraft)} />
        ) : null}
        <PatientPanel consult={consult} />
        <TimelinePanel consultId={consult.id} />
      </div>
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

function ReadOnly({ consult, doctor, prescriber }: { consult: Consultation; doctor: Doctor; prescriber?: Doctor }) {
  const hasRx = consult.rxVersion > 0;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {hasRx ? (
          <RxDocument consult={consult} prescriber={prescriber} draft={consult.status === "drafting"} />
        ) : null}
        {consult.transcript.length || consult.callStartedAt ? (
          <TranscriptPanel
            className="max-h-[460px]"
            lines={consult.transcript}
            live={consult.status === "in_call"}
            startedAt={consult.callStartedAt}
            doctorName={prescriber?.name ?? doctor.name}
            patientName={consult.member.name}
          />
        ) : null}
        {["queued", "ringing", "callback"].includes(consult.status) ? <CallPanel consult={consult} doctor={doctor} prescriber={prescriber} /> : null}
        {!hasRx && !consult.callStartedAt && !["queued", "ringing", "callback"].includes(consult.status) ? (
          <p className="rounded-(--radius-card) border border-dashed border-[var(--sky-200)] px-4 py-10 text-center text-[13px] text-[var(--mute)]">
            {consult.status === "emergency"
              ? "Red flags at intake — the patient was told to go to the nearest ER. Not queued."
              : consult.status === "ineligible"
                ? "Cover couldn't be confirmed by Centegy HIS. CCPL support is following up with the member."
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

/** A doctor can start a call when they're available and not already on one or being rung. */
function canCall(doctor: Doctor) {
  const busy = usePlatform
    .getState()
    .consultations.some((c) => (c.status === "in_call" || c.status === "ringing") && c.prescriberId === doctor.id);
  return doctor.available && !busy;
}

/** Waiting, ringing or booked for a call back — the way into the live call. Accepting
    or calling puts the consult in_call, and the page switches to the consult room. */
function CallPanel({ consult, doctor, prescriber }: { consult: Consultation; doctor: Doctor; prescriber?: Doctor }) {
  const { acceptCall, declineCall } = usePlatform.getState();
  // Re-render when the doctor's own call state changes, so the button enables.
  usePlatform((s) => s.consultations.filter((c) => c.prescriberId === doctor.id && (c.status === "in_call" || c.status === "ringing")).length);
  const ringingMe = consult.status === "ringing" && consult.prescriberId === doctor.id;
  const ringingOther = consult.status === "ringing" && !ringingMe;
  const callback = consult.status === "callback";
  const free = canCall(doctor);

  const title = ringingMe
    ? `${consult.member.name} is calling you`
    : ringingOther
      ? `Ringing ${prescriber?.name ?? "another GP"}`
      : callback
        ? `Call back booked${consult.callbackAt ? ` for ${fmtTime(consult.callbackAt)}` : ""}`
        : "Waiting for a free GP";
  const sub = ringingOther
    ? "Another doctor is being rung for this patient. You can watch, but not take the call."
    : callback
      ? "The patient asked to be called back. Call now and they're rung in the patient app straight away."
      : ringingMe
        ? "Accept to open the video consult with live transcript and AI assist."
        : `In the queue ${minutesAgo(consult.consentAt ?? consult.createdAt)}. Take the call to ring the patient now.`;

  return (
    <section className="flex flex-col items-center gap-4 rounded-(--radius-card) border border-[var(--line)] bg-(--color-surface) px-6 py-10 text-center shadow-(--shadow-sm)">
      <span className="relative inline-flex">
        <span className="ring-halo" style={{ background: callback || consult.status === "queued" ? "var(--amber)" : "var(--green)" }} />
        <span className="ring-halo delay" style={{ background: callback || consult.status === "queued" ? "var(--amber)" : "var(--green)" }} />
        <Avatar initials={initialsOf(consult.member.name)} size={72} className="relative" />
      </span>
      <div>
        <h2 className="flex items-center justify-center gap-2 text-[18px] font-semibold text-[var(--ink)]">
          {callback ? <CalendarClock size={18} className="text-[var(--amber)]" /> : null}
          {title}
        </h2>
        <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-[var(--mute)]">{sub}</p>
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
      ) : ringingOther ? null : (
        <div className="grid justify-items-center gap-1.5">
          <Button variant="primary" disabled={!free} onClick={() => acceptCall(consult.id, doctor.id)}>
            <PhoneCall size={15} /> Call patient now
          </Button>
          {!free ? (
            <span className="text-[12px] text-[var(--mute)]">
              {doctor.available ? "Finish your current call first." : "You're unavailable — go available to call."}
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}

/** Copy the AI draft into the notes & prescription — the doctor edits from there. */
function applyAiDraft(consult: Consultation, saveDraft: (id: string, n: Consultation["notes"], r: Consultation["rx"]) => void) {
  const hasContent = consult.notes.diagnosis || consult.notes.plan || consult.rx.length;
  if (hasContent && !window.confirm("Replace your current notes & prescription with the AI draft?")) return;
  saveDraft(
    consult.id,
    { ...AI_DRAFT.notes },
    AI_DRAFT.rx.map((r) => ({ ...r, id: Math.random().toString(36).slice(2, 9) })),
  );
  toast.success("AI draft copied — review it before sending");
}
