/* In-call chat — Google Meet's "in-call messages": a note on who can see them,
   messages grouped by sender with the time, and a rounded "Send a message"
   box with a send button. Used by the patient's call (meet-call) and the
   doctor's consult room; messages live on the consultation in the shared
   store, so each side sees the other's straight away.
   Prototype: with no doctor tab (a demo auto-answered call) the doctor sends a
   short acknowledgement, so the box isn't silent. */

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { fmtTime } from "@/lib/clinic";
import { usePlatform } from "@/store/consult-store";
import type { ChatMessage, Consultation } from "@/lib/types";

export interface ChatLabels {
  note: string;
  empty: string;
  placeholder: string;
  send: string;
  you: string;
}

export const CHAT_LABELS_EN: ChatLabels = {
  note: "Messages are seen only by you and the patient, and are saved with this consultation.",
  empty: "No messages yet.",
  placeholder: "Send a message",
  send: "Send",
  you: "You",
};

const AUTO_REPLY = "Thanks, I've got that. Let's go through it on the call.";

export default function ChatPanel({
  consult,
  me,
  otherName,
  labels = CHAT_LABELS_EN,
  className = "",
}: {
  consult: Consultation;
  me: ChatMessage["from"];
  otherName: string;
  labels?: ChatLabels;
  className?: string;
}) {
  const sendChat = usePlatform((s) => s.sendChat);
  const [draft, setDraft] = useState("");
  const messages = consult.chat ?? [];
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Demo stand-in for the doctor when no doctor tab is on the call.
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (me !== "patient" || !consult.autoAnswered || consult.status !== "in_call" || last?.from !== "patient") return;
    const timer = window.setTimeout(() => sendChat(consult.id, "doctor", AUTO_REPLY), 2200);
    return () => window.clearTimeout(timer);
  }, [me, consult.autoAnswered, consult.status, consult.id, last?.id, last?.from, sendChat]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    sendChat(consult.id, me, text);
    setDraft("");
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div ref={scroller} className="slim-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-4 rounded-(--radius-md) bg-[var(--sunken)] px-3 py-2.5 text-center text-[12px] leading-relaxed text-[var(--mute)]">{labels.note}</p>
        {messages.length === 0 ? <p className="px-2 py-4 text-center text-[13px] text-[var(--mute)]">{labels.empty}</p> : null}
        <div className="grid gap-3">
          {messages.map((m, i) => {
            const mine = m.from === me;
            // Meet groups consecutive messages from one sender under a single name line.
            const grouped = i > 0 && messages[i - 1].from === m.from && m.at - messages[i - 1].at < 60_000;
            return (
              <div key={m.id} className={`line-in ${grouped ? "-mt-2" : ""}`}>
                {!grouped ? (
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-[var(--ink)]">{mine ? labels.you : otherName}</span>
                    <span className="font-mono text-[11px] text-[var(--mute)]" dir="ltr">
                      {fmtTime(m.at)}
                    </span>
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[var(--body)]" dir="auto">
                  {m.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <form
        className="border-t border-[var(--hair)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-center gap-1 rounded-(--radius-pill) bg-[var(--sunken)] py-1 ps-4 pe-1 focus-within:ring-2 focus-within:ring-[var(--sky-300)]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={labels.placeholder}
            aria-label={labels.placeholder}
            dir="auto"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13.5px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={labels.send}
            title={labels.send}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[var(--link)] hover:bg-[var(--hair)] disabled:text-[var(--faint)] disabled:hover:bg-transparent"
          >
            <SendHorizontal size={18} className="rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </div>
  );
}
