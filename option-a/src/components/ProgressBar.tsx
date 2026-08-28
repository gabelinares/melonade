import './progress-bar.css';

export interface ProgressBarProps {
  /** 0-100. Drawn, never printed - see the note below. */
  value: number;
  /** What the bar is reporting, for a screen reader. */
  label: string;
}

/**
 * A job in flight.
 *
 * THE NUMBER IS DELIBERATELY NOT SHOWN. A UX audit reads a sample of sessions
 * and its duration is genuinely unknowable, so a percentage would be a promise
 * the agent cannot keep; the bar exists to say "still working", which is the
 * only honest thing there is to say. The accessible name says the same in
 * words, and reports the position for anyone who wants it.
 */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className="m-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span className="m-bar__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
