/* ══════════════════════════════════════════════════════════════════════════
   The agent roster.

   The stated design problem for this whole exercise is "how will the menu look
   and does it survive more stuff going into it". So the roster is DATA, and
   both the nav and the prototype's agent-count control read from it. You can
   see the menu at 3 agents and at 11 without editing a component.

   ⚠ THE ROSTER NO LONGER CARRIES SECTIONS. Synthetics had three - Tests, Runs,
   Environments - and the nav drew them as nested rows. They are TABS, they live
   on the page, and as of 2026-09-03 they appear only there: "the tabs don't
   show in the sidemenu, only subitems." The keys they navigated to are
   unchanged and `TestsPage`'s own strip still writes them, so nothing was lost
   except a second copy of the same three rows.

   The first three ship today. The rest are plausible next agents for a
   session-replay product, listed in the order they would most likely arrive:
   they exist here to prove the nav holds, not as a roadmap.
   ══════════════════════════════════════════════════════════════════════════ */

import { AUDITS } from '@shared/audits-data.ts';
import { TESTS } from '@shared/tests-data.ts';
import { attentionCount } from '@shared/tests-logic.ts';

export interface AgentEntry {
  key: string;
  label: string;
  /** lucide icon name, resolved in the nav so this file stays render-free */
  icon: AgentIconName;
  /** open items waiting on you. Drives the nav count. */
  count: number;
  shipped: boolean;
  /** What the count counts, for the tooltip the narrow menu shows: "11 open",
   *  "7 waiting", "1 running". Three agents, three different meanings of a
   *  number - and a rail that has room for the dot but not the figure has to be
   *  able to say which one it is on hover. */
  countNoun?: string;
}

export type AgentIconName =
  | 'bug'
  | 'flask'
  | 'clipboard'
  | 'accessibility'
  | 'gauge'
  | 'route'
  | 'type'
  | 'history'
  | 'shield'
  | 'search'
  | 'languages';

export const AGENTS: readonly AgentEntry[] = [
  { key: 'issues', label: 'Issues', icon: 'bug', count: 11, shipped: true, countNoun: 'open' },
  /* The two shipped agents that have a page count their own work rather than
     carrying a number somebody typed: a badge that disagrees with the page it
     opens is worse than no badge. Tests counts what is waiting on a person -
     drafts, revisions, merges - and Audits counts the jobs still reading. */
  {
    key: 'tests',
    label: 'Synthetics',
    icon: 'flask',
    count: attentionCount(TESTS),
    shipped: true,
    countNoun: 'waiting on you',
  },
  {
    key: 'audits',
    label: 'Audits',
    icon: 'clipboard',
    count: AUDITS.filter((a) => a.status === 'running').length,
    shipped: true,
    countNoun: 'still reading',
  },
  { key: 'accessibility', label: 'Accessibility', icon: 'accessibility', count: 7, shipped: false },
  { key: 'performance', label: 'Performance', icon: 'gauge', count: 3, shipped: false },
  { key: 'journeys', label: 'Journeys', icon: 'route', count: 0, shipped: false },
  { key: 'content', label: 'Content', icon: 'type', count: 5, shipped: false },
  { key: 'regressions', label: 'Regressions', icon: 'history', count: 1, shipped: false },
  { key: 'security', label: 'Security', icon: 'shield', count: 0, shipped: false },
  { key: 'seo', label: 'SEO', icon: 'search', count: 2, shipped: false },
  { key: 'localization', label: 'Localization', icon: 'languages', count: 4, shipped: false },
];

export const SHIPPED_AGENT_COUNT = AGENTS.filter((a) => a.shipped).length;
