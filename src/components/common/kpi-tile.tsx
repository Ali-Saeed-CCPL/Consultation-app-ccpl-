import { Info, Sparkles } from "lucide-react";
import { Spark } from "@/components/common/spark";
import styles from "@/components/common/kpi-tile.module.css";

export type KpiAccent = "teal" | "indigo" | "violet" | "amber" | "green" | "red";

export interface KpiTileProps {
  label: string;
  value: string;
  accent: KpiAccent;
  tooltip?: string;
  /** Staggers the pop-in animation across a row of tiles. */
  index?: number;
  /** Full trend text including its arrow, e.g. "↑ 0.07%" or "↓ 0.13 pp" — pairs with `spark`.
      Omit both on a card with no real month-over-month comparison (a config/status value); it
      then falls back to a plain caption via `detail`, with no background chart or fake trend. */
  delta?: string;
  deltaDir?: "up" | "down";
  deltaVs?: string;
  /** Background chart series — the numbers `delta` is describing. */
  spark?: number[];
  /** Plain caption shown instead of a trend line when there is no `delta`. */
  detail?: string;
  /** The small sparkle glyph next to the trend line. Defaults to shown; pass
      `false` where it reads as an unwanted "AI" mark rather than decoration. */
  sparkle?: boolean;
}

export default function KpiTile({
  label,
  value,
  accent,
  tooltip,
  index = 0,
  delta,
  deltaDir = "up",
  deltaVs = "vs last month",
  spark,
  detail,
  sparkle = true,
}: KpiTileProps) {
  const hasTrend = Boolean(delta && spark && spark.length > 0);
  const deltaTone = deltaDir === "down" ? "down" : accent === "red" ? "warn" : "up";
  const sparkString = spark && spark.length > 0 ? spark.join(",") : "0,0";

  return (
    <article
      className={`${styles.tile} a-${accent} ${styles.pop}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className={styles.head}>
        <span className={styles.lbl} title={label}>
          {label}
        </span>
        {tooltip && (
          <div className={styles.infoWrap}>
            <button type="button" className={styles.infoBtn} aria-label={`About ${label}`} tabIndex={0}>
              <Info size={13} strokeWidth={2} />
            </button>
            <div className={styles.tip} role="tooltip">
              <span className={styles.tipLbl}>{label}</span>
              <span className={styles.tipDesc}>{tooltip}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.val} title={value}>
        {value}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          position: "relative",
          zIndex: 2,
          marginTop: "auto",
        }}
      >
        {hasTrend ? (
          <div className={`${styles.del} ${styles[deltaTone]}`}>
            <span className={styles[deltaDir]}>{delta}</span> {deltaVs}
          </div>
        ) : (
          <div className={styles.del}>{detail}</div>
        )}
        {hasTrend && sparkle && <Sparkles size={13.5} strokeWidth={2.2} className={styles.sparkle} aria-hidden="true" />}
      </div>

      {hasTrend && (
        <div className={styles.spark}>
          <Spark key={`spk-${label}`} data={sparkString} bg animate />
        </div>
      )}
    </article>
  );
}
