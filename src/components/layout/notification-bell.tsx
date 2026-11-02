/* Notification bell for the header — the ERP's NotificationBell: a bell with a
   red unread count, and a 340px dropdown with "Mark all as read". Clicking a
   notice marks it read and opens what it's about. New notices that someone
   else caused also pop a toast, as the ERP's live stream does. */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useNotifications, useNotifRead, type AppNotification, type NotifTone, type Reader } from "@/lib/notifications";

const TONE: Record<NotifTone, string> = {
  call: "var(--green)",
  info: "var(--link)",
  ok: "var(--green)",
  warn: "var(--amber)",
  err: "var(--red)",
};

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell({
  reader,
  user,
  labels = { title: "Notifications", markAll: "Mark all as read", empty: "No notifications yet. Queue, calls, AI drafts to approve and released prescriptions appear here." },
}: {
  reader: Reader;
  /** Read state is kept under this key. */
  user: string;
  labels?: { title: string; markAll: string; empty: string };
}) {
  const navigate = useNavigate();
  const notifications = useNotifications(reader);
  const readIds = useNotifRead((s) => s.read[user]);
  const markRead = useNotifRead((s) => s.markRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);

  const isRead = (n: AppNotification) => n.own || Boolean(readIds?.includes(n.id));
  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  // Toast notices that arrive while the page is open (not the backlog, not your own, not calls — those ring already).
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.own && n.tone !== "call") toast(n.title, { description: n.message });
    }
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `${labels.title}, ${unreadCount} unread` : labels.title}
        title={labels.title}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--mute)] transition-colors hover:bg-[var(--hair)] hover:text-[var(--ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--teal)]"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--red)] px-1 text-[9.5px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+8px)] z-[60001] flex max-h-[420px] w-[340px] flex-col overflow-hidden rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-menu)"
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--hair)] px-4 py-2.5">
            <span className="text-[12.5px] font-semibold text-[var(--ink)]">{labels.title}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markRead(user, notifications.map((n) => n.id))}
                className="text-[11px] font-semibold text-[var(--teal)] hover:underline"
              >
                {labels.markAll}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-[var(--mute)]">{labels.empty}</div>
            ) : (
              notifications.map((n) => {
                const read = isRead(n);
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => {
                      markRead(user, [n.id]);
                      setOpen(false);
                      navigate(n.href as never);
                    }}
                    className={`flex w-full gap-2.5 border-b border-[var(--hair)] px-4 py-2.5 text-start last:border-b-0 hover:bg-[var(--hair)] ${read ? "" : "bg-[var(--teal-tint)]"}`}
                  >
                    <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: read ? "var(--line)" : TONE[n.tone] }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-[var(--ink)]">{n.title}</div>
                      <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--mute)]">{n.message}</div>
                      <div className="mt-1 font-mono text-[10px] text-[var(--faint,var(--mute))]" dir="ltr">
                        {timeAgo(n.at)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
