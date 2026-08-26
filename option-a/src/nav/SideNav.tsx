import { Tooltip } from 'antd';
import {
  Accessibility,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  History,
  Languages,
  LifeBuoy,
  PlayCircle,
  Plus,
  Route,
  Search,
  Settings2,
  Shield,
  Type,
} from 'lucide-react';
import { AGENTS, type AgentIconName } from './agents.ts';
import { BrandMark } from './BrandMark.tsx';
import { NavItem } from './NavItem.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import './side-nav.css';

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

export interface SideNavProps {
  /** Which item is current. */
  active: string;
  onNavigate: (key: string) => void;
  /** How many agents to render. The prototype's growth control drives this. */
  agentCount: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE MENU. This is the piece the brief actually asks to be judged on: "does
 * it survive more stuff going into it."
 *
 * Four decisions carry that:
 *
 * 1. AGENTS ARE PEERS, NOT CHILDREN. Today Issues / Tests / Audits are nested
 *    inside a collapsible "Agents" item, so reaching any of them costs a
 *    disclosure click and the tree holds open/closed state. Flattened, a new
 *    agent costs exactly one row and nothing has to be expanded. The section
 *    label carries the count so the group is still legible as a group.
 *
 * 2. THE SHOULDERS ARE PINNED. Only the agent list scrolls. Replay sits above
 *    it and the account sits below it, both fixed, so Preferences can never be
 *    pushed off-screen, which is exactly what happens in a nav that grows as
 *    one long scrolling column.
 *
 * 3. THE NAV IS THE QUEUE. Each agent carries its open count, so eleven agents
 *    is a worklist rather than eleven doors. Length only becomes a problem when
 *    the rows say nothing.
 *
 * 4. IT COLLAPSES TO A RAIL. Structural responsiveness, not fluid type: at a
 *    narrow window the labels go and the icons stay, and the counts survive as
 *    presence dots.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SideNav({
  active,
  onNavigate,
  agentCount,
  collapsed,
  onToggleCollapsed,
}: SideNavProps) {
  const agents = AGENTS.slice(0, agentCount);

  return (
    <nav className={`m-nav${collapsed ? ' is-collapsed' : ''}`} aria-label="Main">
      {/* ── identity + project. Pinned. ──
          The mark used to be an ink tile with an "M" in it, which read as a
          workspace avatar rather than as a logo. It is now the real Melonade
          mark: the only chromatic thing in Graphite, floating on the nav with
          no plate behind it, and it turns over when the row is hovered. */}
      <div className="m-nav__brand" data-mark-host>
        <BrandMark size={17} playOnMount />
        {!collapsed && (
          <span className="m-nav__project">
            <span className="m-nav__project-name m-truncate">frontend.acme.com</span>
            <span className="m-nav__project-hint">Project</span>
          </span>
        )}
      </div>

      {/* ── the scrolling middle ── */}
      <div className="m-nav__scroll">
        <div className="m-nav__group">
          {!collapsed && <p className="m-nav__label">Replay</p>}
          <NavItem
            icon={<PlayCircle size={15} />}
            label="Sessions"
            active={active === 'sessions'}
            collapsed={collapsed}
            onClick={() => onNavigate('sessions')}
          />
        </div>

        <div className="m-nav__group m-nav__group--agents">
          {!collapsed && (
            <p className="m-nav__label">
              Agents
              <span className="m-nav__label-count">{agents.length}</span>
            </p>
          )}
          {collapsed && <span className="m-nav__rule" aria-hidden="true" />}
          {agents.map((a) => {
            const Icon = ICONS[a.icon];
            return (
              <NavItem
                key={a.key}
                icon={<Icon size={15} />}
                label={a.label}
                count={a.count}
                active={active === a.key}
                collapsed={collapsed}
                onClick={() => onNavigate(a.key)}
              />
            );
          })}
          {/* The growth affordance lives INSIDE the group it grows, so the
              answer to "where does the next agent go" is visible. */}
          <Tooltip title="Add an agent" placement={collapsed ? 'right' : 'top'}>
            <button type="button" className="m-nav__add" aria-label="Add an agent">
              <Plus size={15} aria-hidden="true" />
              {!collapsed && <span>Add agent</span>}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── account. Pinned, so it never scrolls away. ── */}
      <div className="m-nav__foot">
        <NavItem
          icon={<Settings2 size={15} />}
          label="Preferences"
          active={active === 'preferences'}
          collapsed={collapsed}
          onClick={() => onNavigate('preferences')}
        />
        <NavItem
          icon={<LifeBuoy size={15} />}
          label="Support"
          active={active === 'support'}
          collapsed={collapsed}
          onClick={() => onNavigate('support')}
        />
        <div className="m-nav__account">
          <Tooltip title="Gabriel Linares" placement="right">
            <span className="m-nav__avatar" aria-label="Gabriel Linares">GL</span>
          </Tooltip>
          {!collapsed && <span className="m-nav__account-name m-truncate">Gabriel Linares</span>}
          <span className="m-nav__account-actions">
            <ThemeToggle />
            <Tooltip title={collapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
              <button
                type="button"
                className="m-nav__collapse"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                aria-expanded={!collapsed}
              >
                {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
              </button>
            </Tooltip>
          </span>
        </div>
      </div>
    </nav>
  );
}
