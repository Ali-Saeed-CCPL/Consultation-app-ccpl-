/* Video consult — the patient joins in the browser, in a Google Meet-style
   room (features/patient/meet-call.tsx). When the doctor ends the call the
   screen explains what happens next: AI draft → the doctor checks and approves → release. */

import { Navigate, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileCheck2, Sparkles, Stethoscope } from "lucide-react";
import PatientStep, { PrimaryAction } from "@/features/patient/patient-step";
import MeetCall from "@/features/patient/meet-call";
import { useScriptedTranscript } from "@/features/consult/use-scripted-transcript";
import { useT } from "@/lib/i18n";
import { useConsult, usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";

export default function CallScreen() {
  const { t } = useT();
  const navigate = useNavigate();
  const consultId = useSession((s) => s.consultId);
  const consult = useConsult(consultId ?? undefined);
  const doctors = usePlatform((s) => s.doctors);
  const endCall = usePlatform((s) => s.endCall);
  const doctor = doctors.find((d) => d.id === consult?.prescriberId);

  // An auto-answered call has no doctor tab, so this tab plays the transcript.
  useScriptedTranscript(consult, doctor?.name ?? "", Boolean(consult?.autoAnswered));

  if (!consult) return <Navigate to="/patient/choose" />;
  if (["queued", "ringing", "callback"].includes(consult.status)) return <Navigate to="/patient/queue" />;

  if (consult.status === "in_call" && doctor) {
    return <MeetCall consult={consult} doctor={doctor} onLeave={() => endCall(consult.id, doctor.id)} />;
  }

  const released = consult.status === "approved" || consult.status === "closed";
  return (
    <PatientStep
      step="consult"
      title={
        <span className="flex items-center gap-2.5">
          <CheckCircle2 size={26} className="text-[var(--green)]" /> {t("callEnded")}
        </span>
      }
      lede={t("callEndedSub", { doctor: doctor?.name ?? "" })}
      footer={<PrimaryAction onClick={() => navigate({ to: "/patient/records" })}>{t("viewRecords")}</PrimaryAction>}
    >
      <ol className="grid gap-3 md:grid-cols-3">
        <Milestone done icon={<Stethoscope size={16} />} label={doctor?.name ?? "—"} />
        <Milestone done icon={<Sparkles size={16} />} label={t("msAiDraft")} />
        <Milestone done={released} icon={<FileCheck2 size={16} />} label={released ? t("infoDoctorApproved") : t("awaitingReview")} />
      </ol>
    </PatientStep>
  );
}

function Milestone({ done, icon, label }: { done: boolean; icon: React.ReactNode; label: string }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-(--radius-card) border px-4 py-3 text-[14px] ${
        done ? "border-[var(--line)] bg-[var(--white)] text-[var(--ink)]" : "border-dashed border-[var(--sky-200)] bg-transparent text-[var(--mute)]"
      }`}
    >
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-[var(--green-tint)] text-[var(--green)]" : "bg-[var(--sunken)] text-[var(--faint)]"}`}>
        {icon}
      </span>
      {label}
    </li>
  );
}
