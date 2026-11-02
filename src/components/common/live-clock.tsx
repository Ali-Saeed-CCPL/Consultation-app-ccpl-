/* Date and time in Pakistan, ticking — the header clock in both views. */

import { Clock } from "lucide-react";
import { CLINIC_HOURS } from "@/lib/clinic";
import { useNow } from "@/lib/use-now";

export default function LiveClock({ locale = "en-PK", className = "" }: { locale?: string; className?: string }) {
  const now = useNow(1000);
  const date = new Date(now).toLocaleDateString(locale, { timeZone: CLINIC_HOURS.tz, weekday: "short", day: "numeric", month: "short" });
  const time = new Date(now).toLocaleTimeString("en-PK", { timeZone: CLINIC_HOURS.tz, hour: "numeric", minute: "2-digit", second: "2-digit" });
  return (
    <span className={`inline-flex items-center gap-2 rounded-(--radius-pill) border border-[var(--line)] bg-[var(--sunken)] px-3 py-1.5 text-[12px] text-[var(--body)] ${className}`}>
      <Clock size={13} className="text-[var(--mute)]" />
      <span>{date}</span>
      <span className="font-mono font-semibold text-[var(--ink)]" dir="ltr">
        {time}
      </span>
      <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[var(--faint)]">PKT</span>
    </span>
  );
}
