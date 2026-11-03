/* Doctor performance on the admin overview. One panel, one row of filters on
   top driving everything under it:

     Period    the date-range picker with quick ranges (MTD, QTD, YTD, last 7 / 30
               days, previous month / quarter …) or any custom range
     Metric    Score · Consultations · Prescriptions · Call time · Avg call · Avg wait
     Show      All · Top 5 · Bottom 5            (by the chosen metric)
     Doctors   a list of values: tick any number of active doctors

   Under the filters: highlights (best, needs support, clinic average, volume),
   a ranked bar chart of the metric with the clinic average marked, and the
   daily trend per doctor (hourly for Today). Both charts have hover detail.

   Colour follows the doctor (a fixed series slot by roster order), never the
   rank, so filtering never repaints anyone. Score (0–100):
     60  patients seen, against the busiest doctor in the period
     25  prescriptions per consultation
     15  speed to answer — the quickest average wait scores full marks */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Award, LifeBuoy, RotateCcw, Sigma, Users } from "lucide-react";
import Avatar from "@/components/ui/avatar";
import DateRangePicker, { presetLabel, quickRanges } from "@/components/ui/date-range-picker";
import { MultiSelectFilter } from "@/components/ui/filter-bar";
import { doctorStats, fmtMinutes, type DoctorStats } from "@/features/admin/doctor-stats";
import { CLINIC_HOURS, fmtDuration } from "@/lib/clinic";
import type { Consultation, Doctor } from "@/lib/types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const PKT = 5 * HOUR;

/** The chosen period as timestamps: [since, until). A single day is charted by the hour. */
interface Range {
  since: number;
  until: number;
  hourly: boolean;
  all: boolean;
}

/** Midnight in Pakistan of a YYYY-MM-DD clinic day. */
const dayStart = (isoDay: string) => {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Date.UTC(y, m - 1, d) - PKT;
};
const clinicDay = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: CLINIC_HOURS.tz });

type MetricKey = "score" | "consults" | "prescriptions" | "callTime" | "avgCall" | "avgWait";
interface Metric {
  label: string;
  /** Which way is better — decides the ranking order, Top 5 / Bottom 5 and the highlights. Null: neither. */
  better: "high" | "low" | null;
  value: (r: Ranked) => number;
  fmt: (v: number) => string;
  hint: string;
}
const fmtCount = (v: number) => String(Math.round(v));
const METRICS: Record<MetricKey, Metric> = {
  score: { label: "Score", better: "high", value: (r) => r.score, fmt: fmtCount, hint: "60 volume · 25 prescriptions · 15 speed to answer" },
  consults: { label: "Consultations", better: "high", value: (r) => r.s.received, fmt: fmtCount, hint: "Calls the doctor picked up" },
  prescriptions: { label: "Prescriptions", better: "high", value: (r) => r.s.released, fmt: fmtCount, hint: "Consultations that ended with a prescription" },
  callTime: { label: "Call time", better: "high", value: (r) => r.s.callMs, fmt: (v) => fmtMinutes(v), hint: "Total time on calls" },
  avgCall: { label: "Avg call length", better: null, value: (r) => r.s.avgCallMs, fmt: (v) => (v ? fmtDuration(v) : "—"), hint: "Longer isn't better or worse" },
  avgWait: { label: "Avg wait to answer", better: "low", value: (r) => r.s.avgWaitMs, fmt: (v) => fmtMinutes(v), hint: "Consent → doctor; lower is better" },
};

type Show = "all" | "top" | "bottom";

interface Ranked {
  d: Doctor;
  s: DoctorStats;
  score: number;
}

export function rankDoctors(consultations: Consultation[], doctors: Doctor[], since: number, until = Infinity): Ranked[] {
  const inPeriod = consultations.filter((c) => c.createdAt >= since && c.createdAt < until);
  const rows = doctors.map((d) => ({ d, s: doctorStats(inPeriod, d.id) }));
  const busiest = Math.max(1, ...rows.map((r) => r.s.received));
  const quickest = Math.min(...rows.filter((r) => r.s.received && r.s.avgWaitMs > 0).map((r) => r.s.avgWaitMs));
  return rows.map(({ d, s }) => {
    if (!s.received) return { d, s, score: 0 };
    const speed = s.avgWaitMs > 0 && Number.isFinite(quickest) ? quickest / s.avgWaitMs : 1;
    return { d, s, score: Math.round(60 * (s.received / busiest) + 25 * (s.released / s.received) + 15 * speed) };
  });
}

/** Ranked by a metric: best first; doctors with no consultations in the period always last. */
function sortBy(rows: Ranked[], m: Metric) {
  return [...rows].sort((a, b) => {
    if (!a.s.received !== !b.s.received) return a.s.received ? -1 : 1;
    const diff = m.value(a) - m.value(b);
    return (m.better === "low" ? diff : -diff) || a.d.name.localeCompare(b.d.name);
  });
}

export default function DoctorPerformance({ consultations, doctors, now }: { consultations: Consultation[]; doctors: Doctor[]; now: number }) {
  const navigate = useNavigate();
  // The clinic's today, as a local date for the picker; the default is Last 30 Days.
  const todayIso = clinicDay(now);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  const last30 = quickRanges(today).find((q) => q.label === "Last 30 Days")!;
  const [from, setFrom] = useState(last30.start);
  const [to, setTo] = useState(last30.end);
  const [metricKey, setMetricKey] = useState<MetricKey>("score");
  const [show, setShow] = useState<Show>("all");
  const [hidden, setHidden] = useState<string[]>([]);
  const metric = METRICS[metricKey];

  // Colour slot by roster order — stays put whatever is filtered.
  const slot = useMemo(() => new Map(doctors.map((d, i) => [d.id, `var(--series-${(i % 8) + 1})`])), [doctors]);
  const range: Range = {
    since: from ? dayStart(from) : 0,
    until: to ? dayStart(to) + DAY : Infinity,
    hourly: Boolean(from) && from === to,
    all: !from,
  };
  const { since, until } = range;
  const ranked = useMemo(() => rankDoctors(consultations, doctors, since, until), [consultations, doctors, since, until]);
  const periodText = range.all ? "all time" : presetLabel(from, to, today)?.toLowerCase() ?? `${from} → ${to}`;

  const selected = ranked.filter((r) => !hidden.includes(r.d.id));
  const sorted = sortBy(selected, metric);
  const withData = sorted.filter((r) => r.s.received);
  const shown = show === "top" ? sorted.slice(0, 5) : show === "bottom" ? [...withData].reverse().slice(0, 5).reverse() : sorted;
  const avg = withData.length ? withData.reduce((n, r) => n + metric.value(r), 0) / withData.length : 0;
  const total = selected.reduce((n, r) => n + r.s.received, 0);
  const best = metric.better ? withData[0] : undefined;
  const worst = metric.better && withData.length > 1 ? withData[withData.length - 1] : undefined;
  const filtered = from !== last30.start || to !== last30.end || metricKey !== "score" || show !== "all" || hidden.length > 0;
  const open = (id: string) => navigate({ to: "/admin/doctors/$id", params: { id } });

  return (
    <section className="viz-root rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) shadow-(--shadow-sm)">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h2 className="text-[16px] font-semibold text-(--color-ink)">Doctor performance</h2>
          <p className="mt-0.5 text-[12.5px] text-(--color-mute)">
            {metric.label} · {periodText} · {selected.length} of {ranked.length} doctors · {metric.hint}
          </p>
        </div>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setFrom(last30.start);
              setTo(last30.end);
              setMetricKey("score");
              setShow("all");
              setHidden([]);
            }}
            className="inline-flex items-center gap-1.5 rounded-(--radius-md) px-2.5 py-1.5 text-[12px] font-semibold text-[var(--link)] hover:bg-[var(--tint)]"
          >
            <RotateCcw size={13} /> Reset filters
          </button>
        ) : null}
      </header>

      {/* ── Filters: one row, above both charts ─────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-y border-[var(--hair)] bg-[var(--sunken)] px-5 py-3">
        <Filter label="Period">
          <DateRangePicker
            start={from}
            end={to}
            today={today}
            align="start"
            onChange={(s2, e2) => {
              setFrom(s2);
              setTo(e2);
            }}
          />
        </Filter>
        <Filter label="Metric">
          <select
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value as MetricKey)}
            className="h-9 min-w-[160px] rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] px-3 text-[12.5px] font-semibold text-[var(--ink)] focus:border-[var(--link)]"
          >
            {(Object.keys(METRICS) as MetricKey[]).map((k) => (
              <option key={k} value={k}>
                {METRICS[k].label}
              </option>
            ))}
          </select>
        </Filter>
        <Filter label="Show">
          <Segmented
            value={show}
            options={[
              { key: "all", label: "All" },
              { key: "top", label: "Top 5" },
              { key: "bottom", label: "Bottom 5" },
            ]}
            onChange={(v) => setShow(v as Show)}
          />
        </Filter>
        <Filter label="Doctors">
          <MultiSelectFilter
            noun="doctors"
            options={ranked.map((r) => ({ key: r.d.id, label: r.d.name, color: slot.get(r.d.id) }))}
            selected={selected.map((r) => r.d.id)}
            onChange={(keys) => setHidden(ranked.map((r) => r.d.id).filter((id) => !keys.includes(id)))}
          />
        </Filter>
      </div>

      {/* ── Highlights ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-4 lg:grid-cols-4">
        <Highlight
          icon={<Award size={16} />}
          tone="good"
          label={metric.better ? `Best · ${metric.label.toLowerCase()}` : "Longest calls"}
          name={best?.d.name ?? withData[0]?.d.name ?? "—"}
          value={best ? metric.fmt(metric.value(best)) : withData[0] ? metric.fmt(metric.value(withData[0])) : "No data"}
        />
        <Highlight
          icon={<LifeBuoy size={16} />}
          tone="warn"
          label={metric.better ? "Needs support" : "Shortest calls"}
          name={worst?.d.name ?? (metric.better ? "—" : withData[withData.length - 1]?.d.name ?? "—")}
          value={worst ? metric.fmt(metric.value(worst)) : !metric.better && withData.length ? metric.fmt(metric.value(withData[withData.length - 1])) : "Not enough doctors"}
        />
        <Highlight icon={<Sigma size={16} />} tone="neutral" label="Clinic average" name={metric.label} value={withData.length ? metric.fmt(avg) : "No data"} />
        <Highlight icon={<Users size={16} />} tone="neutral" label="Consultations" name={`${withData.length} doctor${withData.length === 1 ? "" : "s"} seeing patients`} value={String(total)} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid gap-5 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard title={`Ranking · ${metric.label}`} sub={metric.better === "low" ? "Lowest first" : metric.better ? "Highest first" : "Longest first"}>
          <RankBars rows={shown} metric={metric} avg={withData.length ? avg : null} colour={(id) => slot.get(id)!} onOpen={open} />
        </ChartCard>
        <ChartCard title={range.hourly ? "Consultations by hour" : "Consultations per day"} sub="One line per doctor · hover for the day">
          <TrendLines consultations={consultations} doctors={shown.map((r) => r.d)} range={range} now={now} colour={(id) => slot.get(id)!} />
        </ChartCard>
      </div>
    </section>
  );
}

/* ── Filters ─────────────────────────────────────────────────────────── */

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--mute)]">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { key: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex h-9 rounded-(--radius-md) border border-[var(--border-input)] bg-[var(--white)] p-0.5 text-[12.5px] font-semibold">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-[6px] px-3 ${value === o.key ? "bg-[var(--link)] text-white" : "text-[var(--mute)] hover:text-[var(--ink)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Highlight({ icon, tone, label, name, value }: { icon: ReactNode; tone: "good" | "warn" | "neutral"; label: string; name: string; value: string }) {
  const iconCls = tone === "good" ? "bg-[var(--green-tint)] text-[var(--green)]" : tone === "warn" ? "bg-[var(--amber-tint)] text-[var(--amber)]" : "bg-[var(--tint)] text-[var(--link)]";
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-(--radius-lg) border border-[var(--line)] px-4 py-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${iconCls}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--mute)]">{label}</span>
        <span className="block truncate text-[18px] font-bold leading-tight text-[var(--ink)]">{value}</span>
        <span className="block truncate text-[12px] text-[var(--body)]">{name}</span>
      </span>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-(--radius-lg) border border-[var(--line)] p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-[var(--ink)]">{title}</h3>
        <span className="text-[11.5px] text-[var(--mute)]">{sub}</span>
      </div>
      {children}
    </div>
  );
}

/** Width of an element, kept up to date — the SVG charts draw to it. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/* ── Ranking bars ────────────────────────────────────────────────────── */

const NAME_W = 168;
const VALUE_W = 64;

function RankBars({ rows, metric, avg, colour, onOpen }: { rows: Ranked[]; metric: Metric; avg: number | null; colour: (id: string) => string; onOpen: (id: string) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const top = 22;
  // Few doctors get taller rows, so the ranking matches the trend chart beside it.
  const ROW = Math.round(Math.min(64, Math.max(38, 228 / Math.max(1, rows.length))));
  const plotW = Math.max(60, width - NAME_W - VALUE_W);
  const max = niceMax(Math.max(...rows.map((r) => metric.value(r)), avg ?? 0, 0));
  const x = (v: number) => NAME_W + (v / max) * plotW;
  const height = top + rows.length * ROW + 8;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  if (rows.length === 0) return <Empty>No doctors match these filters.</Empty>;
  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={`Doctors ranked by ${metric.label}`} className="block">
          {/* grid + x axis labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 4} y2={height - 8} stroke="var(--viz-grid)" />
              <text x={x(t)} y={12} textAnchor="middle" className="fill-[var(--mute)] text-[10.5px]">
                {t === 0 ? "0" : metric.fmt(t)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const v = metric.value(r);
            const y = top + i * ROW;
            const w = Math.max(0, x(v) - NAME_W);
            const barY = y + ROW / 2 - 7;
            return (
              <g key={r.d.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onOpen(r.d.id)} className="cursor-pointer">
                <rect x={0} y={y} width={width} height={ROW} className={hover === i ? "fill-[var(--sunken)]" : "fill-transparent"} rx={6} />
                <text x={8} y={y + ROW / 2 + 4} className="fill-[var(--mute)] font-mono text-[11px]">
                  {i + 1}
                </text>
                <text x={28} y={y + ROW / 2 + 4} className="fill-[var(--ink)] text-[12.5px] font-semibold">
                  {r.d.name.length > 20 ? `${r.d.name.slice(0, 19)}…` : r.d.name}
                </text>
                {w > 0 ? (
                  // 4px rounded end at the value, square at the baseline.
                  <path
                    d={`M${NAME_W},${barY} h${Math.max(0, w - 4)} a4,4 0 0 1 4,4 v6 a4,4 0 0 1 -4,4 h-${Math.max(0, w - 4)} z`}
                    fill={colour(r.d.id)}
                  />
                ) : null}
                <text x={x(v) + 8} y={y + ROW / 2 + 4} className="fill-[var(--ink)] font-mono text-[12px] font-semibold">
                  {r.s.received || metric === METRICS.score ? metric.fmt(v) : "—"}
                </text>
              </g>
            );
          })}
          {avg !== null && avg > 0 ? (
            <g pointerEvents="none">
              <line x1={x(avg)} x2={x(avg)} y1={top - 4} y2={height - 8} stroke="var(--ink)" strokeDasharray="4 3" strokeWidth={1.5} />
              <text x={x(avg) + 4} y={height - 1} className="fill-[var(--body)] text-[10.5px] font-semibold">
                Avg {metric.fmt(avg)}
              </text>
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hover !== null && rows[hover] ? <RankTooltip r={rows[hover]} top={top + (hover + 0.8) * ROW} colour={colour(rows[hover].d.id)} /> : null}
    </div>
  );
}

function RankTooltip({ r, top, colour }: { r: Ranked; top: number; colour: string }) {
  const lines: [string, string][] = [
    ["Score", String(r.score)],
    ["Consultations", String(r.s.received)],
    ["Prescriptions", `${r.s.released}${r.s.received ? ` (${Math.round((r.s.released / r.s.received) * 100)}%)` : ""}`],
    ["Call time", fmtMinutes(r.s.callMs)],
    ["Avg call", r.s.avgCallMs ? fmtDuration(r.s.avgCallMs) : "—"],
    ["Avg wait", fmtMinutes(r.s.avgWaitMs)],
  ];
  return (
    <div className="pointer-events-none absolute left-[28px] z-10 w-[230px] rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 shadow-(--shadow-menu)" style={{ top }}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
        <span className="text-[12.5px] font-semibold text-[var(--ink)]">{r.d.name}</span>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[12px]">
        {lines.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--mute)]">{k}</dt>
            <dd className="text-end font-mono text-[var(--ink)]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-[var(--mute)]">Click to open the doctor</p>
    </div>
  );
}

/* ── Trend lines ─────────────────────────────────────────────────────── */

interface Bucket {
  start: number;
  label: string;
}

function buckets(range: Range, now: number, consultations: Consultation[]): Bucket[] {
  const { since } = range;
  if (range.hourly) {
    return Array.from({ length: CLINIC_HOURS.close - CLINIC_HOURS.open }, (_, i) => {
      const h = CLINIC_HOURS.open + i;
      return { start: since + h * HOUR, label: `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}` };
    });
  }
  const first = range.all ? Math.min(now - 7 * DAY, ...consultations.map((c) => c.createdAt)) : since;
  const last = Math.min(range.until - 1, now);
  const day0 = (() => {
    const d = new Date(first + PKT);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - PKT;
  })();
  const out: Bucket[] = [];
  for (let t = day0; t <= last; t += DAY) {
    // Clinic days only — the clinic is shut at weekends, so those would only add zeros.
    const weekday = new Date(t + PKT).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    out.push({ start: t, label: new Date(t + PKT).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }) });
  }
  return out;
}

function TrendLines({
  consultations,
  doctors,
  range,
  now,
  colour,
}: {
  consultations: Consultation[];
  doctors: Doctor[];
  range: Range;
  now: number;
  colour: (id: string) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const bs = useMemo(() => buckets(range, now, consultations), [range.since, range.until, range.hourly, range.all, now, consultations]); // eslint-disable-line react-hooks/exhaustive-deps -- range is rebuilt each render; its fields are the deps
  const step = range.hourly ? HOUR : DAY;
  const series = useMemo(
    () =>
      doctors.map((d) => ({
        d,
        values: bs.map((b) => consultations.filter((c) => c.prescriberId === d.id && c.callStartedAt && c.callStartedAt >= b.start && c.callStartedAt < b.start + step).length),
      })),
    [doctors, bs, consultations, step],
  );

  const height = 248;
  const m = { l: 32, r: 104, t: 10, b: 28 };
  const plotW = Math.max(40, width - m.l - m.r);
  const plotH = height - m.t - m.b;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => m.l + (bs.length > 1 ? (i / (bs.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => m.t + plotH - (v / max) * plotH;
  // Rounded ticks can repeat when the peak is tiny (max 1 → 0, 1, 1); keep each once.
  const yTicks = [...new Set([0, 0.5, 1].map((t) => Math.round(t * max)))];
  const labelEvery = Math.max(1, Math.ceil(bs.length / 7));

  // Direct labels at the line ends, nudged apart so they don't collide.
  const ends = series
    .map((s) => ({ id: s.d.id, name: s.d.name.replace(/^Dr\.\s*/, "").split(" ")[0], y: y(s.values[s.values.length - 1] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  // Pushed past the bottom of the plot: slide the whole stack back up.
  const overflow = (ends[ends.length - 1]?.y ?? 0) - (m.t + plotH);
  if (overflow > 0) for (const e of ends) e.y -= overflow;

  if (doctors.length === 0) return <Empty>No doctors match these filters.</Empty>;
  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Consultations over time, one line per doctor"
          className="block"
          onMouseMove={(e) => {
            const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = e.clientX - box.left;
            const i = Math.round(((px - m.l) / plotW) * (bs.length - 1));
            setHover(i >= 0 && i < bs.length ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + plotW} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" />
              <text x={m.l - 8} y={y(t) + 3.5} textAnchor="end" className="fill-[var(--mute)] text-[10.5px]">
                {t}
              </text>
            </g>
          ))}
          <line x1={m.l} x2={m.l + plotW} y1={m.t + plotH} y2={m.t + plotH} stroke="var(--viz-axis)" />
          {bs.map((b, i) =>
            i % labelEvery === 0 || i === bs.length - 1 ? (
              <text key={b.start} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--mute)] text-[10.5px]">
                {b.label}
              </text>
            ) : null,
          )}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + plotH} stroke="var(--viz-axis)" strokeWidth={1.5} /> : null}
          {series.map((s) => (
            <polyline
              key={s.d.id}
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={colour(s.d.id)}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover !== null
            ? series.map((s) => <circle key={s.d.id} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={colour(s.d.id)} stroke="var(--white)" strokeWidth={2} />)
            : null}
          {ends.map((e) => (
            <g key={e.id}>
              <circle cx={m.l + plotW + 10} cy={e.y} r={3.5} fill={colour(e.id)} />
              <text x={m.l + plotW + 18} y={e.y + 4} className="fill-[var(--ink)] text-[11.5px] font-semibold">
                {e.name}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hover !== null && bs[hover] ? (
        <div
          className="pointer-events-none absolute top-2 z-10 w-[190px] rounded-(--radius-md) border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 shadow-(--shadow-menu)"
          style={x(hover) > width / 2 ? { left: Math.max(0, x(hover) - 202) } : { left: x(hover) + 12 }}
        >
          <div className="mb-1 text-[12px] font-semibold text-[var(--ink)]">
            {range.hourly ? `${bs[hover].label.replace("a", " AM").replace("p", " PM")}` : bs[hover].label}
          </div>
          {[...series]
            .sort((a, b) => b.values[hover] - a.values[hover])
            .map((s) => (
              <div key={s.d.id} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: colour(s.d.id) }} />
                  <span className="truncate text-[var(--body)]">{s.d.name}</span>
                </span>
                <span className="font-mono font-semibold text-[var(--ink)]">{s.values[hover]}</span>
              </div>
            ))}
        </div>
      ) : null}
      {/* Legend — identity never by colour alone (lines are also labelled at their ends). */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.d.id} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--body)]">
            <span className="h-[3px] w-4 rounded-full" style={{ background: colour(s.d.id) }} />
            <Avatar initials={s.d.initials} size={18} />
            {s.d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-(--radius-md) border border-dashed border-[var(--sky-200)] px-4 py-12 text-center text-[13px] text-[var(--mute)]">{children}</p>;
}
