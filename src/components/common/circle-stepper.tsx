/* Numbered circle-node stepper with a filled progress rail, ported from the
   Product Factory wizard's stepper (components/products/ChildProductBuilder.tsx)
   so multi-stage flows elsewhere in the app can share the same look. By
   default only completed steps (index < activeIdx) are clickable — a step
   you haven't reached yet stays disabled, same as the wizard it's ported
   from, which suits a one-directional process like Issue Policy. Pass
   `freeNavigation` for a flow where every stage should be jumpable at any
   time (e.g. Corporate Policy Setup, a form the user can browse in any
   order rather than a linear transaction). */

import type { ReactNode } from "react";
import styles from "@/components/common/circle-stepper.module.css";

export interface CircleStepperItem {
  label: string;
  note: string;
  /** Shown in the node instead of its number, for steps before they're done
      (e.g. a channel icon on an automated pipeline). Falls back to the
      numbered/check behaviour when omitted. */
  icon?: ReactNode;
}

interface Props {
  items: CircleStepperItem[];
  activeIdx: number;
  onStepChange?: (idx: number) => void;
  freeNavigation?: boolean;
  /** Pulses the active node — for a stepper that's driving a live, automated
      process (e.g. a delivery pipeline) rather than waiting on the operator. */
  busy?: boolean;
}

export default function CircleStepper({ items, activeIdx, onStepChange, freeNavigation = false, busy = false }: Props) {
  const progress = items.length <= 1 ? 0 : (activeIdx / (items.length - 1)) * 100;

  return (
    <div className={styles.stepper} role="tablist">
      <div
        className={styles.track}
        style={{ left: `${50 / items.length}%`, right: `${50 / items.length}%` }}
      >
        <i className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
      {items.map((item, i) => {
        const cls = i === activeIdx ? `${styles.current} ${busy ? styles.busy : ""}` : i < activeIdx ? styles.done : "";
        const clickable = Boolean(onStepChange) && (freeNavigation || i <= activeIdx);
        return (
          <button
            key={item.label}
            type="button"
            className={`${styles.step} ${cls}`}
            disabled={!clickable}
            role="tab"
            aria-selected={i === activeIdx}
            onClick={() => onStepChange?.(i)}
          >
            <span className={styles.rail}>
              <span className={styles.node}>
                {i < activeIdx ? "✓" : (item.icon ?? String(i + 1).padStart(2, "0"))}
              </span>
            </span>
            <span className={styles.label}>
              <b>{item.label}</b>
              <span>{item.note}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
