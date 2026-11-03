/* Members & records — the household on the policy. First pick a member (a card
   each, with how complete their health profile is and their visits); then,
   for that member, either their health profile (optional — extra for the
   doctor; without it the doctor asks on the call) or their prescriptions &
   records. A strip of the other members stays at the top to switch person.
   Unsaved profile edits are kept per member, so switching loses nothing.
   Members come from the policy (Centegy HIS), so they're edited, not added. */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FileText, History, Info, ShieldAlert, Stethoscope, UserRoundPen, Video } from "lucide-react";
import { toast } from "sonner";
import Avatar, { initialsOf } from "@/components/ui/avatar";
import { PrimaryAction, SecondaryAction } from "@/features/patient/patient-step";
import MemberRecords, { useMemberVisits } from "@/features/patient/member-records";
import ProfileForm, { cleanProfile } from "@/features/patient/profile-form";
import { HOUSEHOLD } from "@/data/seed";
import { conditionName, emptyProfile, keyAnswered, profileState, type ProfileState } from "@/lib/profile";
import { useT, type StringKey } from "@/lib/i18n";
import { usePlatform } from "@/store/consult-store";
import { useIntakeDraft } from "@/store/intake-draft";
import type { HealthProfile, Lang, Member } from "@/lib/types";

export type MembersView = "profile" | "records";

const same = (a: HealthProfile, b: HealthProfile) => JSON.stringify({ ...cleanProfile(a), updatedAt: 0 }) === JSON.stringify({ ...cleanProfile(b), updatedAt: 0 });

const STATE_LABEL: Record<ProfileState, StringKey> = { complete: "profileComplete", partial: "profileIncomplete", empty: "profileEmpty" };
const STATE_TONE: Record<ProfileState, string> = {
  complete: "bg-[var(--green-tint)] text-[var(--color-green-ink)]",
  partial: "bg-[var(--tint)] text-[var(--link)]",
  empty: "bg-[var(--sunken)] text-[var(--mute)]",
};
const fmtDay = (at: number, lang: Lang) => new Date(at).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-PK", { day: "numeric", month: "short", year: "numeric" });

export default function MembersScreen({ memberId, view = "profile", visitId }: { memberId?: string; view?: MembersView; visitId?: string }) {
  const navigate = useNavigate();
  // Edits not yet saved, by member — kept while moving between members and views.
  const [drafts, setDrafts] = useState<Record<string, HealthProfile>>({});
  const member = HOUSEHOLD.members.find((m) => m.id === memberId);
  const go = (search: { member?: string; view?: MembersView; visit?: string }) => navigate({ to: "/patient/members", search, replace: Boolean(member && search.member) });

  if (!member) return <MemberPicker drafts={drafts} onOpen={(m, v) => go({ member: m.id, view: v })} />;
  return (
    <MemberDetail
      member={member}
      view={view}
      visitId={visitId}
      drafts={drafts}
      setDrafts={setDrafts}
      onSwitch={(m) => go({ member: m.id, view })}
      onView={(v) => go({ member: member.id, view: v })}
      onVisit={(id) => go({ member: member.id, view: "records", visit: id })}
      onBack={() => go({})}
    />
  );
}

/* ── Step 1: pick a member ──────────────────────────────────────────────── */

function MemberPicker({ drafts, onOpen }: { drafts: Record<string, HealthProfile>; onOpen: (m: Member, v: MembersView) => void }) {
  const { t } = useT();
  return (
    <div className="line-in grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("navMembers")}</h1>
          <p className="mt-1 text-[13.5px] text-[var(--mute)]">{t("chooseMemberSub")}</p>
        </div>
        <span className="font-mono text-[12px] text-[var(--mute)]" dir="ltr">
          {HOUSEHOLD.policy} · {HOUSEHOLD.partner}
        </span>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {HOUSEHOLD.members.map((m) => (
          <MemberCard key={m.id} member={m} unsaved={Boolean(drafts[m.id])} onOpen={(v) => onOpen(m, v)} />
        ))}
      </ul>
    </div>
  );
}

function MemberCard({ member: m, unsaved, onOpen }: { member: Member; unsaved: boolean; onOpen: (v: MembersView) => void }) {
  const { t, lang } = useT();
  const p = usePlatform((s) => s.profiles[m.id]);
  const visits = useMemberVisits(m.id);
  const state = profileState(p, m);
  const answered = keyAnswered(p);
  return (
    <li className="flex flex-col rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)">
      <button type="button" onClick={() => onOpen("profile")} className="flex items-center gap-3.5 px-5 pt-5 text-start">
        <Avatar initials={initialsOf(m.name)} size={48} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-[16px] font-semibold text-[var(--ink)]">
            {lang === "ur" ? m.nameUr : m.name}
            {unsaved ? <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--amber)]" title={t("unsaved")} /> : null}
          </span>
          <span className="block truncate text-[12.5px] text-[var(--mute)]">
            {t(`rel_${m.relation}` as StringKey)} · {t("years", { n: m.age })} ·{" "}
            <span className="font-mono" dir="ltr">
              {m.mrn}
            </span>
          </span>
        </span>
      </button>

      <div className="grid gap-3 px-5 py-4">
        {/* Health profile at a glance */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className={`rounded-(--radius-pill) px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[state]}`}>{t(STATE_LABEL[state])}</span>
            <span className="text-[11.5px] text-[var(--mute)]">{t("keyAnswered", { n: answered })}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1 rounded-full ${i < answered ? "bg-[var(--green)]" : "bg-[var(--hair)]"}`} />
            ))}
          </div>
          <div className="mt-2.5 flex min-h-[24px] flex-wrap gap-1">
            {(p?.allergies ?? []).map((a) => (
              <span key={a.name} className="inline-flex items-center gap-1 rounded-(--radius-pill) bg-[var(--red-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-red-ink)]">
                <ShieldAlert size={11} /> {a.name}
              </span>
            ))}
            {(p?.conditions ?? []).map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-(--radius-pill) border border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold text-[var(--body)]">
                <Stethoscope size={11} /> {conditionName(c, lang)}
              </span>
            ))}
          </div>
        </div>
        {/* Records at a glance */}
        <p className="flex items-center gap-2 border-t border-[var(--hair)] pt-3 text-[12.5px] text-[var(--mute)]">
          <History size={13} />
          {visits.length ? (
            <>
              <span className="font-semibold text-[var(--ink)]">{visits.length === 1 ? t("visitsOne") : t("visitsCount", { n: visits.length })}</span>· {t("lastVisitOn", { date: fmtDay(visits[0].createdAt, lang) })}
            </>
          ) : (
            t("noVisitsYet")
          )}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--hair)] bg-[var(--sunken)] px-4 py-3">
        <button
          type="button"
          onClick={() => onOpen("profile")}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] px-2 text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--sky-300)]"
        >
          <UserRoundPen size={15} className="text-[var(--link)]" /> {state === "empty" ? t("fillProfile") : t("updateProfile")}
        </button>
        <button
          type="button"
          onClick={() => onOpen("records")}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] px-2 text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--sky-300)]"
        >
          <FileText size={15} className="text-[var(--link)]" /> {t("viewRecordsShort")}
        </button>
      </div>
    </li>
  );
}

/* ── Step 2: one member — health profile or prescriptions & records ─────── */

function MemberDetail({
  member,
  view,
  visitId,
  drafts,
  setDrafts,
  onSwitch,
  onView,
  onVisit,
  onBack,
}: {
  member: Member;
  view: MembersView;
  visitId?: string;
  drafts: Record<string, HealthProfile>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, HealthProfile>>>;
  onSwitch: (m: Member) => void;
  onView: (v: MembersView) => void;
  onVisit: (id: string) => void;
  onBack: () => void;
}) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const profiles = usePlatform((s) => s.profiles);
  const saveProfile = usePlatform((s) => s.saveProfile);
  const setIntakeMember = useIntakeDraft((s) => s.setMember);
  const visits = useMemberVisits(member.id);
  const saved = profiles[member.id];
  const draft = drafts[member.id] ?? saved ?? emptyProfile();
  const isDirty = (m: Member) => Boolean(drafts[m.id]) && !same(drafts[m.id], profiles[m.id] ?? emptyProfile());
  const dirty = isDirty(member);
  const discard = () =>
    setDrafts((d) => {
      const { [member.id]: _gone, ...rest } = d;
      return rest;
    });
  const save = () => {
    saveProfile(member, cleanProfile(draft));
    discard();
    toast.success(t("profileSaved"));
  };
  const answered = keyAnswered(cleanProfile(draft));
  const name = (m: Member) => (lang === "ur" ? m.nameUr : m.name);
  const state = profileState(saved, member);

  return (
    <div className="line-in grid gap-4">
      {/* ── Back and switch member ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex h-9 items-center gap-1.5 rounded-(--radius-md) pe-3 ps-1 text-[13px] font-semibold text-[var(--link)] hover:bg-[var(--white)]">
          <ArrowLeft size={16} className={lang === "ur" ? "-scale-x-100" : undefined} /> {t("allMembers")}
        </button>
        <span className="mx-1 h-5 w-px bg-[var(--line)]" />
        <div className="flex flex-wrap gap-1.5">
          {HOUSEHOLD.members.map((m) => {
            const on = m.id === member.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSwitch(m)}
                aria-current={on}
                className={`inline-flex h-9 items-center gap-2 rounded-(--radius-pill) border pe-3 ps-1 text-[13px] font-semibold transition-colors ${
                  on ? "border-[var(--action)] bg-[var(--tint)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--white)] text-[var(--body)] hover:border-[var(--sky-300)]"
                }`}
              >
                <Avatar initials={initialsOf(m.name)} size={26} />
                {name(m).split(" ")[0]}
                {isDirty(m) ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" title={t("unsaved")} /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── The member and the two views ──────────────────────────────── */}
      <section className="overflow-clip rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] shadow-(--shadow-sm)">
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <Avatar initials={initialsOf(member.name)} size={52} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold text-[var(--ink)]">{name(member)}</h1>
            <p className="text-[13px] text-[var(--mute)]">
              {t(`rel_${member.relation}` as StringKey)} · {t("years", { n: member.age })} ·{" "}
              <span className="font-mono" dir="ltr">
                {member.mrn}
              </span>
            </p>
          </div>
          <span className={`rounded-(--radius-pill) px-2.5 py-1 text-[12px] font-semibold ${STATE_TONE[state]}`}>{t(STATE_LABEL[state])}</span>
          <PrimaryAction
            onClick={() => {
              setIntakeMember(member.id);
              navigate({ to: "/patient/choose" });
            }}
          >
            <Video size={16} /> {t("consultFor")}
          </PrimaryAction>
        </div>
        <nav role="tablist" className="flex gap-1 border-t border-[var(--hair)] px-3">
          {(
            [
              ["profile", t("healthProfile"), <UserRoundPen key="i" size={15} />, null],
              ["records", t("viewRecordsShort"), <FileText key="i" size={15} />, visits.length],
            ] as const
          ).map(([k, label, icon, count]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={view === k}
              onClick={() => onView(k)}
              className={`relative inline-flex items-center gap-2 px-3 py-3 text-[13.5px] font-semibold ${
                view === k ? "text-[var(--ink)] after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[var(--action)]" : "text-[var(--mute)] hover:text-[var(--ink)]"
              }`}
            >
              <span className={view === k ? "text-[var(--link)]" : ""}>{icon}</span>
              {label}
              {count !== null ? <span className="rounded-(--radius-pill) bg-[var(--sunken)] px-1.5 font-mono text-[11px] text-[var(--mute)]">{count}</span> : null}
              {k === "profile" && dirty ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" title={t("unsaved")} /> : null}
            </button>
          ))}
        </nav>
      </section>

      {view === "records" ? (
        <MemberRecords member={member} visitId={visitId} onVisit={onVisit} />
      ) : (
        <section className="overflow-clip rounded-(--radius-card) border border-[var(--line)] bg-[var(--canvas)] shadow-(--shadow-sm)">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--hair)] bg-[var(--tint)] px-5 py-2.5">
            <p className="flex min-w-[260px] flex-1 items-start gap-2 text-[12.5px] text-[var(--body)]">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-[var(--link)]" />
              {t("profileWhy")}
            </p>
            <div className="grid min-w-[200px] gap-1">
              <div className="flex items-center justify-between gap-3 text-[11.5px]">
                <span className="font-semibold text-[var(--ink)]">{t("keyAnswered", { n: answered })}</span>
                <span className="text-[var(--mute)]">{saved?.updatedAt ? t("profileUpdated", { date: fmtDay(saved.updatedAt, lang) }) : t("profileNever")}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-colors ${i < answered ? "bg-[var(--green)]" : "bg-[var(--white)]"}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <ProfileForm member={member} value={draft} onChange={(p) => setDrafts((d) => ({ ...d, [member.id]: p }))} />
          </div>
          <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--hair)] bg-[var(--white)] px-5 py-3">
            {dirty ? (
              <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[var(--amber-ink)]">
                <span className="h-2 w-2 rounded-full bg-[var(--amber)]" /> {t("unsaved")}
              </span>
            ) : (
              <Link
                to="/patient/members"
                search={{ member: member.id, view: "records" }}
                replace
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
              >
                {t("viewRecordsShort")} <ArrowRight size={14} className={lang === "ur" ? "-scale-x-100" : undefined} />
              </Link>
            )}
            <span className="ms-auto flex gap-2">
              {dirty ? <SecondaryAction onClick={discard}>{t("discardChanges")}</SecondaryAction> : null}
              <PrimaryAction disabled={!dirty} onClick={save}>
                {t("saveProfile")}
              </PrimaryAction>
            </span>
          </footer>
        </section>
      )}
    </div>
  );
}
