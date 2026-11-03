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
  const doctors = usePlatform((s) => s.doctors);
  const setAvailability = usePlatform((s) => s.setAvailability);
  const resetDemo = usePlatform((s) => s.resetDemo);
  const signInDoctor = useSession((s) => s.signInDoctor);
  const signOut = useSession((s) => s.signOut);
  const username = useSession((s) => s.username);

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
          {/* Availability — a GP only gets rung while available. */}
          <button
            type="button"
            onClick={() => setAvailability(doctor.id, !doctor.available)}
            className={`inline-flex items-center gap-2 rounded-(--radius-pill) border px-3 py-1.5 text-[12.5px] font-semibold ${
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
          <ThemeToggle />
          <NotificationBell reader={{ kind: "doctor", id: doctor.id, name: doctor.name }} user={`doctor:${doctor.id}`} />
          <UserMenu
            initials={doctor.initials}
            name={doctor.name}
            id={`${username ?? "doctor"} · ${doctor.pmdc}`}
            role="GP"
            items={[
              { label: "My profile", onClick: () => toast("Doctor profiles come with ccpl-api.") },
              {
                label: "Reset demo data",
                onClick: () => {
                  resetDemo();
                  toast.success("Demo data reset");
                },
              },
            ]}
            extra={(close) => (
              <div className="border-b border-[var(--hair)] pb-1">
                <p className="px-4 pt-3 pb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)]">
                  Switch doctor (demo)
                </p>
                {doctors
                  .filter((d) => d.id !== doctor.id && d.active !== false)
                  .map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        close();
                        signInDoctor(d.id, username ?? "doctor");
                        toast.success(`Signed in as ${d.name}`);
                      }}
                      className="block w-full px-4 py-2 text-left text-[13px] text-[var(--body)] hover:bg-[var(--hair)]"
                    >
                      {d.name}
                    </button>
                  ))}
              </div>
            )}
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
              items={[
                {
                  label: "Reset demo data",
                  onClick: () => {
                    resetDemo();
                    toast.success("Demo data reset");
                  },
                },
              ]}
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
