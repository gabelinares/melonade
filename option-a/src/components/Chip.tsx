import type { ReactNode } from 'react';
import './chip.css';

export type ChipTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

export interface ChipProps {
  children: ReactNode;
  /** Colour carries meaning only. A tag has no tone; a status does. */
  tone?: ChipTone;
  /** An icon replaces the label entirely, used for the origin badge. */
  iconOnly?: boolean;
  title?: string;
}

/**
 * The one chip in the system. Tags, statuses, and counts are all this
 * component with a different tone, which is the whole point: the current app
 * grew four near-identical chip treatments because each callsite rolled its
 * own span.
 */
export function Chip({ children, tone = 'neutral', iconOnly = false, title }: ChipProps) {
  return (
    <span
      className={`m-chip m-chip--${tone}${iconOnly ? ' m-chip--icon' : ''}`}
      title={title}
    >
      {children}
    </span>
  );
}
