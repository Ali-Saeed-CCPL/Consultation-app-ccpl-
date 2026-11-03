/* Patient home — where sign-in lands. A greeting by Pakistan time with the
   date, the clinic's live status, then: start (or return to) a consultation,
   who's covered, recent consultations, clinic hours and emergency advice. */

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CalendarDays, ClipboardList, Clock, FileCheck2, Headphones, PhoneCall, Siren, Stethoscope, Users, Video } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import { HOUSEHOLD } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { hasHistory } from "@/lib/profile";
import { fmtDateTime, greetingKey, isClinicOpen, nextOpening, CLINIC_HOURS } from "@/lib/clinic";
import { useT, type StringKey } from "@/lib/i18n";
import { useNow } from "@/lib/use-now";
import { usePlatform } from "@/store/consult-store";
import { useSession } from "@/store/session-store";
import type { ConsultStatus } from "@/lib/types";

/** Where an unfinished consultation picks up again. */
const RESUME: Partial<Record<ConsultStatus, string>> = {
  intake: "/patient/consent",
  queued: "/patient/queue",
  ringing: "/patient/queue",
  in_call: "/patient/call",
};

export default function HomeScreen() {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const now = useNow(30_000);
  const phone = useSession((s) => s.patientPhone)!;
  const consultId = useSession((s) => s.consultId);
  const consultations = usePlatform((s) => s.consultations);
  const doctors = usePlatform((s) => s.doctors);
  const profiles = usePlatform((s) => s.profiles);
  const forceOpen = usePlatform((s) => s.forceClinicOpen);

  const holder = HOUSEHOLD.members.find((m) => m.relation === "self")!;
  const firstName = (lang === "ur" ? holder.nameUr : holder.name).split(" ")[0];
  const open = forceOpen || isClinicOpen(now);
  const busy = new Set(consultations.filter((c) => c.status === "in_call" || c.status === "ringing").map((c) => c.prescriberId));
  const freeDoctors = doctors.filter((d) => d.available && !busy.has(d.id)).length;
  const mine = consultations.filter((c) => c.householdPhone === phone).sort((a, b) => b.createdAt - a.createdAt);
  const active = mine.find((c) => c.id === consultId && RESUME[c.status]);
  const rxReady = mine.filter((c) => c.status === "approved" || c.status === "closed").length;
  const recent = mine.filter((c) => c.status !== "intake").slice(0, 6);
  const locale = lang === "ur" ? "ur-PK" : "en-PK";
  const dateLine = new Date(now).toLocaleDateString(locale, { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-5 line-in">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden surface-brand rounded-(--radius-xl) px-6 py-5 text-white lg:px-8">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-[720px]">
            <p className="text-[13px] font-medium text-white/75">{dateLine}</p>
            <h1 className="page-title mt-1 !text-white sm:text-[28px]">
              {t(greetingKey(now))}, {firstName}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatusTile
              tone={open ? "ok" : "off"}
              icon={<Clock size={16} />}
              title={open ? t("clinicOpenNow") : t("clinicClosedNow")}
              note={open ? t("clinicClosesAt") : t("clinicOpensAt", { time: fmtDateTime(nextOpening(now)) })}
            />
            <StatusTile tone={freeDoctors ? "ok" : "warn"} icon={<Stethoscope size={16} />} title={t(freeDoctors === 1 ? "doctorFree" : "doctorsFree", { n: freeDoctors })} note={`${CLINIC_HOURS.days} · 9–6`} />
            <StatusTile tone="neutral" icon={<CalendarClock size={16} />} title={t("estWait")} note={HOUSEHOLD.partner} />
            <StatusTile
              tone={rxReady ? "ok" : "neutral"}
              icon={<FileCheck2 size={16} />}
              title={t(rxReady === 1 ? "rxReadyOne" : "rxReady", { n: rxReady })}
              note=""
            />
          </div>
        </div>
      </section>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <QuickTile icon={<Video size={20} />} title={t("newConsult")} onClick={() => navigate({ to: "/patient/choose" })} />
        <QuickTile icon={<FileCheck2 size={20} />} title={t("recordsTitle")} onClick={() => navigate({ to: "/patient/members" })} />
        <QuickTile icon={<Headphones size={20} />} title={t("callSupport")} note="0800-00-2273" href="tel:0800002273" />
        <QuickTile icon={<Siren size={20} />} title={t("sosTitle")} note="1122" href="tel:1122" danger />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Start / resume ─────────────────────────────────────────────── */}
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-6 shadow-(--shadow-sm) lg:col-span-2 xl:col-span-1">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center icon-tile rounded-(--radius-lg)">
              <Video size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="section-title !text-[17px]">{t("startTitle")}</h2>
            </div>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-4">
            {(["how1", "how2", "how3", "how4"] as StringKey[]).map((k, i) => (
              <li key={k} className="rounded-(--radius-md) bg-[var(--sunken)] px-3.5 py-3">
                <span className="font-mono text-[11px] font-semibold text-[var(--link)]" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--ink)]">{t(k)}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {active ? (
              <button
                type="button"
                onClick={() => navigate({ to: RESUME[active.status]! })}
                className="inline-flex items-center gap-2 h-10 rounded-(--radius-md) border border-[var(--green)] bg-[var(--green)] px-5 text-[14px] font-semibold text-[var(--color-on-fill)] hover:brightness-110"
              >
                <PhoneCall size={16} /> {t("resumeCta")} <span className="font-mono text-[12px] opacity-80">{active.id}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate({ to: "/patient/choose" })}
              className="inline-flex h-10 items-center gap-2 rounded-(--radius-md) btn-royal border border-transparent text-white px-5 text-[14px] font-semibold"
            >
              {t("startCta")} <ArrowRight size={16} className={lang === "ur" ? "-scale-x-100" : undefined} />
            </button>
          </div>
        </section>

        {/* ── Family ─────────────────────────────────────────────────────── */}
        <Card
          title={t("familyTitle")}
          icon={<Users size={16} />}
          sub={<span className="font-mono" dir="ltr">{HOUSEHOLD.policy}</span>}
          action={
            <Link to="/patient/members" className="text-[13px] font-semibold">
              {t("navMembers")}
            </Link>
          }
        >
          <ul className="divide-y divide-[var(--hair)]">
            {HOUSEHOLD.members.map((m) => (
              <li key={m.id}>
                <Link to="/patient/members" search={{ member: m.id, view: "profile" }} className="-mx-2 flex items-center gap-3 rounded-(--radius-md) px-2 py-2.5 !no-underline hover:bg-[var(--sunken)]">
                <Avatar initials={initialsOf(m.name)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{lang === "ur" ? m.nameUr : m.name}</div>
                  <div className="truncate text-[12px] text-[var(--mute)]">
                    {t(`rel_${m.relation}` as StringKey)} · {t("years", { n: m.age })}
                    {hasHistory(profiles[m.id]) ? null : <span className="text-[var(--faint)]"> · {t("profileNever")}</span>}
                  </div>
                </div>
                <span
                  className={`rounded-(--radius-pill) px-2.5 py-0.5 text-[11.5px] font-semibold ${
                    m.coverage === "active" ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
                  }`}
                >
                  {m.coverage === "active" ? t("coverActive") : t("coverLapsed")}
                </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Hours ──────────────────────────────────────────────────────── */}
        <div className="grid lg:col-span-2 xl:col-span-1">
          <ClinicHours now={now} open={open} />
        </div>
      </div>

      {/* ── Recent ───────────────────────────────────────────────────────── */}
        <Card
          title={t("recentTitle")}
          icon={<ClipboardList size={16} />}
          action={
            <Link to="/patient/members" className="text-[13px] font-semibold">
              {t("viewAll")}
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-8 text-center text-[13.5px] text-[var(--mute)]">{t("noRecords")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((c) => {
                const complaint = complaintText(c.symptoms, lang);
                const doctor = doctors.find((d) => d.id === c.prescriberId);
                return (
                  <li key={c.id}>
                    <Link
                      to="/patient/members"
                      search={{ member: c.member.id, view: "records", visit: c.id }}
                      className="flex h-full flex-col gap-3 rounded-(--radius-lg) border border-[var(--line)] p-4 !text-inherit hover:border-[var(--sky-300)] hover:bg-[var(--sunken)]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar initials={initialsOf(c.member.name)} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold text-[var(--ink)]">{lang === "ur" ? c.member.nameUr : c.member.name}</div>
                          <div className="truncate text-[12.5px] text-[var(--mute)]">{complaint || "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="truncate text-[var(--body)]">
                          {fmtDateTime(c.createdAt)} · {doctor ? doctor.name : c.status === "ineligible" ? t("supportFollowUp") : "—"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
    </div>
  );
}

/** Clinic hours as a calendar and a clock: this week (today marked, weekends closed),
    the clinic day as a 9–6 line with where "now" is, and how long until it closes or opens. */
function ClinicHours({ now, open }: { now: number; open: boolean }) {
  const { t, lang } = useT();
  const tz = CLINIC_HOURS.tz;
  const locale = lang === "ur" ? "ur-PK" : "en-PK";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = days.indexOf(new Date(now).toLocaleDateString("en-US", { timeZone: tz, weekday: "short" }));
  const week = days.map((_, i) => {
    const at = now + (i - today) * 86_400_000;
    return {
      at,
      name: new Date(at).toLocaleDateString(locale, { timeZone: tz, weekday: "short" }),
      date: new Date(at).toLocaleDateString("en-US", { timeZone: tz, day: "numeric" }),
      openDay: i < 5,
      isToday: i === today,
    };
  });
  const [hh, mm] = new Date(now).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  const minutes = hh * 60 + mm;
  const start = CLINIC_HOURS.open * 60;
  const end = CLINIC_HOURS.close * 60;
  const inHours = today < 5 && minutes >= start && minutes < end;
  const left = end - minutes;
  const pct = Math.min(100, Math.max(0, ((minutes - start) / (end - start)) * 100));
  const status = inHours
    ? t("closesIn", { t: `${Math.floor(left / 60)}h ${left % 60}m` })
    : open
      ? t("clinicClosesAt")
      : t("clinicOpensAt", { time: fmtDateTime(nextOpening(now)) });

  return (
    <Card title={t("hoursTitle")} icon={<CalendarDays size={16} />} sub={t("hoursBody")} fill>
      <div className="flex items-center justify-between gap-3 rounded-(--radius-md) bg-[var(--sunken)] px-3.5 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
          <span className={`h-2 w-2 rounded-full ${open ? "bg-[var(--green)]" : "bg-[var(--faint)]"}`} />
          {open ? t("clinicOpenNow") : t("clinicClosedNow")}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--mute)]">
          <Clock size={13} /> {status}
        </span>
      </div>

      {/* This week, Mon–Sun */}
      <div className="grid grid-cols-7 gap-1.5" dir="ltr">
        {week.map((d) => (
          <span
            key={d.at}
            className={`flex flex-col items-center rounded-(--radius-md) py-2.5 ${
              d.isToday ? "bg-[var(--action)] text-white shadow-(--shadow-sm)" : d.openDay ? "bg-[var(--tint)] text-[var(--link)]" : "bg-[var(--sunken)] text-[var(--faint)]"
            }`}
          >
            <span className="text-[10.5px] font-semibold uppercase">{d.name}</span>
            <span className="font-mono text-[15px] font-bold leading-tight">{d.date}</span>
          </span>
        ))}
      </div>

      {/* Today's clinic day, 9 AM – 6 PM, with now marked */}
      <div dir="ltr">
        <div className="relative h-2 rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-[var(--action)]" style={{ width: `${today < 5 ? pct : 0}%` }} />
          {inHours ? (
            <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--white)] bg-[var(--action)] shadow-(--shadow-sm)" style={{ left: `${pct}%` }} />
          ) : null}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-[var(--mute)]">
          {["9 AM", "12 PM", "3 PM", "6 PM"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function QuickTile({ icon, title, note, onClick, href, danger }: { icon: React.ReactNode; title: string; note?: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const cls = `flex h-full min-h-[96px] flex-col justify-between gap-3 rounded-(--radius-card) border p-4 text-start !no-underline transition-colors ${
    danger ? "border-[var(--color-danger-border)] bg-[var(--red-tint)] hover:brightness-[0.98]" : "card-lift border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)"
  }`;
  const body = (
    <>
      <span className={`flex h-10 w-10 items-center justify-center rounded-(--radius-md) ${danger ? "bg-[var(--white)] text-[var(--red)]" : "icon-tile"}`}>{icon}</span>
      <span>
        <span className={`block text-[14px] font-bold ${danger ? "text-[var(--color-red-ink)]" : "text-[var(--ink)]"}`}>{title}</span>
        {note ? <span className={`mt-0.5 block text-[12.5px] font-semibold ${danger ? "text-[var(--color-danger-body)]" : "text-[var(--mute)]"}`}>{note}</span> : null}
      </span>
    </>
  );
  return href ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

function StatusTile({ tone, icon, title, note }: { tone: "ok" | "warn" | "off" | "neutral"; icon: React.ReactNode; title: string; note: string }) {
  const cls =
    tone === "ok"
      ? "text-[var(--green)]"
      : tone === "warn"
        ? "text-[var(--amber)]"
        : tone === "off"
          ? "text-[var(--faint)]"
          : "text-[var(--link)]";
  return (
    <div className="min-w-0 rounded-(--radius-lg) border border-[var(--line)] bg-[var(--white)] px-4 py-3 lg:w-[176px]">
      <span className={cls}>{icon}</span>
      <div className="mt-1.5 text-[13.5px] font-semibold leading-snug text-[var(--ink)]">{title}</div>
      <div className="mt-0.5 truncate text-[12px] text-[var(--mute)]">{note}</div>
    </div>
  );
}

/** `fill`: stretch to the row's height and spread the body's blocks over it. */
function Card({ title, sub, icon, action, fill, children }: { title: string; sub?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; fill?: boolean; children: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) ${fill ? "flex h-full flex-col" : ""}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="section-title flex items-center gap-2">
            {icon ? <span className="text-[var(--link)]">{icon}</span> : null}
            {title}
          </h2>
          {sub ? <p className="mt-0.5 text-[12px] text-[var(--mute)]">{sub}</p> : null}
        </div>
        {action}
      </header>
      <div className={`px-5 pb-4 ${fill ? "flex flex-1 flex-col justify-between gap-4" : ""}`}>{children}</div>
    </section>
  );
}
