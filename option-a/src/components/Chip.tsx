import type { ReactNode } from 'react';
import './chip.css';

export type ChipTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

export interface ChipProps {
  children: ReactNode;
  /** Colour carries meaning only. A tag has no tone; a status does. */
  tone?: ChipTone;
  /** WHAT KIND OF CHIP THIS IS, which decides how it is SET rather than how it
   *  is coloured.
   *
   *  A tag is a label you scan - "Payment", "Checkout" - and some type systems
   *  set those as small caps with air in them, the way GitHub, Stripe and
   *  Vercel all do with metadata. A status is a word you READ - "Needs review",
   *  "Ignores SSL errors" - and small caps on a sentence is shouting. Setting
   *  both the same way was the note that came back: "unbalanced, too big". */
  kind?: 'tag' | 'status';
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
export function Chip({ children, tone = 'neutral', kind = 'tag', iconOnly = false, title }: ChipProps) {
  return (
    <span
      className={`m-chip m-chip--${tone} m-chip--${kind}${iconOnly ? ' m-chip--icon' : ''}`}
      title={title}
    >
      {children}
    </span>
  );
}
