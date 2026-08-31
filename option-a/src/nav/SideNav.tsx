import { useState } from 'react';
import { Tooltip } from 'antd';
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Search,
  Settings2,
} from 'lucide-react';
import { AGENTS } from './agents.ts';
import { AGENT_ICONS } from './icons.ts';
import { BrandMark } from './BrandMark.tsx';
import { NavItem } from './NavItem.tsx';
import { NavFlyout } from './NavFlyout.tsx';
import { COLLAPSE_KEY } from './useNavCollapse.ts';
import { CreditsMeter } from '../components/CreditsMeter.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import './side-nav.css';

const PROJECT = 'frontend.acme.com';

export interface SideNavProps {
  /** The current destination. An agent's section is `agent/section`, so the
   *  nav can tell "inside Tests" from "on the Tests list". */
  active: string;
  onNavigate: (key: string) => void;
  /** How many agents to render. The prototype's growth control drives this. */
  agentCount: number;
  /** Narrow. See useNavCollapse for who decides. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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
 * 2. THE SHOULDERS ARE PINNED. Only the products list scrolls. Sessions sits
 *    above it, the tools and the credits below, so neither can be pushed
 *    off-screen by growth - which is exactly what happens to a nav that is one
 *    long scrolling column.
 * 3. THE NAV IS THE QUEUE. Each agent carries its open count, so eleven agents
 *    read as a worklist rather than eleven doors. Length is only a problem when
 *    the rows say nothing.
 * 4. THE FOOT IS A ROW, NOT A LIST. Settings, notifications, help and theme are
 *    four things you touch rarely and never search for, so they are four icons
 *    on one line instead of four labelled rows competing with the agents for
 *    vertical space and attention.
 *
 * ── AND SINCE 2026-08-31 IT HAS A NARROW STATE ──────────────────────────────
 * ONE RULE, and every consequence below follows from it: THE COLLAPSE TAKES THE
 * WORDS AND LEAVES THE NUMBERS. Decision 3 above is the menu's whole claim -
 * this is a queue, not a set of doors - and a collapse that drops the counts
 * drops the claim with them. So the narrow menu is not a 56px icon rail; it is
 * TWO COLUMNS at 76px, a glyph and a figure, which is the row with its label
 * removed rather than a different component. The label comes back on hover, in
 * a flyout that is that same row at full size (NavFlyout).
 *
 * The second rule is mechanical and it is what keeps this from being a second
 * nav to maintain: NOTHING BELOW THE MENU KNOWS. NavItem, CreditsMeter,
 * ProgressBar and ThemeToggle are untouched - one class on the <nav> and the
 * geometry in side-nav.css does all of it. There is no collapsed variant of a
 * row to keep in agreement with the open one.
 *
 * The third is that the layout FOLDS rather than switching: the brand pair and
 * the tool bar are a wrap and a grid whose track count falls out of the width
 * the browser is already animating, so there is no second arrangement snapping
 * into place halfway through a 180ms transition.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SideNav({ active, onNavigate, agentCount, collapsed = false, onToggleCollapsed }: SideNavProps) {
  const agents = AGENTS.slice(0, agentCount);
  /* Expansion is remembered per agent and starts open for whatever you are
     inside, so arriving on Runs never shows a collapsed Tests. */
  const [expanded, setExpanded] = useState<string[]>(() =>
    active.includes('/') ? [active.split('/')[0]!] : ['tests'],
  );
  const toggle = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <nav className={`m-nav${collapsed ? ' is-collapsed' : ''}`} aria-label="Main">
      {/* ── project. Pinned. ──────────────────────────────────────────────
          A switcher, not a logo lockup: the mark, the project it belongs to,
          and the control that changes it. The mark is the only chromatic thing
          in this column and it sits on the nav itself with no plate behind it.

          The pair WRAPS rather than rearranging: as the menu narrows, search
          drops under the switcher on its own, because the switcher has a
          minimum width and flex-wrap does the rest. */}
      <div className="m-nav__brand">
        <NavFlyout enabled={collapsed} label={PROJECT}>
          <button type="button" className="m-nav__project" aria-label={`Switch project: ${PROJECT}`} data-mark-host>
            {/* The mark grows into the glyph column the way every other icon
                does, so its centre lands on the same x rather than 0.5px off
                it. A logo that is nearly in the column is worse than one that
                is obviously not. */}
            <span className="m-nav__mark" aria-hidden="true">
              <BrandMark size={17} playOnMount />
            </span>
            <span className="m-nav__project-name m-truncate">{PROJECT}</span>
            <ChevronsUpDown size={13} className="m-nav__project-caret" aria-hidden="true" />
          </button>
        </NavFlyout>
        {/* SEARCH, not "new". The `+` was a create-your-own-agent affordance that
            sat against the product's own argument - people want it working by
            itself - and the thing you actually reach for from anywhere is
            finding something. The search itself is the next piece. */}
        <Tooltip title="Search" placement="right">
          <button type="button" className="m-nav__new" aria-label="Search" onClick={() => onNavigate('search')}>
            <Search size={15} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      {/* HOME IS GONE (Mehdi, 08-28). It was going to carry the weekly review and
          the digest, and both of those are backend work - "otherwise it would be
          a project that would be too long to implement". Sessions stays, and it
          is the one destination above the agents because every agent's evidence
          is a session. */}
      <div className="m-nav__group m-nav__group--top">
        <NavFlyout enabled={collapsed} label="Sessions">
          <div className="m-nav__row">
            <NavItem
              icon={<PlayCircle size={15} />}
              label="Sessions"
              active={active === 'sessions'}
              onClick={() => onNavigate('sessions')}
            />
          </div>
        </NavFlyout>
      </div>

      {/* ── the scrolling middle ── */}
      <div className="m-nav__scroll">
        <div className="m-nav__group">
          {/* AGENTS, not "Products" (Gabriel, 2026-08-31). They were called
              products while the question was how the company sells them; the
              menu's question is what is working for you, and every row here is
              an agent doing something. Narrow, this becomes a hairline the
              width of the glyph column - a group label's job is to say where a
              group starts, and a rule says that in 28px; six letters do not. */}
          <p className="m-nav__label">Agents</p>
          {agents.map((a) => {
            const Icon = AGENT_ICONS[a.icon];
            const open = expanded.includes(a.key);
            const inside = active === a.key || active.startsWith(`${a.key}/`);
            return (
              <NavFlyout
                key={a.key}
                enabled={collapsed}
                label={a.label}
                count={a.count}
                countNoun={a.countNoun}
                badge={a.shipped ? undefined : 'Soon'}
                sections={a.sections}
                active={active}
                onNavigate={onNavigate}
              >
                <div className="m-nav__row">
                  <NavItem
                    icon={<Icon size={15} />}
                    label={a.label}
                    count={a.count}
                    badge={a.shipped ? undefined : 'Soon'}
                    active={a.sections ? inside && !open : inside}
                    /* Narrow, there is nothing to expand INTO - the sections
                       live in the flyout - so the caret is not merely hidden,
                       it is not a control. */
                    expandable={a.sections != null && !collapsed}
                    expanded={open}
                    onToggle={() => toggle(a.key)}
                    onClick={() => {
                      onNavigate(a.key);
                      if (a.sections && !open && !collapsed) toggle(a.key);
                    }}
                  />
                  {/* The sections. Present only while open, so the list has one
                      length at rest and the products below never shift under a
                      cursor that was aiming at them. */}
                  {a.sections && open && !collapsed && (
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
              </NavFlyout>
            );
          })}
          {/* ⚠ "ADD AGENT" IS OUT, 2026-08-31 - hidden, not redesigned. The row
              was answering "where does the next agent go", which is a question
              about a roster you can extend; the eleven below are ours, and
              nothing in this build creates one. It comes back the day there is
              something for it to open. The `.m-nav__add` styles stay - they are
              two lines on top of `.m-nav-item` - so it comes back as a row and
              not as a shape of its own. */}
        </div>
      </div>

      {/* ── the foot. Pinned, so it never scrolls away. ──────────────────────
          A grid of 28px tracks rather than a row, so the number of tracks falls
          out of the width the menu is already animating: five across when it is
          open, one when it is narrow, and every count in between on the way. A
          row that flipped to a column would snap to a column while the menu was
          still 256px wide. */}
      <div className="m-nav__foot">
        <div className="m-nav__tools">
          <Tooltip title="Preferences" placement="right">
            <button
              type="button"
              className={`m-nav__tool${active === 'preferences' ? ' is-active' : ''}`}
              aria-label="Preferences"
              onClick={() => onNavigate('preferences')}
            >
              <Settings2 size={15} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip title="Notifications" placement="right">
            <button
              type="button"
              className={`m-nav__tool${active === 'notifications' ? ' is-active' : ''}`}
              aria-label="Notifications, 3 unread"
              onClick={() => onNavigate('notifications')}
            >
              <Bell size={15} aria-hidden="true" />
              {/* Presence, not a number: the count lives where the work is.
                  The SAME mark an agent wears when something has arrived, in
                  the same colour - one dot means one thing everywhere, and it
                  is not red, because nothing here is wrong. */}
              <span className="m-dot" />
            </button>
          </Tooltip>
          <Tooltip title="Support" placement="right">
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
          {/* The collapse sits with the other preferences about the chrome
              rather than floating on the menu's edge: it is in the same place
              in both states, it costs nothing on hover, and it is the one
              control here whose glyph draws the thing it does. */}
          <Tooltip title={`${collapsed ? 'Expand' : 'Collapse'} menu  ${COLLAPSE_KEY}`} placement="right">
            <button
              type="button"
              className="m-nav__tool"
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} menu`}
              aria-expanded={!collapsed}
              onClick={onToggleCollapsed}
            >
              {collapsed ? <PanelLeftOpen size={15} aria-hidden="true" /> : <PanelLeftClose size={15} aria-hidden="true" />}
            </button>
          </Tooltip>
          <Tooltip title="Gabriel Linares" placement="right">
            <button type="button" className="m-nav__avatar" aria-label="Gabriel Linares">
              GL
            </button>
          </Tooltip>
        </div>

        {/* Narrow, this loses its box and its figures and becomes the bar
            alone, in the glyph column. A measure reduced to its measure still
            answers the only question it was ever asked from across the room. */}
        <CreditsMeter used={12_400} included={50_000} resetsOn="1 September" />
      </div>
    </nav>
  );
}
