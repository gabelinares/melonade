import type { ImpactLevel } from '@shared/issues-data.ts';
import { impactLevel } from '@shared/issues-data.ts';
import './impact-dot.css';

const TONE: Record<ImpactLevel, string> = {
  High: 'var(--m-impact-high)',
  Medium: 'var(--m-impact-medium)',
  Low: 'var(--m-impact-low)',
};

export interface ImpactDotProps {
  value: number;
  /** Show the level word beside the dot. Off inside a grouped list, where the
   *  group header already says it; on wherever the row stands alone. */
  withLabel?: boolean;
}

/**
 * One filled dot, three colours.
 *
 * Option A uses a three-bar meter because its list is an ungrouped table where
 * each row has to carry its own rank. Here the list is GROUPED by impact band
 * with a header per band, so repeating the level on all five rows underneath it
 * would be saying the same thing six times. The dot is a colour anchor, not a
 * reading, and the word only appears where the group header is absent.
 */
export function ImpactDot({ value, withLabel = false }: ImpactDotProps) {
  const level = impactLevel(value);
  return (
    <span className="b-dot-wrap" role="img" aria-label={`${level} impact`}>
      <span className="b-dot" style={{ background: TONE[level] }} aria-hidden="true" />
      {withLabel && <span className="b-dot__label">{level}</span>}
    </span>
  );
}
