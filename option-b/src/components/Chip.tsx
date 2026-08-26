import type { ReactNode } from 'react';
import './chip.css';

export type ChipTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  /** A leading glyph. Sized by the chip, so callers pass the icon only. */
  icon?: ReactNode;
  title?: string;
  /** No fill, just the label. For dense rows where a fill would be noise. */
  quiet?: boolean;
}

/**
 * The one chip. Tags, statuses, plans and origins are all this component with a
 * different tone, which is the point: four callsites rolling their own span is
 * how the app being replaced ended up with four chip treatments.
 *
 * `quiet` exists because a list row shows three or four pieces of metadata at
 * once, and four filled pills on one line is a texture, not information.
 */
export function Chip({ children, tone = 'neutral', icon, title, quiet = false }: ChipProps) {
  return (
    <span
      className={`b-chip b-chip--${tone}${quiet ? ' b-chip--quiet' : ''}`}
      title={title}
    >
      {icon && <span className="b-chip__icon" aria-hidden="true">{icon}</span>}
      <span className="b-chip__label">{children}</span>
    </span>
  );
}
