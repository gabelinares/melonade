import { Tooltip } from 'antd';
import {
  Accessibility,
  Bug,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  History,
  Languages,
  LifeBuoy,
  PlayCircle,
  Plus,
  Route,
  Settings2,
  Shield,
  Search,
  Type,
} from 'lucide-react';
import { AGENTS, type AgentIconName } from './agents.ts';
import { BrandMark } from './BrandMark.tsx';
import { RailItem } from './RailItem.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
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

export interface AgentRailProps {
  active: string;
  onNavigate: (key: string) => void;
  agentCount: number;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE MENU: an icon rail, and the one piece the brief asks to be judged on -
 * "does it survive more stuff going into it."
 *
 * It replaces a 13.5rem labelled nav that answered the same question with a
 * list, a section header per group, and a collapse toggle. Four things carry
 * the swap:
 *
 * 1. IT COSTS NO WIDTH, EVER. The rail is 56px at every window size and every
 *    agent count, so there is ONE layout to keep honest instead of an expanded
 *    one and a collapsed one that drift apart. Adding the eleventh agent takes
 *    44px of vertical space that was empty anyway, and the pane beside it never
 *    gives anything back.
 * 2. GROUPS ARE SPACE, NOT HEADERS. There is no room for an "Agents" caption,
 *    so the boundary between replay and the agents is a gap plus a hairline.
 *    Two groups need a separator, not a label.
 * 3. THE AGENTS BLOCK IS THE ONLY THING THAT SCROLLS. Sessions sits above it
 *    and the account below, both pinned, so Preferences cannot be pushed
 *    off-screen by growth. That was true of the labelled nav too and it is the
 *    one rule worth carrying over unchanged.
 * 4. THE COST IS DISCOVERABILITY. An icon rail hides names, and it is paid for
 *    here by a tooltip and an accessible name on every slot, plus the count
 *    badge that keeps the rail a worklist rather than eleven anonymous doors.
 *    ⚠ In the option this came from, the search slot opened a command palette,
 *    which is what really paid the bill. Graphite has no palette, so the slot
 *    is not here: an icon that opens nothing is worse than an icon that is
 *    absent. If the palette gets ported, the slot goes back above the foot.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AgentRail({ active, onNavigate, agentCount }: AgentRailProps) {
  const agents = AGENTS.slice(0, agentCount);

  return (
    <nav className="m-rail" aria-label="Main">
      {/* The mark, not a project avatar, and no plate behind it: it is the only
          chromatic thing in this shell, and a coloured tile behind a coloured
          logo is two accents stacked. The project it belongs to is in the
          tooltip, since the rail has no room to print it. */}
      <Tooltip title="frontend.acme.com" placement="right">
        <button
          type="button"
          className="m-rail__mark"
          aria-label="Project frontend.acme.com"
          data-mark-host
        >
          {/* 22, not the 17 the labelled nav used. There the mark sat beside the
              project name and borrowed its presence; alone at the top of a 56px
              rail it has to carry the identity by itself. */}
          <BrandMark size={22} playOnMount />
        </button>
      </Tooltip>

      <div className="m-rail__group">
        <RailItem
          icon={<PlayCircle size={17} />}
          label="Sessions"
          active={active === 'sessions'}
          onClick={() => onNavigate('sessions')}
        />
      </div>

      <span className="m-rail__rule" aria-hidden="true" />

      {/* the only scrolling region */}
      <div className="m-rail__agents">
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
        {/* The growth affordance lives INSIDE the group it grows, so the answer
            to "where does the next agent go" is visible. */}
        <RailItem icon={<Plus size={16} />} label="Add an agent" ghost />
      </div>

      <div className="m-rail__foot">
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
        {/* Graphite's own toggle, not a second copy of the same three-state
            cycle. Two components that each decide what "system" looks like is
            how the icon ends up disagreeing with itself across pages. */}
        <ThemeToggle />
        <Tooltip title="Gabriel Linares" placement="right">
          <button type="button" className="m-rail__avatar" aria-label="Gabriel Linares">
            GL
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
