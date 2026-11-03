/* The list table shared by every portal: a tinted header band (uppercase 11.5px),
   hairline row rules, 14px row padding, first column in ink, hover in --sunken. */

import type { ReactNode } from "react";

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-[var(--line)] bg-[var(--sunken)] px-4 py-2.5 text-start text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--mute)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={`border-t border-[var(--hair)] first:border-t-0 ${onClick ? "cursor-pointer hover:bg-[var(--sunken)]" : ""}`}>
      {children}
    </tr>
  );
}

export function Cell({ children, mono, strong, className = "" }: { children: ReactNode; mono?: boolean; strong?: boolean; className?: string }) {
  return (
    <td
      className={`px-4 py-3.5 align-middle ${mono ? "whitespace-nowrap font-mono text-[12.5px]" : ""} ${strong ? "font-semibold text-[var(--ink)]" : "text-[var(--body)]"} ${className}`}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-[13px] text-[var(--mute)]">{children}</p>;
}
