/* ══════════════════════════════════════════════════════════════════════════
   THE MENU'S SHAPE, as data.

   Gabriel's structure, 2026-09-03, which is the first version of Mehdi's
   09-02 ask ("the name of the product... limit the number of stuff you have
   visible, and then have sub menus") drawn out in full.

   ── ONE RULE DECIDES WHAT IS IN HERE ─────────────────────────────────────
   ⚠ **TABS DO NOT APPEAR IN THE MENU. ONLY SUBITEMS DO.** A tab belongs to the
   page it is on, and the page already draws it - Synthetics' Tests / Runs /
   Environments strip lives in `TestsPage`, the sessions strip in
   `SessionsPage`. Putting the same three rows in the nav as well made them
   exist in two places that had to be kept in agreement, and it is why Mehdi
   asked for two levels rather than three: *"synthetics will not have anything
   below it... we can rely on these tabs like tests, runs, whatever."*

   So there are exactly TWO levels here. `items` on an entry is a list of
   SUBITEMS - real destinations of their own - and only one entry in the whole
   tree has any: Analytics, which holds Data Management and Dashboards.

   ── AND THE GROUPS ARE NAMED AGAIN ────────────────────────────────────────
   ⚠ The "AGENTS" label became a bare rule on 09-02, and the argument was
   sound: one group does not need to be told what it is, and the word was the
   only uppercase type in the column. That argument dies at two groups. A rule
   between Audits and Analytics says *something changed*; it cannot say
   *changed to what*, so the reader is left inferring the category from the
   rows - which is the job a label does in one word. The first group keeps no
   label, because the top of a menu does not need to be told it is the top.
   ══════════════════════════════════════════════════════════════════════════ */

import { AGENTS, type AgentEntry, type AgentIconName } from './agents.ts';

export type NavIconName =
  | 'search'
  | 'sessions'
  | 'highlights'
  | 'analytics'
  | 'dataManagement'
  | 'dashboards'
  | 'activity';

export interface NavEntry {
  /** The nav key, which is also the route. A subitem's is `parent/child`. */
  key: string;
  label: string;
  /** Absent on a SUBITEM: the indent and the parent above it already say what
   *  it belongs to, and a nested column of glyphs is a texture. */
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

/** An agent, as a nav row. ⚠ `sections` is deliberately NOT read: those three
 *  are tabs, and the Synthetics page draws them. */
const fromAgent = (a: AgentEntry): NavEntry => ({
  key: a.key,
  label: a.label,
  agentIcon: a.icon,
  count: a.count,
  countNoun: a.countNoun,
  badge: a.shipped ? undefined : 'Soon',
});

/**
 * The tree. `agentCount` is the prototype's growth control, which is the whole
 * reason the roster is data: the menu can be looked at with three agents in it
 * and with eleven, without editing a component.
 */
export function navTree(agentCount: number): readonly NavGroup[] {
  return [
    {
      entries: [
        /* ⚠ SEARCH IS KEPT AND IT IS NOT IN GABRIEL'S 09-03 LIST. It became a
           row on 09-02, on Mehdi's own ask, and the list that omits it is
           about the item hierarchy rather than about this control - so
           deleting a three-day-old decision on an omission would be reading
           too much into it. One line to remove if it was meant. */
        { key: 'search', label: 'Search', icon: 'search' },
        /* THE TABS UNDER IT - All sessions, Bookmarked, Segments - are in the
           page. This is one row. */
        { key: 'sessions', label: 'Sessions', icon: 'sessions' },
        { key: 'highlights', label: 'Highlights', icon: 'highlights' },
      ],
    },
    {
      label: 'Agents',
      entries: AGENTS.slice(0, agentCount).map(fromAgent),
    },
    {
      label: 'Product',
      entries: [
        {
          key: 'analytics',
          label: 'Analytics',
          icon: 'analytics',
          /* ⚠ THE ONLY EXPANDING ROW IN THE MENU, and the two under it are
             subitems rather than tabs: each is its own page, and Data
             Management has five tabs of its own that stay on it. */
          items: [
            { key: 'analytics/data', label: 'Data Management' },
            { key: 'analytics/dashboards', label: 'Dashboards' },
          ],
        },
        { key: 'activity', label: 'Activity', icon: 'activity' },
      ],
    },
  ];
}
