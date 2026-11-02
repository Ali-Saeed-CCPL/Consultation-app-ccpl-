import { PhoneCall } from "lucide-react";
import Tag from "@/components/ui/tag";
import { STATUS_META } from "@/lib/clinic";
import type { ConsultStatus } from "@/lib/types";

/** Statuses that ring (pulse + shaking phone) or tick (blinking dot) while live. */
const RINGS: ConsultStatus[] = ["ringing", "callback"];
const TICKS: ConsultStatus[] = ["queued", "in_call"];

export default function StatusTag({ status }: { status: ConsultStatus }) {
  const meta = STATUS_META[status];
  if (RINGS.includes(status)) {
    return (
      <Tag tone={meta.tone} className="tag-ring">
        <PhoneCall size={12} className="phone-wiggle" /> {meta.label}
      </Tag>
    );
  }
  if (TICKS.includes(status)) {
    return (
      <Tag tone={meta.tone}>
        <span className="pulse-dot" /> {meta.label}
      </Tag>
    );
  }
  return <Tag tone={meta.tone}>{meta.label}</Tag>;
}
