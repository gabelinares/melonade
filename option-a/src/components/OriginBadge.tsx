import { Tooltip } from 'antd';
import { Globe, Split } from 'lucide-react';
import { Chip } from './Chip.tsx';

export interface OriginBadgeProps {
  /** The segment that surfaced this issue. Absent means full traffic. */
  segmentName?: string;
}

/**
 * Where the agent was looking when it found this. Every issue has an origin,
 * so the badge is always present and only the icon carries the difference:
 * a coloured chip on every row would be noise, not signal.
 */
export function OriginBadge({ segmentName }: OriginBadgeProps) {
  const title = segmentName ? `Found in segment: ${segmentName}` : 'Found in full traffic';
  return (
    <Tooltip title={title} mouseEnterDelay={0.2}>
      <span aria-label={title} style={{ display: 'inline-flex', flex: 'none' }}>
        <Chip iconOnly tone={segmentName ? 'info' : 'neutral'}>
          {segmentName ? <Split size={11} aria-hidden="true" /> : <Globe size={11} aria-hidden="true" />}
        </Chip>
      </span>
    </Tooltip>
  );
}
