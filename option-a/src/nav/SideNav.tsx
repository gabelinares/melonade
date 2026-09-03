import { useState } from 'react';
import { Tooltip } from 'antd';
import {
  Bell,
  ChevronsUpDown,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from 'lucide-react';
import { navTree } from './tree.ts';
import { DEFAULT_PROJECT, ORG, projectName } from './account.ts';
import { AccountMenu } from './AccountMenu.tsx';
import { AGENT_ICONS, PAGE_ICONS } from './icons.ts';
import { OpenReplayMark } from './OpenReplayMark.tsx';
import { NavItem } from './NavItem.tsx';
import { NavFlyout } from './NavFlyout.tsx';
import { COLLAPSE_KEY } from './useNavCollapse.ts';
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
  /** Sessions nobody has watched. Drives Recordings' badge and its Sessions
   *  row - the model owns it, because watching one has to take it off. */
  newSessions?: number;
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
 * 1. THREE NAMED GROUPS, AND ONLY TWO LEVELS (Gabriel, 2026-09-03, drawing out
 *    Mehdi's 09-02 ask). ⚠ **TABS ARE NOT IN THE MENU. ONLY SUBITEMS ARE** -
 *    see `tree.ts`, which is where the whole shape now lives as data. So
 *    Synthetics is one row and its Tests / Runs / Environments strip stays on
 *    its page, and the only expanding row in the column is Analytics, which
 *    holds two real subitems. A new agent still costs exactly one row.
 * 2. THE SHOULDERS ARE PINNED. Only the groups scroll. The logo and the
 *    account sit above them, the tools and the credits below, so none of those
 *    can be pushed off-screen by growth - which is exactly what happens to a
 *    nav that is one long scrolling column. ⚠ Since 09-03 the FIRST group
 *    scrolls too, because there are three groups now and pinning one of them
 *    would put a rule in the middle of a scroller with nothing above it.
 * 3. THE NAV IS THE QUEUE. Each agent carries its open count, so eleven agents
 *    read as a worklist rather than eleven doors. Length is only a problem when
 *    the rows say nothing.
 * 4. THE FOOT IS A ROW, NOT A LIST. Preferences, notifications, support, theme
 *    and the person are things you touch rarely and never search for, so they
 *    are icons on one line instead of labelled rows competing with the agents
 *    for vertical space and attention.
 *
 * ── AND THE COLLAPSE MOVED TO THE TOP RIGHT (Gabriel, 2026-09-03) ───────────
 * It was the fifth glyph in the foot, on the argument that it belongs with the
 * other preferences about the chrome. What that missed is that it is not a
 * preference about the chrome, it IS the chrome: every other control down there
 * opens something, and this one reshapes the thing they all sit in. It is on
 * the brand row now, opposite the mark - the top right corner of the menu,
 * which is where every application that has one puts it.
 *
 * ⚠ Narrow, the brand row BECOMES the control. There is no room for a mark and
 * a button in 52px, and a collapsed menu whose only way out is a keyboard
 * shortcut is a trap - so the row keeps the mark, carries the tooltip, and
 * shows the expand glyph over it on hover. Same place in both states, which
 * was the one good property of having it in the foot.
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
export function SideNav({ active, onNavigate, agentCount, newSessions = 0, collapsed = false, onToggleCollapsed }: SideNavProps) {
  const groups = navTree(agentCount, newSessions);
  /* Expansion is remembered per row and starts open for whatever you are
     inside, so arriving on Data Management never shows a collapsed Analytics. */
  const [expanded, setExpanded] = useState<string[]>(() =>
    active.includes('/') ? [active.split('/')[0]!] : [],
  );
  const toggle = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  /* WHICH PROJECT, and it lives here rather than at the shell because nothing
     outside this column reads it yet - every list in the prototype is the same
     fixture whichever project is current. See account.ts: the switcher is real,
     the data behind it is one set, and this is where it moves to the shell on
     the day a page takes a project. */
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [accountOpen, setAccountOpen] = useState(false);

  const collapseLabel = `${collapsed ? 'Expand' : 'Collapse'} menu`;

  return (
    <nav className={`m-nav${collapsed ? ' is-collapsed' : ''}`} aria-label="Main">
      {/* ── the logo, and the collapse opposite it ──────────────────────────
          The mark and the name on the left; the collapse in the top right
          corner (Gabriel, 2026-09-03), where it reshapes the column from the
          column's own corner rather than from a row of unrelated glyphs at the
          bottom.

          The mark sits in the glyph column like every other icon here: same
          15px glyph, same 8px inset, so it, Search's glyph and every agent's
          share one centre in both widths. A logo that is nearly in the column
          is worse than one that is obviously not. */}
      <div className="m-nav__brand" data-mark-host>
        {collapsed ? (
          /* ⚠ NARROW, THE WHOLE ROW IS THE CONTROL. 52px does not hold a mark
             and a button, and a collapsed menu whose only way out is a
             keyboard shortcut is a trap. So the mark stays, the row carries the
             tooltip, and the expand glyph comes up over the mark on hover -
             which keeps the control in the same corner in both states. */
          <Tooltip title={`${collapseLabel}  ${COLLAPSE_KEY}`} placement="right">
            <button
              type="button"
              className="m-nav__brand-toggle"
              aria-label={collapseLabel}
              aria-expanded={false}
              onClick={onToggleCollapsed}
            >
              <OpenReplayMark size={16} className="m-nav__mark" />
              <PanelLeftOpen size={15} className="m-nav__brand-open" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : (
          <>
            <OpenReplayMark size={16} className="m-nav__mark" />
            {/* ⚠ THE PRODUCT IS OPENREPLAY (Mehdi, 2026-09-02). The strategy
                question closed on the facelift rather than the separate brand,
                so the name search and the whole Melonade wordmark went with it.
                One word, because "OpenReplay" is one word in their own logo. */}
            <span className="m-nav__brand-name">OpenReplay</span>
            <Tooltip title={`${collapseLabel}  ${COLLAPSE_KEY}`} placement="right">
              <button
                type="button"
                className="m-nav__collapse"
                aria-label={collapseLabel}
                aria-expanded
                onClick={onToggleCollapsed}
              >
                <PanelLeftClose size={15} aria-hidden="true" />
              </button>
            </Tooltip>
          </>
        )}
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
          meter loses its box and keeps the measure.

          AND IT OPENS SOMETHING NOW (Mehdi, 09-02: "nothing happens when
          clicking"). See AccountMenu. It is the ONE overlay on this control at
          both widths - no hover tooltip underneath it, unlike the rows - because
          the card names the organisation and every project in full, so there is
          nothing left for a tooltip to give back, and two overlays on one
          control means the hover and the click disagree about what it does. */}
      <AccountMenu
        project={project}
        onProject={setProject}
        onPreferences={() => onNavigate('preferences')}
        open={accountOpen}
        onOpenChange={setAccountOpen}
      >
        <button
          type="button"
          className={`m-nav__account${accountOpen ? ' is-open' : ''}`}
          aria-label={`Switch project: ${projectName(project)}, ${ORG.name}`}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
        >
          {/* A SQUARE, and the person at the foot of the menu is a circle. Two
              initials in one column mean two different kinds of thing, so the
              shape has to say which - an organisation is not somebody. */}
          <span className="m-nav__account-badge" aria-hidden="true">
            {ORG.initial}
          </span>
          <span className="m-nav__account-text">
            <span className="m-nav__account-name m-truncate">{projectName(project)}</span>
            <span className="m-nav__account-org m-truncate">{ORG.name}</span>
          </span>
          <ChevronsUpDown size={13} className="m-nav__account-caret" aria-hidden="true" />
        </button>
      </AccountMenu>

      {/* ── the scrolling middle ────────────────────────────────────────────
          ⚠ ALL THREE GROUPS SCROLL now. The first used to be pinned above the
          separator, which worked while there was one group below it; with three
          groups a pinned first one would leave a rule at the top of a scroller
          with nothing above it to separate. */}
      <div className="m-nav__scroll">
        {groups.map((group, gi) => (
          <div key={group.label ?? 'top'} className="m-nav__section">
            {/* THE GROUP'S NAME, and it is a word again (see tree.ts). The
                first group has none: the top of a menu does not need to be told
                it is the top, so it gets the rule's spacing without the rule. */}
            {gi > 0 && <hr className="m-nav__sep" />}
            {group.label && <p className="m-nav__label">{group.label}</p>}
            <div className="m-nav__group" role="group" aria-label={group.label ?? 'Overview'}>
              {group.entries.map((e) => {
                /* Two maps, one row: a page names its glyph in the tree, an
                   agent names it in the roster. See tree.ts. */
                const Icon = e.icon ? PAGE_ICONS[e.icon] : e.agentIcon ? AGENT_ICONS[e.agentIcon] : undefined;
                const open = expanded.includes(e.key);
                const inside = active === e.key || active.startsWith(`${e.key}/`);
                return (
                  <NavFlyout
                    key={e.key}
                    enabled={collapsed}
                    label={e.label}
                    count={e.count}
                    countNoun={e.countNoun}
                    badge={e.badge}
                    sections={e.items}
                    active={active}
                    onNavigate={onNavigate}
                  >
                    <div className="m-nav__row">
                      <NavItem
                        icon={Icon ? <Icon size={15} /> : undefined}
                        label={e.label}
                        count={e.count}
                        badge={e.badge}
                        /* ⚠ A PARENT IS LIT WHEN ITS CHILDREN ARE NOT ON
                           SCREEN, which is not the same as "not expanded".
                           Collapsed, the subitems are never rendered whatever
                           `open` says - so the old `inside && !open` left the
                           narrow rail with NO current row at all once every
                           destination became a subitem. Nothing marked where
                           you were. */
                        active={e.items ? inside && (!open || collapsed) : inside}
                        /* Narrow, there is nothing to expand INTO - the
                           subitems live in the flyout - so the caret is not
                           merely hidden, it is not a control. */
                        expandable={e.items != null && !collapsed}
                        expanded={open}
                        onToggle={() => toggle(e.key)}
                        onClick={() => {
                          onNavigate(e.key);
                          if (e.items && !open && !collapsed) toggle(e.key);
                        }}
                      />
                      {/* The subitems. Present only while open, so the list has
                          one length at rest and the rows below never shift
                          under a cursor that was aiming at them. */}
                      {e.items && open && !collapsed && (
                        <div className="m-nav__sections">
                          {e.items.map((sub) => (
                            <NavItem
                              key={sub.key}
                              nested
                              label={sub.label}
                              /* ⚠ THE COUNT AND THE BADGE COME DOWN HERE TOO,
                                 and they did not until 09-04. A subitem had
                                 nothing to count while the only nesting in the
                                 menu was Analytics; the moment the agents moved
                                 under a parent, every counted row in the whole
                                 column was a subitem and the count column
                                 silently emptied - which is the menu's own
                                 argument ("it keeps the COUNT column") gone.
                                 The glyph stays off (tree.ts says why); a
                                 number is not a texture. */
                              count={sub.count}
                              badge={sub.badge}
                              active={active === sub.key}
                              onClick={() => onNavigate(sub.key)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </NavFlyout>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── the foot. Pinned, so it never scrolls away. ──────────────────────
          A grid of 28px tracks rather than a row, so the number of tracks falls
          out of the width the menu is already animating: five across when it is
          open, one when it is narrow, and every count in between on the way. A
          row that flipped to a column would snap to a column while the menu was
          still 256px wide.

          ⚠ FIVE GLYPHS, NOT SIX: the collapse left for the top right corner on
          2026-09-03. What is here is what Gabriel listed - preferences,
          notifications, support, theme, the person - and every one of them
          OPENS something, which is what the collapse never did. */}
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
