import { Tooltip } from 'antd';
import { lastSeenExact, lastSeenLabel } from '@shared/issues-data.ts';

export interface RelativeTimeProps {
  /** Minutes since the event. */
  minutesAgo: number;
}

/** Relative on the surface, absolute on hover. Both come from one place so a
 *  list and a detail page can never disagree about when something happened. */
export function RelativeTime({ minutesAgo }: RelativeTimeProps) {
  return (
    <Tooltip title={lastSeenExact(minutesAgo)} mouseEnterDelay={0.2}>
      <time
        style={{
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
          fontFamily: 'var(--m-font-num)',
          fontVariantNumeric: 'tabular-nums',
          cursor: 'default',
        }}
      >
        {lastSeenLabel(minutesAgo)}
      </time>
    </Tooltip>
  );
}
