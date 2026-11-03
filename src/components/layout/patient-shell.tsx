/* Patient web app shell — desktop-first, in the ERP's chrome: the brand
   hairline, a 62px white row (logo + product | clock, language, theme,
   account) and a 44px tab band (Home · New consultation · Prescriptions &
   records), then the page across the full width, padded like the ERP (24px). The language switch
   (English / اردو) flips the whole page right-to-left. On a phone the clock
   hides and the band scrolls sideways. */

import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import BrandHairline from "@/components/common/brand-hairline";
import LiveClock from "@/components/common/live-clock";
import ThemeToggle from "@/components/common/theme-toggle";
import NotificationBell from "@/components/layout/notification-bell";
import UserMenu from "@/components/layout/user-menu";
import { initialsOf } from "@/components/ui/avatar";
import { BRAND, LOGO_SRC } from "@/config/app.constants";
import { HOUSEHOLD } from "@/data/seed";
import { useT, type StringKey } from "@/lib/i18n";
import { useSession } from "@/store/session-store";
import type { Lang } from "@/lib/types";

const FLOW = ["/patient/choose", "/patient/consent", "/patient/symptoms", "/patient/emergency", "/patient/queue", "/patient/call"];

const TABS: { key: StringKey; to: string; active: (path: string) => boolean }[] = [
  { key: "navHome", to: "/patient/home", active: (p) => p === "/patient/home" },
  { key: "navNew", to: "/patient/choose", active: (p) => FLOW.includes(p) },
  { key: "navRecords", to: "/patient/records", active: (p) => p === "/patient/records" },
];

export default function PatientShell({ children }: { children: ReactNode }) {
  const { t, lang } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setLang = useSession((s) => s.setLang);
  const phone = useSession((s) => s.patientPhone);
  const username = useSession((s) => s.username);
  const signOut = useSession((s) => s.signOut);
  const navigate = useNavigate();
  const holder = HOUSEHOLD.members.find((m) => m.relation === "self")!;

  return (
    <div className="min-h-screen bg-[var(--canvas)]" lang={lang} dir={lang === "ur" ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 bg-[var(--chrome)]">
        <BrandHairline />
        {/* Row 1 — white chrome */}
        <div className="flex h-[62px] items-center gap-3 border-b border-[var(--line)] px-4 sm:gap-4 sm:px-6">
          <Link to="/patient/home" className="flex min-w-0 items-center gap-3">
            <img src={LOGO_SRC} alt={BRAND} className="h-[34px] w-auto flex-shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--ink)]">{t("appName")}</span>
              <span className="hidden truncate text-[11.5px] leading-tight text-[var(--mute)] sm:block">{t("brandSub")}</span>
            </span>
          </Link>
          <div className="ms-auto flex flex-shrink-0 items-center gap-2.5">
            <span className="hidden lg:block">
              <LiveClock locale={lang === "ur" ? "ur-PK" : "en-PK"} />
            </span>
            <LangSwitch lang={lang} onChange={setLang} />
            <ThemeToggle />
            {phone ? (
              <NotificationBell
                reader={{ kind: "patient", phone, lang }}
                user={`patient:${phone}`}
                labels={{ title: t("notifTitle"), markAll: t("notifMarkAll"), empty: t("notifEmpty") }}
              />
            ) : null}
            {phone ? (
              <UserMenu
                initials={initialsOf(holder.name)}
                name={lang === "ur" ? holder.nameUr : holder.name}
                id={`${username ?? "patient"} · ${phone.slice(0, 4)} ${phone.slice(4)}`}
                role={t("rolePolicyholder")}
                items={[]}
                signOutLabel={t("signOut")}
                onSignOut={() => {
                  signOut();
                  navigate({ to: "/login" });
                }}
              />
            ) : null}
          </div>
        </div>
        {/* Row 2 — tab band */}
        <nav className="nav-band flex h-11 items-center gap-6 overflow-x-auto px-6" aria-label="Sections">
          {TABS.map((tab) => {
            const active = tab.active(pathname);
            return (
              <Link
                key={tab.key}
                to={tab.to}
                data-active={active}
                className="flex h-full items-center whitespace-nowrap border-b-2 border-transparent text-[13px] transition-colors"
              >
                {t(tab.key)}
              </Link>
            );
          })}
          <span className="nav-band-note ms-auto hidden whitespace-nowrap text-[12px] md:block">{t("needHelp")}</span>
        </nav>
      </header>
      <main className="w-full px-4 pb-6 pt-6 sm:px-6">{children}</main>
    </div>
  );
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div role="radiogroup" aria-label="Language" className="flex rounded-(--radius-pill) border border-[var(--line)] bg-[var(--sunken)] p-0.5" dir="ltr">
      {(
        [
          ["en", "EN"],
          ["ur", "اردو"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={lang === key}
          onClick={() => onChange(key)}
          className={`rounded-(--radius-pill) px-2.5 py-0.5 text-[12px] font-semibold ${
            lang === key ? "bg-[var(--white)] text-[var(--ink)] shadow-(--shadow-xs)" : "text-[var(--mute)] hover:text-[var(--ink)]"
          } ${key === "ur" ? "urdu leading-[1.6]" : ""}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
