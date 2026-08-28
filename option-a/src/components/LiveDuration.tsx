import { useEffect, useState } from 'react';
import { elapsed } from '@shared/runs-data.ts';

export interface LiveDurationProps {
  /** When the run started. */
  startedAt: number;
}

/**
 * The elapsed time of a run still in flight, ticking.
 *
 * A finished run prints a duration; an unfinished one printing a dash would
 * throw away the only thing anybody wants to know about it, which is how long
 * it has been going. It ticks once a second because a counter that does not
 * move is indistinguishable from a stopped run.
 */
export function LiveDuration({ startedAt }: LiveDurationProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      style={{
        fontSize: 'var(--m-text-sm)',
        color: 'var(--m-content-accent)',
        fontFamily: 'var(--m-font-num)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {elapsed(startedAt, now)}
    </span>
  );
}
