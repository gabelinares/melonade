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

export interface AgentEntry {
  key: string;
  label: string;
  /** lucide icon name, resolved in the nav so this file stays render-free */
  icon: AgentIconName;
  /** open items waiting on you. Drives the nav count. */
  count: number;
  shipped: boolean;
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
  { key: 'tests', label: 'Tests', icon: 'flask', count: 4, shipped: true },
  { key: 'audits', label: 'Audits', icon: 'clipboard', count: 2, shipped: true },
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
