import { useState } from 'react';
import { Tooltip } from 'antd';
import { Bell, ChevronsUpDown, CircleHelp, House, PlayCircle, Plus, Settings2 } from 'lucide-react';
import { AGENTS } from './agents.ts';
import { AGENT_ICONS } from './icons.ts';
import { BrandMark } from './BrandMark.tsx';
import { NavItem } from './NavItem.tsx';
import { CreditsMeter } from '../components/CreditsMeter.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import './side-nav.css';

export interface SideNavProps {
  /** The current destination. An agent's section is `agent/section`, so the
   *  nav can tell "inside Tests" from "on the Tests list". */
  active: string;
  onNavigate: (key: string) => void;
  /** How many agents to render. The prototype's growth control drives this. */
  agentCount: number;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE MENU, and the piece the brief asks to be judged on: "does it survive more
 * stuff going into it."
 *
 * It is a labelled sidebar again, and it now holds SECTIONS as well as agents -
 * Tests has three - which is the thing the icon rail could not do. A rail can
 * show eleven agents in 56px; it cannot show that one of them contains a list,
 * a log and a set of environments, because a nested icon under an icon is not a
 * hierarchy anybody can read.
 *
 * Four decisions carry the scaling argument:
 *
 * 1. AGENTS ARE PEERS UNDER ONE LABEL. They are a flat list under "Products",
 *    so a new agent costs exactly one row and nothing has to be expanded to
 *    reach it. Only an agent with more than one body expands, and what it
 *    expands into is data (`AgentEntry.sections`), not a special case here.
 * 2. THE SHOULDERS ARE PINNED. Only the products list scrolls. Home and
 *    Sessions sit above it, the tools and the credits below, so neither can be
 *    pushed off-screen by growth - which is exactly what happens to a nav that
 *    is one long scrolling column.
 * 3. THE NAV IS THE QUEUE. Each agent carries its open count, so eleven agents
 *    read as a worklist rather than eleven doors. Length is only a problem when
 *    the rows say nothing.
 * 4. THE FOOT IS A ROW, NOT A LIST. Settings, notifications, help and theme are
 *    four things you touch rarely and never search for, so they are four icons
 *    on one line instead of four labelled rows competing with the agents for
 *    vertical space and attention.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SideNav({ active, onNavigate, agentCount }: SideNavProps) {
  const agents = AGENTS.slice(0, agentCount);
  /* Expansion is remembered per agent and starts open for whatever you are
     inside, so arriving on Runs never shows a collapsed Tests. */
  const [expanded, setExpanded] = useState<string[]>(() =>
    active.includes('/') ? [active.split('/')[0]!] : ['tests'],
  );
  const toggle = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <nav className="m-nav" aria-label="Main">
      {/* ── project. Pinned. ──────────────────────────────────────────────
          A switcher, not a logo lockup: the mark, the project it belongs to,
          and the control that changes it. The mark is the only chromatic thing
          in this column and it sits on the nav itself with no plate behind it. */}
      <div className="m-nav__brand">
        <button type="button" className="m-nav__project" aria-label="Switch project" data-mark-host>
          <BrandMark size={17} playOnMount />
          <span className="m-nav__project-name m-truncate">frontend.acme.com</span>
          <ChevronsUpDown size={13} className="m-nav__project-caret" aria-hidden="true" />
        </button>
        <Tooltip title="New agent" placement="bottom">
          <button type="button" className="m-nav__new" aria-label="New agent">
            <Plus size={15} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <div className="m-nav__group m-nav__group--top">
        <NavItem
          icon={<House size={15} />}
          label="Home"
          active={active === 'home'}
          onClick={() => onNavigate('home')}
        />
        <NavItem
          icon={<PlayCircle size={15} />}
          label="Sessions"
          active={active === 'sessions'}
          onClick={() => onNavigate('sessions')}
        />
      </div>

      {/* ── the scrolling middle ── */}
      <div className="m-nav__scroll">
        <div className="m-nav__group">
          <p className="m-nav__label">Products</p>
          {agents.map((a) => {
            const Icon = AGENT_ICONS[a.icon];
            const open = expanded.includes(a.key);
            const inside = active === a.key || active.startsWith(`${a.key}/`);
            return (
              <div key={a.key} className="m-nav__agent">
                <NavItem
                  icon={<Icon size={15} />}
                  label={a.label}
                  count={a.count}
                  badge={a.shipped ? undefined : 'Soon'}
                  active={a.sections ? inside && !open : inside}
                  expandable={a.sections != null}
                  expanded={open}
                  onToggle={() => toggle(a.key)}
                  onClick={() => {
                    onNavigate(a.key);
                    if (a.sections && !open) toggle(a.key);
                  }}
                />
                {/* The sections. Present only while open, so the list has one
                    length at rest and the products below never shift under a
                    cursor that was aiming at them. */}
                {a.sections && open && (
                  <div className="m-nav__sections">
                    {a.sections.map((s) => (
                      <NavItem
                        key={s.key}
                        nested
                        label={s.label}
                        active={active === s.key}
                        onClick={() => onNavigate(s.key)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* The growth affordance lives INSIDE the group it grows, so the
              answer to "where does the next agent go" is visible. */}
          <button type="button" className="m-nav__add" aria-label="Add an agent">
            <Plus size={15} aria-hidden="true" />
            <span>Add agent</span>
          </button>
        </div>
      </div>

      {/* ── the foot. Pinned, so it never scrolls away. ── */}
      <div className="m-nav__foot">
        <div className="m-nav__tools">
          <Tooltip title="Preferences" placement="top">
            <button
              type="button"
              className={`m-nav__tool${active === 'preferences' ? ' is-active' : ''}`}
              aria-label="Preferences"
              onClick={() => onNavigate('preferences')}
            >
              <Settings2 size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title="Notifications" placement="top">
            <button
              type="button"
              className={`m-nav__tool${active === 'notifications' ? ' is-active' : ''}`}
              aria-label="Notifications, 3 unread"
              onClick={() => onNavigate('notifications')}
            >
              <Bell size={15} aria-hidden="true" />
              {/* Presence, not a number: the count lives where the work is. */}
              <span className="m-nav__unread" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title="Support" placement="top">
            <button
              type="button"
              className={`m-nav__tool${active === 'support' ? ' is-active' : ''}`}
              aria-label="Support"
              onClick={() => onNavigate('support')}
            >
              <CircleHelp size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <ThemeToggle />
          <Tooltip title="Gabriel Linares" placement="top">
            <button type="button" className="m-nav__avatar" aria-label="Gabriel Linares">
              GL
            </button>
          </Tooltip>
        </div>

        <CreditsMeter used={12_400} included={50_000} resetsOn="1 September" />
      </div>
    </nav>
  );
}
