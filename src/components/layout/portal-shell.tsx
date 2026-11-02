/* Doctor-portal shell — the ERP's AppShell composition:
     TopNav      fixed, 109px
     ModuleRail  fixed, below the header, 240px / 56px collapsed (modules with screens only)
     content     offset by both
   plus the incoming-call card, which can ring on any screen. */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import TopNav, { CHROME_H } from "@/components/layout/top-nav";
import ModuleRail from "@/components/layout/module-rail";
import { RAIL } from "@/config/navigation";
import { isOthersActive } from "@/lib/clinic";
import IncomingCall from "@/features/portal/incoming-call";
import { usePlatform } from "@/store/consult-store";
import type { Doctor } from "@/lib/types";

export default function PortalShell({ doctor, children }: { doctor: Doctor; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const consultations = usePlatform((s) => s.consultations);
  const [collapsed, setCollapsed] = useState(false);

  /* Below 900px the rail collapses to its icon strip rather than squeezing the page. */
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setAutoCollapsed(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const effectiveCollapsed = collapsed || autoCollapsed;

  const moduleKey = pathname.split("/")[2] ?? "dashboard";
  // Inside a single consultation or review the page needs the full width.
  const rail = pathname.split("/").length > 3 ? undefined : RAIL[moduleKey];

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const item of rail?.items ?? []) {
      if (!item.statuses) continue;
      out[item.key] = consultations.filter(
        (c) => item.statuses!.includes(c.status) && !isOthersActive(c, doctor.id) && (!item.mine || c.prescriberId === doctor.id),
      ).length;
    }
    return out;
  }, [rail, consultations, doctor.id]);

  const ringing = consultations.find((c) => c.status === "ringing" && c.prescriberId === doctor.id);

  return (
    <>
      <TopNav doctor={doctor} />
      {rail ? (
        <ModuleRail
          title={rail.title}
          items={rail.items}
          counts={counts}
          collapsed={effectiveCollapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      ) : null}
      <div
        className={`min-h-screen transition-[margin-left] duration-300 ${rail ? (effectiveCollapsed ? "ml-[56px]" : "ml-[240px]") : ""}`}
        style={{ paddingTop: CHROME_H, position: "relative", zIndex: 1 }}
      >
        {children}
      </div>
      <IncomingCall consult={ringing} doctorId={doctor.id} />
    </>
  );
}
