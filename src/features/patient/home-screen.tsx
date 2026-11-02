/* Patient home — where sign-in lands. A greeting by Pakistan time with the
   date, the clinic's live status, then: start (or return to) a consultation,
   who's covered, recent consultations, clinic hours and emergency advice. */

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, ClipboardList, Clock, FileCheck2, PhoneCall, Siren, Stethoscope, UserRoundCheck, Users, Video } from "lucide-react";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import StatusTag from "@/components/ui/status-tag";
import { HOUSEHOLD } from "@/data/seed";
import { complaintText } from "@/lib/complaint";
import { fmtDateTime, fmtTime, greetingKey, isClinicOpen, nextOpening, CLINIC_HOURS } from "@/lib/clinic";
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
  callback: "/patient/queue",
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
  const forceOpen = usePlatform((s) => s.forceClinicOpen);

  const holder = HOUSEHOLD.members.find((m) => m.relation === "self")!;
  const firstName = (lang === "ur" ? holder.nameUr : holder.name).split(" ")[0];
  const open = forceOpen || isClinicOpen(now);
  const busy = new Set(consultations.filter((c) => c.status === "in_call" || c.status === "ringing").map((c) => c.prescriberId));
  const freeDoctors = doctors.filter((d) => d.available && !busy.has(d.id)).length;
  const mine = consultations.filter((c) => c.householdPhone === phone).sort((a, b) => b.createdAt - a.createdAt);
  const active = mine.find((c) => c.id === consultId && RESUME[c.status]);
  const rxReady = mine.filter((c) => c.status === "approved" || c.status === "closed").length;
  const recent = mine.filter((c) => c.status !== "intake").slice(0, 5);
  const locale = lang === "ur" ? "ur-PK" : "en-PK";
  const dateLine = new Date(now).toLocaleDateString(locale, { timeZone: CLINIC_HOURS.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="grid gap-5 line-in">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-(--radius-xl) border border-[var(--line)] bg-gradient-to-br from-[var(--tint)] to-[var(--white)] px-6 py-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-[720px]">
            <p className="text-[13px] font-medium text-[var(--mute)]">{dateLine}</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-[var(--teal-deep)]">
              {t(greetingKey(now))}, {firstName}
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--body)]">{t("homeLede", { plan: HOUSEHOLD.partner })}</p>
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
              note={t("rxReadyNote")}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Start / resume ─────────────────────────────────────────────── */}
        <section className="rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] p-6 shadow-(--shadow-sm) lg:col-span-2 xl:col-span-1">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-(--radius-lg) bg-[var(--tint)] text-[var(--link)]">
              <Video size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold text-[var(--ink)]">{t("startTitle")}</h2>
              <p className="mt-1 max-w-[560px] text-[14px] leading-relaxed text-[var(--body)]">{t("startBody")}</p>
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
                className="inline-flex items-center gap-2 rounded-(--radius-md) border border-[var(--green)] bg-[var(--green)] px-5 py-3 text-[14px] font-semibold text-[var(--color-on-fill)] hover:brightness-110"
              >
                <PhoneCall size={16} /> {t("resumeCta")} <span className="font-mono text-[12px] opacity-80">{active.id}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate({ to: "/patient/choose" })}
              className="inline-flex items-center gap-2 rounded-(--radius-md) border border-[var(--sky-300)] bg-[var(--primary)] px-5 py-3 text-[14px] font-semibold text-[var(--ink)] hover:bg-[var(--primary-hover)]"
            >
              {t("startCta")} <ArrowRight size={16} className={lang === "ur" ? "-scale-x-100" : undefined} />
            </button>
          </div>
        </section>

        {/* ── Family ─────────────────────────────────────────────────────── */}
        <Card title={t("familyTitle")} icon={<Users size={16} />} sub={<span className="font-mono" dir="ltr">{HOUSEHOLD.policy}</span>}>
          <ul className="divide-y divide-[var(--hair)]">
            {HOUSEHOLD.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <Avatar initials={initialsOf(m.name)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{lang === "ur" ? m.nameUr : m.name}</div>
                  <div className="truncate text-[12px] text-[var(--mute)]">
                    {t(`rel_${m.relation}` as StringKey)} · {t("years", { n: m.age })}
                  </div>
                </div>
                <span
                  className={`rounded-(--radius-pill) px-2.5 py-0.5 text-[11.5px] font-semibold ${
                    m.coverage === "active" ? "bg-[var(--green-tint)] text-[var(--color-green-ink)]" : "bg-[var(--amber-tint)] text-[var(--amber-ink)]"
                  }`}
                >
                  {m.coverage === "active" ? t("coverActive") : t("coverLapsed")}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Hours + emergency ──────────────────────────────────────────── */}
        <div className="grid content-start gap-5 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <Card title={t("hoursTitle")} icon={<UserRoundCheck size={16} />}>
            <p className="text-[13.5px] leading-relaxed text-[var(--body)]">{t("hoursBody")}</p>
            <div className="mt-3 grid grid-cols-7 gap-1" dir="ltr">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span
                  key={i}
                  className={`rounded-(--radius-sm) py-1.5 text-center font-mono text-[11px] font-semibold ${
                    i < 5 ? "bg-[var(--tint)] text-[var(--link)]" : "bg-[var(--sunken)] text-[var(--faint)]"
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[var(--mute)]">
              {open ? t("clinicClosesAt") : t("clinicOpensAt", { time: fmtTime(nextOpening(now)) })}
            </p>
          </Card>
          <section className="rounded-(--radius-card) border border-[var(--color-danger-border)] bg-[var(--red-tint)] p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-red-ink)]">
              <Siren size={17} /> {t("sosTitle")}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-danger-body)]">{t("sosBody")}</p>
            <a
              href="tel:1122"
              className="mt-3 inline-flex items-center gap-2 rounded-(--radius-md) bg-[var(--red)] px-4 py-2 text-[13.5px] font-semibold !text-[var(--color-on-fill)] hover:brightness-110"
            >
              <PhoneCall size={15} /> {t("erCall")}
            </a>
          </section>
        </div>
      </div>

      {/* ── Recent ───────────────────────────────────────────────────────── */}
        <Card
          title={t("recentTitle")}
          icon={<ClipboardList size={16} />}
          action={
            <Link to="/patient/records" className="text-[13px] font-semibold">
              {t("viewAll")}
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-8 text-center text-[13.5px] text-[var(--mute)]">{t("noRecords")}</p>
          ) : (
            <ul className="divide-y divide-[var(--hair)]">
              {recent.map((c) => {
                const complaint = complaintText(c.symptoms, lang);
                const doctor = doctors.find((d) => d.id === c.prescriberId);
                return (
                  <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 md:grid-cols-[1.5fr_1fr_1fr_1.2fr_140px]">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-[var(--ink)]">
                        {lang === "ur" ? c.member.nameUr : c.member.name}
                        {complaint ? <span className="font-normal text-[var(--mute)]"> · {complaint}</span> : null}
                      </div>
                      <div className="font-mono text-[11.5px] text-[var(--mute)] md:hidden" dir="ltr">
                        {c.id} · {fmtDateTime(c.createdAt)}
                      </div>
                    </div>
                    <div className="hidden font-mono text-[12.5px] text-[var(--body)] md:block" dir="ltr">
                      {c.id}
                    </div>
                    <div className="hidden font-mono text-[12.5px] text-[var(--body)] md:block" dir="ltr">
                      {fmtDateTime(c.createdAt)}
                    </div>
                    <div className="hidden truncate text-[13px] text-[var(--body)] md:block">{doctor ? doctor.name : c.status === "ineligible" ? t("supportFollowUp") : "—"}</div>
                    <span className="justify-self-end">
                      <StatusTag status={c.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
    </div>
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

function Card({ title, sub, icon, action, children }: { title: string; sub?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
            {icon ? <span className="text-[var(--link)]">{icon}</span> : null}
            {title}
          </h2>
          {sub ? <p className="mt-0.5 text-[12px] text-[var(--mute)]">{sub}</p> : null}
        </div>
        {action}
      </header>
      <div className="px-5 pb-4">{children}</div>
    </section>
  );
}
