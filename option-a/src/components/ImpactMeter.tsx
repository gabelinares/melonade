import type { ImpactLevel } from '@shared/issues-data.ts';
import { impactLevel } from '@shared/issues-data.ts';
import './impact-meter.css';

const FILLED: Record<ImpactLevel, number> = { High: 3, Medium: 2, Low: 1 };
const TONE: Record<ImpactLevel, string> = {
  High: 'var(--m-impact-high)',
  Medium: 'var(--m-impact-medium)',
  Low: 'var(--m-impact-low)',
};

export interface ImpactMeterProps {
  /** The raw 0-100 score. The level is derived, never passed in. */
  value: number;
  /** Hide the word to fit a dense context. Off by default, on purpose. */
  compact?: boolean;
}

/**
 * Three bars and a word. The bars give a scannable shape down the column; the
 * word means nobody has to hover to learn what the shape encodes. The current
 * app hides the level behind a tooltip, which fails the "no reference" note:
 * a reader with no legend cannot tell two filled bars from three.
 */
export function ImpactMeter({ value, compact = false }: ImpactMeterProps) {
  const level = impactLevel(value);
  const filled = FILLED[level];

  return (
    <span className="m-impact" role="img" aria-label={`${level} impact`}>
      <span className="m-impact__bars" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="m-impact__bar"
            style={{
              height: `${(i + 1) * 3 + 2}px`,
              background: i < filled ? TONE[level] : 'var(--m-impact-track)',
            }}
          />
        ))}
      </span>
      {!compact && <span className="m-impact__label">{level}</span>}
    </span>
  );
}
