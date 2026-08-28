/* ══════════════════════════════════════════════════════════════════════════
   The agent roster.

   The stated design problem for this whole exercise is "how will the menu look
   and does it survive more stuff going into it". So the roster is DATA, and
   both the nav and the prototype's agent-count control read from it. You can
   see the menu at 3 agents and at 11 without editing a component.

   The first three ship today. The rest are plausible next agents for a
   session-replay product, listed in the order they would most likely arrive:
   they exist here to prove the nav holds, not as a roadmap.
   ══════════════════════════════════════════════════════════════════════════ */

import { AUDITS } from '@shared/audits-data.ts';
import { TESTS } from '@shared/tests-data.ts';
import { attentionCount } from '@shared/tests-logic.ts';

export interface AgentSection {
  /** The nav key, which is also the route: `tests/runs`. */
  key: string;
  label: string;
}

export interface AgentEntry {
  key: string;
  label: string;
  /** lucide icon name, resolved in the nav so this file stays render-free */
  icon: AgentIconName;
  /** open items waiting on you. Drives the nav count. */
  count: number;
  shipped: boolean;
  /** An agent with more than one body under its name. The nav expands to show
   *  them; an agent without sections is a single destination.
   *
   *  This is DATA rather than a special case in the nav, because the question
   *  the menu has to survive is not "what does Tests do" but "what happens when
   *  the fourth agent grows a second screen". */
  sections?: AgentSection[];
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
  { key: 'issues', label: 'Issues', icon: 'bug', count: 11, shipped: true },
  /* The two shipped agents that have a page count their own work rather than
     carrying a number somebody typed: a badge that disagrees with the page it
     opens is worse than no badge. Tests counts what is waiting on a person -
     drafts, revisions, merges - and Audits counts the jobs still reading. */
  {
    key: 'tests',
    label: 'Tests',
    icon: 'flask',
    count: attentionCount(TESTS),
    shipped: true,
    /* The first section is called List, not Tests: a child repeating its parent
       reads as a mistake, and the parent is already the subject. */
    sections: [
      { key: 'tests', label: 'List' },
      { key: 'tests/runs', label: 'Runs' },
      { key: 'tests/environments', label: 'Environments' },
    ],
  },
  { key: 'audits', label: 'Audits', icon: 'clipboard', count: AUDITS.filter((a) => a.status === 'running').length, shipped: true },
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
