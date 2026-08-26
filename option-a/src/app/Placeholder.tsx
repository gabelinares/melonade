import { AGENTS } from '../nav/agents.ts';
import './placeholder.css';

const LABEL: Record<string, string> = {
  sessions: 'Sessions',
  preferences: 'Preferences',
  support: 'Support',
};

export interface PlaceholderProps {
  /** A nav destination key. Resolves to that agent's or page's own name. */
  page?: string;
  /** Overrides the resolved name, for a placeholder that is not a whole page. */
  title?: string;
  /** Overrides the standard note. Keep it to what is missing and what is not. */
  note?: string;
  /** Sized to sit inside a row or a card rather than to fill a page. */
  compact?: boolean;
}

/**
 * Honest scaffolding, in one component, for everything this round does not
 * show. Two callers now: a nav destination that was never built, and the issue
 * write-up, which is built and deliberately held back.
 *
 * Saying so plainly beats a fake screen, and beats a real screen that is known
 * to be changing: a reviewer who clicks Tests and finds a half-built table
 * reviews the half-built table.
 */
export function Placeholder({ page, title, note, compact }: PlaceholderProps) {
  const agent = page ? AGENTS.find((a) => a.key === page) : undefined;
  const name = title ?? agent?.label ?? (page ? LABEL[page] ?? page : '');

  return (
    <div className={`m-placeholder${compact ? ' is-compact' : ''}`}>
      <p className="m-placeholder__name">{name}</p>
      <p className="m-placeholder__note">
        {note ??
          'Not built yet. This round covers the Issues page and the menu, which is where the design decision actually sits. The menu row you just clicked is real, so you can judge how this scales.'}
      </p>
    </div>
  );
}
