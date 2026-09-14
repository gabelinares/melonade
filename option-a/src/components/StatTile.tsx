import type { ReactNode } from 'react';
import './stat-tile.css';

export interface StatTileProps {
  value: ReactNode;
  label: ReactNode;
  /** `accent` is the one coloured tile a pair is allowed - production's teal
   *  "Total interactions" beside a grey "Unique users". */
  tone?: 'neutral' | 'accent';
}

/** A figure over its noun, in a tinted box. Two of them side by side is the
 *  whole "Metrics" block a feature shows; one is enough anywhere else. */
export function StatTile({ value, label, tone = 'neutral' }: StatTileProps) {
  return (
    <div className={`m-tile m-tile--${tone}`}>
      <span className="m-tile__value">{value}</span>
      <span className="m-tile__label">{label}</span>
    </div>
  );
}
