/* Video consult — the patient joins in the browser, in a Google Meet-style
   room (features/patient/meet-call.tsx). The doctor releases the prescription
   during the call and only then ends it, so the ended screen always has it. */

import { Navigate, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Download, FileCheck2, Sparkles, Stethoscope } from "lucide-react";
import PatientStep, { PrimaryAction, SecondaryAction } from "@/features/patient/patient-step";
import MeetCall from "@/features/patient/meet-call";
import RxDocument, { downloadRx, rxLabels } from "@/features/consult/rx-document";
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
  if (["queued", "ringing"].includes(consult.status)) return <Navigate to="/patient/queue" />;

  // Released mid-call → it opens in the call's side panel (meet-call.tsx).
  if (consult.status === "in_call" && doctor) {
    // Leaving before the prescription is released only closes the video here — the
    // consultation stays live with the doctor, who releases it and ends the call.
    const leave = () => (consult.approvedAt ? endCall(consult.id, doctor.id) : navigate({ to: "/patient/home" }));
    return <MeetCall consult={consult} doctor={doctor} onLeave={leave} />;
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
      lede={t("callEndedReleased", { doctor: doctor?.name ?? "" })}
      footer={
        <>
          {released ? (
            <SecondaryAction onClick={() => downloadRx(consult.id)}>
              <Download size={15} /> {t("download")}
            </SecondaryAction>
          ) : null}
          <PrimaryAction onClick={() => navigate({ to: "/patient/records" })}>{t("viewRecords")}</PrimaryAction>
        </>
      }
    >
      <ol className="grid gap-3 md:grid-cols-3">
        <Milestone done icon={<Stethoscope size={16} />} label={doctor?.name ?? "—"} />
        <Milestone done icon={<Sparkles size={16} />} label={t("msAiDraft")} />
        <Milestone done icon={<FileCheck2 size={16} />} label={t("infoDoctorApproved")} />
      </ol>
      {released ? (
        <div className="mt-5">
          <RxDocument consult={consult} prescriber={doctor} labels={rxLabels(t)} />
        </div>
      ) : null}
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
