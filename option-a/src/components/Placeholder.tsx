import type { LucideIcon } from 'lucide-react';
import { Hammer } from 'lucide-react';
import { AGENTS } from '../nav/agents.ts';
import { AGENT_ICONS, PAGE_ICONS } from '../nav/icons.ts';
import { navTree } from '../nav/tree.ts';
import { PageCard } from './PageCard.tsx';
import './placeholder.css';

/* ⚠ DERIVED FROM THE MENU, NOT HAND-KEPT. This was a six-entry `LABEL` map, and
   the 09-04 restructure would have left every one of its keys stale while
   twelve new destinations printed their raw route ("data/properties") as a page
   title. The tree already knows every key and every name; asking it is the only
   version that cannot drift.

   Built at the roster's FULL length so an unshipped agent still names itself -
   the prototype's growth control changes what the menu shows, not what a
   destination is called. */
const DESTINATIONS: ReadonlyMap<string, { label: string; Icon: LucideIcon }> = (() => {
  const out = new Map<string, { label: string; Icon: LucideIcon }>();
  const glyph = (key: string, parentIcon?: string): LucideIcon => {
    /* An agent's own mark, which the tree deliberately stops carrying once the
       roster is nested (subitems have no icons). A placeholder is not a menu
       row, so it can have it back: at 22px in the middle of an empty plane the
       glyph is the only thing saying which agent this is. */
    const agent = AGENTS.find((a) => `agents/${a.key}` === key);
    if (agent) return AGENT_ICONS[agent.icon];
    /* Otherwise the row's own glyph, or its parent's - a Cards page wearing the
       analytics chart is right, because that is what it is part of. */
    return PAGE_ICONS[key.split('/').pop() ?? key] ?? (parentIcon ? PAGE_ICONS[parentIcon] : undefined) ?? Hammer;
  };
  for (const group of navTree(AGENTS.length)) {
    for (const e of group.entries) {
      out.set(e.key, { label: e.label, Icon: glyph(e.key, e.icon) });
      for (const sub of e.items ?? []) out.set(sub.key, { label: sub.label, Icon: glyph(sub.key, e.icon) });
    }
  }
  return out;
})();

/** The handful of destinations that are not menu rows: the foot's glyphs, and
 *  the two keys older stories still pass. */
const OFF_MENU: Record<string, string> = {
  home: 'Home',
  preferences: 'Preferences',
  support: 'Support',
  notifications: 'Notifications',
  search: 'Search',
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
  const dest = page ? DESTINATIONS.get(page) : undefined;
  const isAgent = !!page && AGENTS.some((a) => `agents/${a.key}` === page);
  const name = title ?? dest?.label ?? (page ? OFF_MENU[page] ?? page : '');
  const Icon = dest?.Icon ?? (page ? PAGE_ICONS[page] : undefined) ?? Hammer;

  const body = (
    <div className={`m-placeholder${compact ? ' is-compact' : ''}`}>
      <span className="m-placeholder__glyph" aria-hidden="true">
        <Icon size={compact ? 18 : 22} />
      </span>
      <p className="m-placeholder__name">{title ?? 'Not built yet'}</p>
      <p className="m-placeholder__note">
        {note ??
          (isAgent
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
