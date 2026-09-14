import { useId, useState, type CSSProperties } from 'react';
import type { Heat, Path, Point, Row } from '@shared/analytics-logic.ts';
import './mini-chart.css';

/* ══════════════════════════════════════════════════════════════════════════
   FOUR SMALL CHARTS, ONE SERIES EACH.

   A dashboard widget and a card's preview draw the same thing, so the marks
   live here once. Every chart is single-series in the app's one accent: no
   legend (the title names the series), thin marks, recessive baseline, values
   in text ink rather than series colour, and a hover layer that says the
   figure under the pointer - the dataviz rules, applied with the tokens this
   app already has rather than a palette of its own.
   ══════════════════════════════════════════════════════════════════════════ */

const fmtDay = (t: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(t));
const fmtNum = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());

/* ── a line over time ─────────────────────────────────────────────────────── */
export function LineChart({ points, height = 140, area = true }: { points: Point[]; height?: number; area?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const W = 100;
  const H = 40;
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const lo = Math.max(0, min - (max - min) * 0.25);
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => H - ((v - lo) / Math.max(1, max - lo)) * (H - 4) - 2;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' ');
  const fill = `${d} L${W},${H} L0,${H} Z`;
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const h = hover != null ? points[hover] : null;
  return (
    <div className="m-chart m-chart--line" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line className="m-chart__base" x1="0" x2={W} y1={H - 0.25} y2={H - 0.25} />
        {area && <path d={fill} fill={`url(#${id})`} className="m-chart__area" />}
        <path d={d} className="m-chart__line" />
        {h && hover != null && (
          <>
            <line className="m-chart__cross" x1={x(hover)} x2={x(hover)} y1="0" y2={H} />
            <circle className="m-chart__dot" cx={x(hover)} cy={y(h.value)} r="1.6" />
          </>
        )}
      </svg>
      <div className="m-chart__axis" aria-hidden="true">
        <span>{fmtDay(points[0]!.at)}</span>
        <span>{fmtDay(points[points.length - 1]!.at)}</span>
      </div>
      {h && hover != null && (
        <div className="m-chart__tip" style={{ left: `${x(hover)}%` } as CSSProperties} role="status">
          <span className="m-chart__tip-when">{fmtDay(h.at)}</span>
          <span className="m-chart__tip-value">{fmtNum(h.value)}</span>
        </div>
      )}
      <table className="m-sr-only">
        <tbody>
          {points.map((p) => (
            <tr key={p.at}>
              <th scope="row">{fmtDay(p.at)}</th>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── rows as bars - a funnel, a table ─────────────────────────────────────── */
export function BarList({ rows, funnel = false }: { rows: Row[]; funnel?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className={`m-chart m-chart--bars${funnel ? ' is-funnel' : ''}`}>
      {rows.map((r, i) => {
        const share = funnel && i > 0 ? Math.round((r.value / rows[i - 1]!.value) * 100) : null;
        return (
          <li key={r.label} className="m-chart__bar-row" title={`${r.label}: ${r.value.toLocaleString()}`}>
            <span className="m-chart__bar-label m-truncate">{r.label}</span>
            <span className="m-chart__bar-track">
              <span className="m-chart__bar" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="m-chart__bar-value">
              {fmtNum(r.value)}
              {share != null && <span className="m-chart__bar-share"> · {share}%</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── a heat grid - one hue, light to dark ─────────────────────────────────── */
export function HeatGrid({ heat }: { heat: Heat }) {
  return (
    <div className="m-chart m-chart--heat" style={{ '--m-heat-cols': heat.cols.length } as CSSProperties}>
      <span />
      {heat.cols.map((c) => (
        <span key={c} className="m-chart__heat-col">{c}</span>
      ))}
      {heat.rows.map((r, ri) => (
        <FragmentRow key={r} label={r} values={heat.values[ri]!} cols={heat.cols} />
      ))}
    </div>
  );
}
function FragmentRow({ label, values, cols }: { label: string; values: number[]; cols: string[] }) {
  return (
    <>
      <span className="m-chart__heat-row m-truncate">{label}</span>
      {values.map((v, i) => (
        <span
          key={i}
          className="m-chart__heat-cell"
          style={{ '--m-heat': v } as CSSProperties}
          title={`${label} at ${cols[i]}: ${Math.round(v * 100)}`}
          role="img"
          aria-label={`${label} at ${cols[i]}: ${Math.round(v * 100)}`}
        />
      ))}
    </>
  );
}

/* ── ranked paths ─────────────────────────────────────────────────────────── */
export function PathList({ paths }: { paths: Path[] }) {
  const max = Math.max(1, ...paths.map((p) => p.sessions));
  return (
    <ol className="m-chart m-chart--paths">
      {paths.map((p, i) => (
        <li key={i} className="m-chart__path">
          <span className="m-chart__path-rank">{i + 1}</span>
          <span className="m-chart__path-steps">
            {p.steps.map((s, j) => (
              <span key={j} className="m-chart__path-step">
                {j > 0 && <span className="m-chart__path-arrow" aria-hidden="true">→</span>}
                <span className="m-mono">{s}</span>
              </span>
            ))}
          </span>
          <span className="m-chart__bar-track m-chart__path-track">
            <span className="m-chart__bar" style={{ width: `${(p.sessions / max) * 100}%` }} />
          </span>
          <span className="m-chart__bar-value">{fmtNum(p.sessions)}</span>
        </li>
      ))}
    </ol>
  );
}
