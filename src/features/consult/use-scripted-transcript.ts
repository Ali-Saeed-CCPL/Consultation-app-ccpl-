/* Stand-in for the transcription service: plays the scripted consult into
   the consultation a line at a time while the call is live. Exactly one tab
   should drive it — the doctor's consult room normally, the patient's call
   screen when the call was auto-answered (no doctor tab). */

import { useEffect } from "react";
import { TRANSCRIPT_SCRIPT } from "@/data/seed";
import { usePlatform } from "@/store/consult-store";
import type { Consultation } from "@/lib/types";

/** Gap between scripted transcript lines. */
const LINE_EVERY_MS = 2600;

export function useScriptedTranscript(consult: Consultation | undefined, doctorName: string, enabled: boolean) {
  const appendTranscript = usePlatform((s) => s.appendTranscript);
  const heard = consult?.transcript.length ?? 0;
  const live = enabled && consult?.status === "in_call" && consult.scripted;
  useEffect(() => {
    if (!live || !consult || heard >= TRANSCRIPT_SCRIPT.length) return;
    const timer = window.setTimeout(() => {
      const line = TRANSCRIPT_SCRIPT[heard];
      appendTranscript(consult.id, { ...line, text: line.text.replace("Dr. Ayesha", doctorName.split(" ").slice(0, 2).join(" ")) });
    }, heard === 0 ? 1200 : LINE_EVERY_MS);
    return () => window.clearTimeout(timer);
  }, [consult?.id, live, heard, appendTranscript, doctorName]); // eslint-disable-line react-hooks/exhaustive-deps -- consult object changes every line
}
