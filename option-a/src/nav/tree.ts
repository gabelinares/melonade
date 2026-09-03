/* ══════════════════════════════════════════════════════════════════════════
   THE MENU'S SHAPE, as data.

   Gabriel's structure, 2026-09-04 - the third cut in three days, and the first
   one that describes the WHOLE product rather than the part that is built.

   ── WHAT CHANGED, AND WHY IT IS BETTER ────────────────────────────────────
   09-03 had three groups (an unlabelled first, "Agents", "Product") with nine
   top-level rows between them and exactly one row that opened. This has SIX
   top-level rows, no groups and no rules, and every one of them opens.

   That is the version that answers Mehdi's actual ask on 09-02 - *"the name of
   the product... limit the number of stuff you have visible, and then have sub
   menus"* - because a group label is not a limit. A label sorts nine visible
   rows into three piles; a parent row REPLACES its children until you ask for
   them. Six rows is what you see; twenty-one destinations is what is there.

   It also resolves the label argument by dissolving it. "Agents" spent 09-02 as
   an uppercase group label, 09-03 as a bare rule, then went back to a label -
   and it is a PAGE now, with Issues, Synthetics and Audits inside it. The
   heading that could not decide what it was turned out to be a destination.

   ── ONE RULE STILL DECIDES WHAT IS IN HERE ────────────────────────────────
   ⚠ **TABS DO NOT APPEAR IN THE MENU. ONLY SUBITEMS DO.** A tab belongs to the
   page it is on, and the page already draws it. Gabriel's spec marks each row
   as one or the other and the two are not interchangeable: Synthetics' Tests /
   Runs / Environments are marked **(Tab)** and stay in `TestsPage`, while
   Sessions / Bookmarks / Segments are marked **(Subitem)** and therefore have
   to LEAVE the sessions page's tab strip. They are three menu rows now, and
   `SessionsPage` no longer draws a strip of its own - see AppShell, where the
   route is the one thing that says which of the three you are on.

   ── WHAT IS NOT HERE ──────────────────────────────────────────────────────
   ⚠ **Highlights is gone**, marked "(remove)" in the spec. It was a kill
   candidate in the 09-02 numbers (under 2% of customers) and this is the call.

   ⚠ **Search is gone too, and that one is a JUDGEMENT.** It became a row on
   09-02 on Mehdi's own ask, and it is absent from both the 09-03 and 09-04
   specs. On 09-03 that was read as an omission because the spec was about
   hierarchy; this spec enumerates twenty-one destinations across six areas and
   invents four that did not exist, so it is describing the whole menu. A search
   field also already sits at the top of the sessions list, which is the thing
   that row opened. **One line below to put it back** if the omission was
   accidental.

   ⚠ **Alerts is back**, under Product Analytics. It was a kill candidate on
   09-02; the spec lists it, so it lives.
   ══════════════════════════════════════════════════════════════════════════ */

import { AGENTS, type AgentEntry, type AgentIconName } from './agents.ts';

export type NavIconName =
  | 'search'
  | 'recordings'
  | 'agents'
  | 'cobrowse'
  | 'spot'
  | 'analytics'
  | 'dataManagement';

export interface NavEntry {
  /** The nav key, which is also the route. A subitem's is `parent/child`. */
  key: string;
  label: string;
  /** Absent on a SUBITEM: the indent and the parent above it already say what
   *  it belongs to, and a nested column of glyphs is a texture.
   *
   *  ⚠ This costs something now that it did not cost on 09-03, and it is worth
   *  saying out loud: Issues, Synthetics and Audits were top-level rows with
   *  recognisable glyphs and are subitems without them. The rule is kept
   *  anyway, because the alternative is glyphs on some nestings and not others
   *  - Recordings' three subitems have no natural marks at all - and a menu
   *  whose indent sometimes carries an icon column and sometimes does not is
   *  harder to read than one that never does. */
  icon?: NavIconName;
  /** An agent's glyph, which is named in its own roster rather than here - so
   *  the map that says what a Tests agent looks like stays in one place. This
   *  file names no glyph and imports no component; the nav resolves whichever
   *  of the two is set. */
  agentIcon?: AgentIconName;
  /** Open work behind it. Zero renders nothing. */
  count?: number;
  /** What the count counts, for the narrow menu's tooltip: "11 open". */
  countNoun?: string;
  /** A word, not a number: "Soon". */
  badge?: string;
  /** SUBITEMS, never tabs. See the note at the top of this file. */
  items?: NavEntry[];
}

export interface NavGroup {
  /** Absent on the first group only. */
  label?: string;
  entries: readonly NavEntry[];
}

/** An agent, as a nav SUBITEM. ⚠ No `agentIcon`: see the note on `icon`. The
 *  count and the badge survive, because those say something the indent cannot -
 *  how much is waiting, and whether the page exists yet. */
const fromAgent = (a: AgentEntry): NavEntry => ({
  key: `agents/${a.key}`,
  label: a.label,
  count: a.count,
  countNoun: a.countNoun,
  badge: a.shipped ? undefined : 'Soon',
});

/**
 * The tree. `agentCount` is the prototype's growth control, which is the whole
 * reason the roster is data: the menu can be looked at with three agents in it
 * and with eleven, without editing a component.
 *
 * ⚠ It tests something different now. It used to ask *can the column hold
 * eleven top-level rows*; it asks *can one parent hold eleven children*, which
 * is the question this structure actually raises.
 *
 * ── GROUPS ARE KEPT THOUGH NOTHING USES THEM ──────────────────────────────
 * One unlabelled group, so no label and no rule renders. The machinery stays
 * because this menu has been restructured three times in three days and a
 * heading is one line away either direction; deleting it now would mean writing
 * it again on Monday.
 */
export function navTree(agentCount: number, newSessions = 0): readonly NavGroup[] {
  const shown = AGENTS.slice(0, agentCount);
  return [
    {
      entries: [
        /* PUT SEARCH BACK BY UNCOMMENTING THIS. See the note at the top.
        { key: 'search', label: 'Search', icon: 'search' }, */
        {
          key: 'recordings',
          label: 'Recordings',
          icon: 'recordings',
          /* ⚠ THE SAME ROLLUP THE AGENTS GET (Gabriel, 2026-09-04: "add the new
             sessions in the Recordings item, just like in agents"). A parent
             carries the sum of what is inside it, so a closed row still says
             whether there is anything in there - and here there is exactly one
             counted child, so the two figures agree by construction rather
             than by being kept in step.

             It counts sessions you have NOT WATCHED, which is what "new" means
             for a list you come back to. Bookmarks and Segments count nothing:
             a bookmark is something you chose, not something waiting. */
          count: newSessions,
          countNoun: 'not watched yet',
          /* ⚠ THESE THREE WERE THE SESSIONS PAGE'S TAB STRIP until 09-04. They
             are marked (Subitem) in the spec, and a thing cannot be a tab and a
             menu row at once without two controls that have to be kept in
             agreement - which is the rule at the top of this file. The strip
             came out of `SessionsPage`; the route drives the section now. */
          items: [
            { key: 'recordings/sessions', label: 'Sessions', count: newSessions, countNoun: 'not watched yet' },
            { key: 'recordings/bookmarks', label: 'Bookmarks' },
            { key: 'recordings/segments', label: 'Segments' },
          ],
        },
        {
          key: 'agents',
          label: 'Agents',
          icon: 'agents',
          /* ⚠ A PARENT'S COUNT IS THE SUM OF WHAT IS INSIDE IT. Every counted
             row in the product is a subitem now, so without this the count
             column - which is the menu's whole argument, and the reason the
             narrow rail keeps a dot where the figure was - empties out the
             moment the menu is collapsed and the subitems stop rendering.

             It is also just true: a parent that hides three lists hides their
             work too, and "19" over a closed row is what you need to know
             before you decide whether to open it. The noun is a rollup because
             the three underneath disagree - open, waiting on you, still
             reading - and a single word cannot be all three. */
          count: shown.reduce((n, a) => n + a.count, 0),
          countNoun: 'waiting across the agents',
          items: shown.map(fromAgent),
        },
        /* Two products of OpenReplay's that this prototype has never drawn, and
           they are single rows because they ARE single pages: co-browsing is one
           report list, Spot is one library of clips. */
        { key: 'cobrowse', label: 'CoBrowse', icon: 'cobrowse' },
        { key: 'spot', label: 'Spot', icon: 'spot' },
        {
          key: 'analytics',
          label: 'Product Analytics',
          icon: 'analytics',
          items: [
            { key: 'analytics/dashboards', label: 'Dashboards' },
            { key: 'analytics/cards', label: 'Cards' },
            { key: 'analytics/alerts', label: 'Alerts' },
          ],
        },
        {
          key: 'data',
          label: 'Data Management',
          icon: 'dataManagement',
          /* ⚠ Activity moved IN HERE, which is the 09-02 call ("Activity moves
             into Data Management") finally drawn. It was a top-level row on
             09-03. */
          items: [
            { key: 'data/activity', label: 'Activity' },
            { key: 'data/people', label: 'People' },
            { key: 'data/events', label: 'Events' },
            { key: 'data/properties', label: 'Properties' },
            { key: 'data/features', label: 'Features' },
          ],
        },
      ],
    },
  ];
}
