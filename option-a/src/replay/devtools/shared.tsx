import { useMemo, type ReactNode } from 'react';
import { Input } from 'antd';
import { Search } from 'lucide-react';
import { formatClock } from '@shared/replay.ts';
import type { ReplayClock } from '../useReplayClock.ts';

/* ── THE PIECES EVERY PANEL IS MADE OF ───────────────────────────────────────
   Production's BottomBlock has one header idiom and one row idiom, and every
   tab reuses them: a 40px bar with the title and its sub-tabs on the left and
   the filters on the right; rows that carry their time at the right edge, dim
   once they are ahead of the playhead, and jump when clicked. Four tabs
   sharing these is what makes them read as one tool rather than four. */

/** The bar under the tab strip: what this tab is filtering by, and how. */
export function PanelBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="m-dt__bar">
      <div className="m-dt__bar-left">{left}</div>
      {right && <div className="m-dt__bar-right">{right}</div>}
    </div>
  );
}

/** Production's "Filter by keyword" box, at the size of the bar it sits in. */
export function Keyword({
  value,
  onChange,
  placeholder = 'Filter by keyword',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      size="small"
      allowClear
      className="m-dt__keyword"
      prefix={<Search size={12} aria-hidden="true" />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    />
  );
}

/** The index of the last item the playhead has passed, or -1 before the first.
 *  Every list reads this to light "now" and dim what is still ahead. */
export function useNowIndex<T extends { at: number }>(items: readonly T[], clock: ReplayClock): number {
  return useMemo(() => {
    let i = -1;
    items.forEach((it, n) => { if (clock.at >= it.at) i = n; });
    return i;
  }, [items, clock.at]);
}

export interface DevRowProps {
  at: number;
  clock: ReplayClock;
  /** the last row the head has passed */
  now: boolean;
  tone?: 'error' | 'warn';
  expanded?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

/** One row of a list. Ahead of the playhead it fades; clicking it seeks, the
 *  way production's JUMP does - here the whole row is the target and the time
 *  at its edge is the label, so there is no hover-only control to discover. */
export function DevRow({ at, clock, now, tone, expanded, onClick, className, children }: DevRowProps) {
  const ahead = at > clock.at;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`m-dt__row${ahead ? ' is-ahead' : ''}${now ? ' is-now' : ''}${tone ? ` is-${tone}` : ''}${
        expanded ? ' is-open' : ''
      }${className ? ` ${className}` : ''}`}
      onClick={onClick ?? (() => clock.seek(at))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (onClick ?? (() => clock.seek(at)))(); }
      }}
      title={onClick ? undefined : `Jump to ${formatClock(at)}`}
    >
      {children}
      <span className="m-dt__at m-mono">{formatClock(at)}</span>
    </div>
  );
}

/** Production's ⓘ "No Data", with room for the one sentence that says what
 *  would have been here. */
export function NoData({ title = 'No data', hint }: { title?: string; hint?: ReactNode }) {
  return (
    <div className="m-dt__nodata">
      <p className="m-dt__nodata-title">{title}</p>
      {hint && <p className="m-dt__nodata-hint">{hint}</p>}
    </div>
  );
}

/** Eight labels across the session, the way production's TimelineScale and
 *  the network waterfall header both divide it. */
export function timeTicks(duration: number, n = 8): { at: number; pct: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const at = (duration / n) * (i + 0.5);
    return { at, pct: (at / duration) * 100 };
  });
}

export const pctOf = (at: number, duration: number) => Math.min(100, Math.max(0, (at / duration) * 100));
