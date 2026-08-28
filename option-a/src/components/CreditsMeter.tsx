import { Tooltip } from 'antd';
import { ProgressBar } from './ProgressBar.tsx';
import './credits-meter.css';

const compact = (n: number): string =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);

export interface CreditsMeterProps {
  /** Credits spent in the current period. */
  used: number;
  /** What the plan includes for the period. */
  included: number;
  /** When the count starts again, for the tooltip. */
  resetsOn: string;
}

/**
 * What the agents have cost this month, at the foot of the menu.
 *
 * Agents spend money while nobody is watching - that is the whole proposition -
 * so the one number that has to be permanently visible is how much they have
 * spent. It sits below the tools rather than inside a billing page, because a
 * number you have to go and look for is a number you look at after the invoice.
 *
 * One line, and it is a MEASURE rather than an alert: no colour until it
 * matters. The exact figures are on hover; the bar is what gets read.
 */
export function CreditsMeter({ used, included, resetsOn }: CreditsMeterProps) {
  const pct = included > 0 ? Math.min(100, (used / included) * 100) : 0;
  return (
    <Tooltip
      placement="top"
      title={`${used.toLocaleString()} of ${included.toLocaleString()} credits used. Resets ${resetsOn}.`}
    >
      <div className="m-credits" role="group" aria-label={`Credits: ${used} of ${included} used`}>
        <span className="m-credits__label">Credits</span>
        <ProgressBar value={pct} label={`${Math.round(pct)}% of this month's credits used`} />
        <span className="m-credits__value">
          {compact(used)} / {compact(included)}
        </span>
      </div>
    </Tooltip>
  );
}
