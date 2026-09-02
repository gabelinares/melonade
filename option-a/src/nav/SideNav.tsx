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

/* The account the menu is signed in to. Two lines, because they are two
   different facts: the ORGANISATION is who is paying and it almost never
   changes, the PROJECT is which of its sites you are looking at and it changes
   all day. One line saying `frontend.acme.com` made you infer the first from
   the second. */
const ORG = 'Acme, Inc.';
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
 * 1. AGENTS ARE PEERS UNDER ONE RULE. They are a flat list below one separator,
 *    so a new agent costs exactly one row and nothing has to be expanded to
 *    reach it. Only an agent with more than one body expands, and what it
 *    expands into is data (`AgentEntry.sections`), not a special case here.
 * 2. THE SHOULDERS ARE PINNED. Only the agents list scrolls. The logo, the
 *    account, Search and Sessions sit above it, the tools and the credits
 *    below, so none of them can be pushed off-screen by growth - which is
 *    exactly what happens to a nav that is one long scrolling column.
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
 * The third is that the layout FOLDS rather than switching: every object here
 * is a reduction of itself at the narrower width - the logo keeps its mark, the
 * account keeps its badge, the separator keeps its rule, and the tool bar is a
 * grid whose track count falls out of the width the browser is already
 * animating. There is no second arrangement snapping into place halfway
 * through a 180ms transition.
 *
 * ── AND THE TOP OF IT WAS REDRAWN 2026-09-02 (Mehdi) ────────────────────────
 * Five things, and each one is noted where it happens: the logo and the name
 * are their own row and not a stand-in inside the switcher; the switcher is a
 * two-line control with an edge; Search is a row rather than the one filled
 * button in the column; "AGENTS" is a rule rather than a word; and the gaps
 * between those three objects and the rows are opened up. The type ramp came
 * out of it at three sizes - 16 medium for the name, 13 medium for the account
 * and the row you are on, 13 regular for the rest - so hierarchy is carried by
 * weight and colour rather than by a fourth and fifth size.
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
      {/* ── the logo. Pinned, and it is NOT a control. ─────────────────────
          The mark and the name, and nothing else on the row. Until 09-02 the
          mark stood in for the logo INSIDE the switcher, which made the one
          permanent thing in the column look like part of a control you change
          all day - and left the product unnamed on its own first screen.

          It sits in the glyph column like every other icon here: same 15px
          glyph, same 8px inset, so the mark, Search's glyph and every agent's
          share one centre in both widths. A logo that is nearly in the column
          is worse than one that is obviously not. */}
      <div className="m-nav__brand" data-mark-host>
        <BrandMark size={15} playOnMount className="m-nav__mark" />
        <span className="m-nav__brand-name">melonade</span>
      </div>

      {/* ── the account. Pinned. ───────────────────────────────────────────
          TWO LINES AND A BADGE, because it answers two questions: whose
          workspace this is and which of its projects you are in. It was one
          line - `frontend.acme.com`, mark on the left, chevron on the right -
          and you had to infer the organisation from the domain.

          It is the only thing in this column drawn as a CONTROL: a hairline at
          rest, the row's own fill on hover. The rows below it go somewhere; this
          changes what all of them are about, so it should not look like one of
          them. Narrow, it loses its box and keeps the badge, the way the credits
          meter loses its box and keeps the measure. */}
      <NavFlyout enabled={collapsed} label={`${ORG} · ${PROJECT}`}>
        <button
          type="button"
          className="m-nav__account"
          aria-label={`Switch project: ${PROJECT}, ${ORG}`}
        >
          {/* A SQUARE, and the person at the foot of the menu is a circle. Two
              initials in one column mean two different kinds of thing, so the
              shape has to say which - an organisation is not somebody. */}
          <span className="m-nav__account-badge" aria-hidden="true">
            {ORG[0]}
          </span>
          <span className="m-nav__account-text">
            <span className="m-nav__account-name m-truncate">{PROJECT}</span>
            <span className="m-nav__account-org m-truncate">{ORG}</span>
          </span>
          <ChevronsUpDown size={13} className="m-nav__account-caret" aria-hidden="true" />
        </button>
      </NavFlyout>

      {/* HOME IS GONE (Mehdi, 08-28). It was going to carry the weekly review and
          the digest, and both of those are backend work - "otherwise it would be
          a project that would be too long to implement". Sessions stays, and it
          is the one destination above the agents because every agent's evidence
          is a session.

          SEARCH IS A ROW HERE, not a filled button beside the switcher
          (2026-09-02). It was the one accent-filled control in the whole column,
          which said "this is the thing to do next" about a thing you reach for
          when you already know what you are looking for. It is a destination
          like Sessions, so it is drawn like Sessions - and being a NavItem it
          collapses, flies out and highlights with the same code as the rest,
          instead of being a shape of its own that has to be maintained. */}
      <div className="m-nav__group m-nav__group--top">
        <NavFlyout enabled={collapsed} label="Search">
          <div className="m-nav__row">
            <NavItem
              icon={<Search size={15} />}
              label="Search"
              active={active === 'search'}
              onClick={() => onNavigate('search')}
            />
          </div>
        </NavFlyout>
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

      {/* ── WHERE THE AGENTS START ─────────────────────────────────────────
          A RULE, NOT A WORD (Mehdi, 2026-09-02). "AGENTS" was the only piece of
          uppercase type in the column, and it was labelling the obvious: eleven
          rows carrying agent glyphs and open counts do not need to be told what
          they are. What the group actually needs is a START, and a start is a
          line. One pixel of ink instead of six letters, and the air around it
          reads as room rather than as a heading nobody reads.

          It is also the same object in both widths now - it only changes length
          - where the label had to become a rule when the menu narrowed. And it
          sits ABOVE the scroller rather than inside it, so it stays put and the
          list scrolls under it. */}
      <hr className="m-nav__sep" />

      {/* ── the scrolling middle ── */}
      <div className="m-nav__scroll">
        {/* The rule says where the group starts to anyone LOOKING at it; the
            name still has to exist for anyone who is not. */}
        <div className="m-nav__group" role="group" aria-label="Agents">
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
