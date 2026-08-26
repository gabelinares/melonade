import { useMemo } from 'react';
import {
  Spotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
} from '@mantine/spotlight';
import {
  Accessibility,
  Bug,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  History,
  Languages,
  PlayCircle,
  Route,
  Search,
  Settings2,
  Shield,
  Type,
} from 'lucide-react';
import { AGENTS, type AgentIconName } from '../nav/agents.ts';
import type { IssuesController } from '../state/useIssues.ts';

const ICONS: Record<AgentIconName, typeof Bug> = {
  bug: Bug,
  flask: FlaskConical,
  clipboard: ClipboardCheck,
  accessibility: Accessibility,
  gauge: Gauge,
  route: Route,
  type: Type,
  history: History,
  shield: Shield,
  search: Search,
  languages: Languages,
};

export interface CommandsProps {
  model: IssuesController;
  agentCount: number;
  onNavigate: (key: string) => void;
}

/**
 * The command palette, and it is load-bearing rather than a flourish.
 *
 * This option's menu is an icon rail, which trades name visibility for the fact
 * that it never costs width. The palette is how that debt gets paid: every
 * agent and every issue is reachable and searchable BY NAME, so nothing is
 * hidden, it is just not permanently on screen. Ship the rail without this and
 * the menu is genuinely worse than the labelled list it replaced.
 *
 * It is also the reason the component library question has a real answer.
 * Spotlight, ScrollArea with sticky headers, Menu, Popover, Modal and Drawer
 * all come out of one kit here; on a smaller kit this palette alone is a
 * week of work and a dependency nobody reviews.
 */
export function Commands({ model, agentCount, onNavigate }: CommandsProps) {
  const actions = useMemo<(SpotlightActionData | SpotlightActionGroupData)[]>(() => {
    const agentActions: SpotlightActionData[] = [
      {
        id: 'sessions',
        label: 'Sessions',
        description: 'Search and watch session replays',
        leftSection: <PlayCircle size={16} />,
        onClick: () => onNavigate('sessions'),
      },
      ...AGENTS.slice(0, agentCount).map((a) => {
        const Icon = ICONS[a.icon];
        return {
          id: a.key,
          label: a.label,
          description: a.count > 0 ? `${a.count} open` : 'Nothing open',
          leftSection: <Icon size={16} />,
          onClick: () => onNavigate(a.key),
        };
      }),
      {
        id: 'preferences',
        label: 'Preferences',
        leftSection: <Settings2 size={16} />,
        onClick: () => onNavigate('preferences'),
      },
    ];

    /* Issues are searchable by their own title, which is the thing a person
       actually remembers. Selecting one jumps the queue to it. */
    const issueActions: SpotlightActionData[] = model.filtered.map((i) => ({
      id: `issue-${i.id}`,
      label: model.titleOf(i),
      description: `${i.cat} · ${i.tags.slice(0, 2).join(', ')}`,
      leftSection: <Bug size={16} />,
      onClick: () => {
        onNavigate('issues');
        model.select(i.id);
      },
    }));

    return [
      { group: 'Go to', actions: agentActions },
      { group: 'Issues', actions: issueActions },
    ];
  }, [model, agentCount, onNavigate]);

  return (
    <Spotlight
      actions={actions}
      shortcut={['mod + K', 'mod + P']}
      nothingFound="Nothing matches that."
      highlightQuery
      scrollable
      maxHeight={420}
      searchProps={{
        leftSection: <Search size={17} />,
        placeholder: 'Search agents and issues',
      }}
    />
  );
}
