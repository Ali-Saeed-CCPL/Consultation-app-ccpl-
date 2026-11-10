/* Doctor-portal header — the ERP's TopNav, same measurements: a 3px brand
   hairline, a 62px white chrome row (logo + product name | availability,
   theme, notifications, account menu) and a 44px module band with the active tab underlined in
   --link. Heights are exported so the shell offsets the rail and content by
   exactly the same amount. */

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import BrandHairline from "@/components/common/brand-hairline";
import ThemeToggle from "@/components/common/theme-toggle";
import NotificationBell from "@/components/layout/notification-bell";
import UserMenu from "@/components/layout/user-menu";
import { APP_NAME, BRAND, LOGO_SRC } from "@/config/app.constants";
import { ADMIN_MODULES, PORTAL_MODULES } from "@/config/navigation";
import { useAvailabilityToggle } from "@/features/portal/use-doctor-presence";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";
import type { Doctor } from "@/lib/types";

/** Combined height of the header: the 3px brand hairline + both rows. */
export const CHROME_H = 109;

/** With a doctor it's the doctor portal; without one, the clinic admin's portal (no availability, no call alerts). */
export default function TopNav({ doctor }: { doctor?: Doctor }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = doctor ? "/portal" : "/admin";
  const modules = doctor ? PORTAL_MODULES : ADMIN_MODULES;
  const navigate = useNavigate();
  const resetDemo = usePlatform((s) => s.resetDemo);
  const signOut = useSession((s) => s.signOut);
  const username = useSession((s) => s.username);
  const changePassword = { label: "Change password", to: "/change-password" };
  const resetDemoItem = {
    label: "Reset demo data",
    onClick: () => {
      resetDemo();
      toast.success("Demo data reset");
    },
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[50000] font-sans">
      <BrandHairline />
      {/* Row 1 — white chrome */}
      <div className="flex items-center gap-4 h-[62px] px-6 bg-[var(--chrome)] border-b border-[var(--line)]">
        <Link to={`${base}/dashboard`} className="flex items-center gap-3 flex-shrink-0">
          <img src={LOGO_SRC} alt={BRAND} className="h-[34px] w-auto" />
          <span className="hidden md:block text-[15px] font-semibold tracking-tight text-[var(--ink)]">{APP_NAME}</span>
          <span className="hidden lg:inline-flex font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)] border border-[var(--line)] rounded-(--radius-pill) px-2 py-0.5">
            {doctor ? "Doctor portal" : "Admin portal"}
          </span>
        </Link>

        {doctor ? (
        <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">
          <AvailabilitySwitch doctor={doctor} />
          <ThemeToggle />
          <NotificationBell reader={{ kind: "doctor", id: doctor.id, name: doctor.name }} user={`doctor:${doctor.id}`} />
          <UserMenu
            initials={doctor.initials}
            name={doctor.name}
            id={`${username ?? "doctor"} · ${doctor.pmdc}`}
            role="GP"
            items={[changePassword, resetDemoItem]}
            onSignOut={() => {
              signOut();
              navigate({ to: "/login" });
            }}
          />
        </div>
        ) : (
          <div className="flex items-center gap-2.5 ml-auto flex-shrink-0">
            <ThemeToggle />
            <UserMenu
              initials="CA"
              name="Clinic admin"
              id={username ?? "admin"}
              role="Admin"
              items={[changePassword, resetDemoItem]}
              onSignOut={() => {
                signOut();
                navigate({ to: "/login" });
              }}
            />
          </div>
        )}
      </div>

      {/* Row 2 — module band */}
      <nav
        className="nav-band flex items-center gap-6 h-11 px-6 overflow-x-auto"
        aria-label="Modules"
      >
        {modules.map(({ label, to, key }) => {
          const isActive = pathname.startsWith(`${base}/${key}`);
          return (
            <Link
              key={key}
              to={to}
              data-active={isActive}
              className="flex items-center h-full border-b-2 border-transparent text-[13px] whitespace-nowrap transition-colors"
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** Availability — a GP only gets rung while available. Saved on the server first. */
function AvailabilitySwitch({ doctor }: { doctor: Doctor }) {
  const { toggle, saving } = useAvailabilityToggle(doctor);
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={saving}
      className={`inline-flex items-center gap-2 rounded-(--radius-pill) border px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-60 ${
        doctor.available
          ? "border-[var(--color-green)] bg-[var(--green-tint)] text-[var(--color-green-ink)]"
          : "border-[var(--border-input)] bg-[var(--white)] text-[var(--mute)]"
      }`}
      aria-pressed={doctor.available}
      title="Only available GPs are rung for new patients"
    >
      <span className={`h-2 w-2 rounded-full ${doctor.available ? "bg-[var(--green)]" : "bg-[var(--faint)]"}`} />
      {doctor.available ? "Available" : "Unavailable"}
    </button>
  );
}
