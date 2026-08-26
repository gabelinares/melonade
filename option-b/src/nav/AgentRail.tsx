import { Tooltip } from '@mantine/core';
import {
  Accessibility,
  Bug,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  History,
  Languages,
  LifeBuoy,
  Monitor,
  Moon,
  PlayCircle,
  Plus,
  Route,
  Search,
  Settings2,
  Shield,
  Sun,
  Type,
} from 'lucide-react';
import { AGENTS, type AgentIconName } from './agents.ts';
import { BrandMark } from './BrandMark.tsx';
import { RailItem } from './RailItem.tsx';
import { useTheme } from '../theme/ThemeProvider.tsx';
import './agent-rail.css';

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

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export interface AgentRailProps {
  active: string;
  onNavigate: (key: string) => void;
  agentCount: number;
  onOpenSearch: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE MENU, option B. Same question as option A answers with a labelled list,
 * answered structurally instead.
 *
 * 1. IT COSTS NO WIDTH, EVER. The rail is 56px at every window size and every
 *    agent count. Option A's labelled nav is 216px and has to collapse to a
 *    rail on a small screen, which means it has two layouts to keep honest.
 *    This has one. Adding the eleventh agent takes 44px of vertical space that
 *    was empty anyway.
 * 2. GROUPS ARE SPACE, NOT HEADERS. There is no room for a "Agents" label, so
 *    the boundary between replay and the agents is a gap plus a hairline. That
 *    is enough: two groups need a separator, not a caption.
 * 3. THE AGENTS BLOCK IS THE ONLY THING THAT SCROLLS. Replay sits above it and
 *    the account below, both pinned, so Preferences cannot be pushed off-screen
 *    by growth. Same principle as option A, different geometry.
 * 4. THE COST IS DISCOVERABILITY, AND IT IS PAID FOR EXPLICITLY. An icon rail
 *    hides names, so this option puts a real command palette behind the search
 *    slot and Cmd K: every agent is reachable and searchable by name even
 *    though no name is on screen. Without that, the rail would be a worse menu
 *    than the one it replaces.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AgentRail({ active, onNavigate, agentCount, onOpenSearch }: AgentRailProps) {
  const { pref, cycle } = useTheme();
  const agents = AGENTS.slice(0, agentCount);
  const ThemeIcon = THEME_ICON[pref];

  return (
    <nav className="b-rail" aria-label="Main">
      {/* The mark, not a project avatar. It used to be a plum-filled square with
          an "M" in it, which put the brand's initial inside the brand's accent
          and read as a generic workspace chip. This is the real Melonade mark
          in the real Melonade colour, and it turns over on hover. */}
      <Tooltip label="Melonade - frontend.acme.com" position="right" offset={10}>
        <button
          type="button"
          className="b-rail__mark"
          aria-label="Melonade, project frontend.acme.com"
          data-mark-host
        >
          {/* 22, not the landing page's 19. There the mark sat next to the
              word "melonade" and borrowed its presence; alone at the top of a
              56px rail it has to carry the identity by itself, and at 19 it
              read as a stray notification dot. */}
          <BrandMark size={22} playOnMount />
        </button>
      </Tooltip>

      <div className="b-rail__group">
        <RailItem
          icon={<PlayCircle size={17} />}
          label="Sessions"
          active={active === 'sessions'}
          onClick={() => onNavigate('sessions')}
        />
      </div>

      <span className="b-rail__rule" aria-hidden="true" />

      {/* the only scrolling region */}
      <div className="b-rail__agents">
        {agents.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <RailItem
              key={a.key}
              icon={<Icon size={17} />}
              label={a.label}
              count={a.count}
              active={active === a.key}
              onClick={() => onNavigate(a.key)}
            />
          );
        })}
        <RailItem icon={<Plus size={16} />} label="Add an agent" ghost />
      </div>

      <div className="b-rail__foot">
        <RailItem icon={<Search size={17} />} label="Search everything (Cmd K)" onClick={onOpenSearch} />
        <RailItem
          icon={<Settings2 size={17} />}
          label="Preferences"
          active={active === 'preferences'}
          onClick={() => onNavigate('preferences')}
        />
        <RailItem
          icon={<LifeBuoy size={17} />}
          label="Support"
          active={active === 'support'}
          onClick={() => onNavigate('support')}
        />
        <RailItem
          icon={<ThemeIcon size={16} />}
          label={`Theme: ${pref}`}
          onClick={cycle}
        />
        <Tooltip label="Gabriel Linares" position="right" offset={10}>
          <button type="button" className="b-rail__avatar" aria-label="Gabriel Linares">
            GL
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
