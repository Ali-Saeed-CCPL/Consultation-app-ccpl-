import { useId } from "react";
import styles from "@/components/common/spark.module.css";

/** Sparkline + line chart SVG builders ported from wbSpark / wbLine */

/**
 * Sparkline.
 *
 * `bg` renders it as the KPI tile's background instead of a strip beneath the
 * number: it fills its container, the area becomes a vertical gradient of the
 * tile's --accent fading downwards, and two faint gridlines make it read as a
 * chart rather than decoration. Opacities are kept low enough that the 25px
 * --ink figure stays legible on top. Gradient ids are per-instance, otherwise
 * six tiles on one page would all resolve to the first tile's accent.
 */
/**
 * Smallest "round" number at least 5% above `v`, for a chart axis ceiling:
 * 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 or 10 times a power of ten.
 */
function axisCeiling(v: number): number {
  const target = v * 1.05;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * mag >= target) return step * mag;
  }
  return 10 * mag;
}

export function Spark({
  data,
  bg = false,
  animate = false,
}: {
  data: string;
  bg?: boolean;
  /** Draw the line on rather than showing it complete. See Spark.module.css. */
  animate?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const pts = data.split(",").map(Number);
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const pad = mx - mn || 1;

  /* Two different scales, deliberately.
     bg: a real chart — zero baseline, and a rounded axis ceiling above the
     series maximum. Height therefore means magnitude, the area is anchored on
     the tile's bottom edge and runs the full width, and the series ends
     wherever the data puts it instead of being pinned to the top.
     strip: the original min/max normalisation, which fills the short band. */
  const top = bg ? 1 : 3;
  const span = bg ? 28 : 24;
  // mx === 0 (an all-zero series, e.g. a KPI genuinely at 0) would otherwise
  // make axisCeiling return 0 too, and v / axisMax below divide 0 by 0 — NaN
  // coordinates and a chart that silently fails to render.
  const axisMax = bg ? axisCeiling(mx || 1) : 0;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * 100,
    bg
      ? top + span - (v / axisMax) * span
      : top + span - ((v - mn) / pad) * span,
  ]);
  const line = xy.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const last = xy[xy.length - 1];

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: bg ? "100%" : 30,
        display: "block",
        overflow: "visible",
      }}
      aria-hidden="true"
    >
      {bg && (
        <defs>
          <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.17" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.015" />
          </linearGradient>
        </defs>
      )}

      <polygon
        className={animate ? styles.area : undefined}
        points={`0,30 ${line} 100,30`}
        fill={bg ? `url(#sp-${gid})` : "var(--tint)"}
      />
      <polyline
        className={animate ? styles.line : undefined}
        points={line}
        pathLength={animate ? 1 : undefined}
        fill="none"
        stroke="var(--accent)"
        strokeOpacity={bg ? 0.18 : 1}
        strokeWidth={bg ? 1.2 : 1.6}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className={animate ? styles.dot : undefined}
        cx={last[0].toFixed(1)}
        cy={last[1].toFixed(1)}
        r={bg ? 2 : 2.4}
        fill="var(--accent)"
        fillOpacity={bg ? 0.25 : 1}
      />
    </svg>
  );
}

export function LineChart({ data }: { data: string }) {
  const pts = data.split(",").map(Number);
  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const pad = mx - mn || 1;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * 300,
    104 - ((v - mn) / pad) * 96,
  ]);
  const line = xy.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  /* Stretches to fill its container (min 112px) so the tile can grow with its
     column. Strokes are non-scaling and the points are zero-length round-capped
     lines, so nothing distorts into ellipses when the aspect ratio changes. */
  return (
    <svg
      viewBox="0 0 300 112"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", minHeight: 112, display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      {[8, 56, 104].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="300"
          y2={y}
          stroke="var(--hair)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <polygon points={`0,112 ${line} 300,112`} fill="var(--tint)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {xy.map((p, i) => (
        <line
          key={i}
          x1={p[0].toFixed(1)}
          y1={p[1].toFixed(1)}
          x2={p[0].toFixed(1)}
          y2={p[1].toFixed(1)}
          stroke="var(--accent)"
          strokeWidth="5.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
