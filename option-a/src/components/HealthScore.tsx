import { healthBand } from '@shared/audits-data.ts';
import './health-score.css';

export interface HealthScoreProps {
  /** 0-100, where 100 is a healthy experience. */
  score: number;
}

/**
 * The audit's headline number.
 *
 * A number and not a meter, which is the opposite of the choice the issue
 * queue's impact makes, and for a reason: impact is a rank - all a reader needs
 * is high, medium or low against the row above - while a health score is a
 * FINDING. It gets quoted in a meeting, compared against last month's audit,
 * and put on the cover of the report, so rounding it into three buckets would
 * throw away the thing people came for. The band only colours it.
 */
export function HealthScore({ score }: HealthScoreProps) {
  const band = healthBand(score);
  return (
    <span className={`m-health m-health--${band}`} aria-label={`Health ${score} out of 100`}>
      {score}
      <span className="m-health__of" aria-hidden="true">/100</span>
    </span>
  );
}
