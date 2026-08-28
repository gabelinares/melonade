import { Hammer } from 'lucide-react';
import { AGENTS } from '../nav/agents.ts';
import { AGENT_ICONS, PAGE_ICONS } from '../nav/icons.ts';
import { PageCard } from './PageCard.tsx';
import './placeholder.css';

const LABEL: Record<string, string> = {
  home: 'Home',
  sessions: 'Sessions',
  preferences: 'Preferences',
  support: 'Support',
  notifications: 'Notifications',
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
 * show.
 *
 * Saying so plainly beats a fake screen, and beats a real screen that is known
 * to be changing: a reviewer who clicks Tests and finds a half-built table
 * reviews the half-built table.
 *
 * ── 2026-08-28: it takes the whole plane ───────────────────────────────────
 * It used to be a note floating on the shell's ground, which meant the one
 * thing an unbuilt page still has to show - THE SHELL - was the thing it did
 * not show: no card, no header, no wrap, so clicking Home looked like the app
 * had come apart rather than like a page nobody has built yet. It is a real
 * PageCard now, with the destination's own name in the header and its own glyph
 * in the middle, so an empty page is still a page.
 */
export function Placeholder({ page, title, note, compact }: PlaceholderProps) {
  const agent = page ? AGENTS.find((a) => a.key === page) : undefined;
  const name = title ?? agent?.label ?? (page ? LABEL[page] ?? page : '');
  const Icon = (agent ? AGENT_ICONS[agent.icon] : page ? PAGE_ICONS[page] : undefined) ?? Hammer;

  const body = (
    <div className={`m-placeholder${compact ? ' is-compact' : ''}`}>
      <span className="m-placeholder__glyph" aria-hidden="true">
        <Icon size={compact ? 18 : 22} />
      </span>
      <p className="m-placeholder__name">{title ?? 'Not built yet'}</p>
      <p className="m-placeholder__note">
        {note ??
          (agent
            ? 'This agent is in the roster so the menu can be judged with more than three things in it. Its page is the next one to design.'
            : 'This round covers the agents and the shell around them, which is where the design decisions sit. The menu row you just clicked is real, so you can judge how it all holds together.')}
      </p>
    </div>
  );

  /* A placeholder INSIDE something - a row, a panel - stays a note. A
     placeholder that IS the destination gets the page shell. */
  if (compact) return body;

  return (
    <PageCard title={name} subtitle="Not designed yet — the shell around it is.">
      {body}
    </PageCard>
  );
}
