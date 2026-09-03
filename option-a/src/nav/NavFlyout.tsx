import type { ReactElement } from 'react';
import { Popover, Tooltip } from 'antd';
import type { NavEntry } from './tree.ts';
import { NavItem } from './NavItem.tsx';
import './nav-flyout.css';

export interface NavFlyoutProps {
  /** Off while the menu is open: a label beside a label is noise. */
  enabled: boolean;
  label: string;
  count?: number;
  /** What the count counts, so the tooltip can say "11 open" rather than "11". */
  countNoun?: string;
  badge?: string;
  /** SUBITEMS, and only Analytics has any - a tab never reaches the nav (see
   *  tree.ts), so at 52px this card is the only place a subitem can go. */
  sections?: readonly NavEntry[];
  /** The shell's one route string, so the sections in here light up like the
   *  ones in the open menu. */
  active?: string;
  onNavigate?: (key: string) => void;
  /** The row this hangs off. One element, because antd clones it. */
  children: ReactElement;
}

/**
 * THE ROW THE WIDTH TOOK AWAY - and only as much of it as is actually missing.
 *
 * TWO SHAPES, and which one you get is decided by whether there is anything
 * inside the row:
 *
 *   no sections  a plain tooltip: the NAME, and the COUNT in words - "Issues ·
 *                11 open". The rail shows a dot where the figure was, because a
 *                chip big enough for three digits swallows the glyph it is
 *                sitting on, so the figure has to be somewhere and this is
 *                where. A card for one line would be reading the row back to
 *                somebody who is looking at it.
 *
 *   sections     the card, because a nested list genuinely has nowhere else to
 *                go at 76px. The head is the row - same label, same figures -
 *                and under it the same section rows the open menu shows, drawn
 *                by the same NavItem from the same `AgentEntry.sections`. An
 *                agent that grows a fourth section grows it in both places or
 *                in neither.
 *
 * The foot's tools keep their plain tooltips too: the collapse took nothing
 * from them - they were glyphs before it and glyphs after - so there is nothing
 * for a card to give back.
 */
export function NavFlyout({
  enabled,
  label,
  count = 0,
  countNoun,
  badge,
  sections,
  active,
  onNavigate,
  children,
}: NavFlyoutProps) {
  if (!enabled) return children;

  if (!sections) {
    /* The narrow rail shows a DOT where the figure was, so the figure is here.
       This is not the card restating the row - it is the row's other half. */
    return (
      <Tooltip title={count > 0 ? `${label} · ${count} ${countNoun ?? 'open'}` : label} placement="right">
        {children}
      </Tooltip>
    );
  }

  return (
    <Popover
      /* rightTOP, not right: the card's head has to land on the row it came
         from. Centred, a three-section flyout hangs 20px above its own row and
         reads as a menu for whatever is above it. The offset cancels the card's
         own 4px inset so the two rows share a baseline. */
      placement="rightTop"
      /* ⚠ -6 AND NOT +2, and the 6 is a hover BRIDGE rather than a nudge.
         antd sets the card down a few pixels clear of the rail, which looks
         right and made the sections unreachable: between the 28px tile and the
         card was a strip of ground belonging to neither, so a cursor crossing
         it left the trigger, the leave timer ran, and the card was gone before
         it arrived. `.m-flyout-root` now carries that strip as padding - the
         popup's own box reaches back to the tile while the visible card stays
         where it was - and this offset pays the padding back. A gap you have to
         cross to reach a menu is a gap the menu has to own. */
      align={{ offset: [-6, -3] }}
      arrow={false}
      trigger={['hover', 'focus']}
      /* Long enough that sweeping down eleven rows does not fire eleven cards,
         short enough that aiming at one feels like a hover and not a wait - and
         long enough on the way out to survive a diagonal, which is how anybody
         actually moves from a row to the third line of a card. */
      mouseEnterDelay={0.22}
      mouseLeaveDelay={0.24}
      destroyOnHidden
      rootClassName="m-flyout-root"
      content={
        <div className="m-flyout">
          <div className="m-flyout__head">
            <span className="m-flyout__name m-truncate">{label}</span>
            {badge && <span className="m-nav-item__badge">{badge}</span>}
            {count > 0 && <span className="m-flyout__count">{count}</span>}
          </div>
          <div className="m-flyout__sections">
            {sections.map((s) => (
              <NavItem
                key={s.key}
                nested
                label={s.label}
                /* The card is the only place the narrow menu can print a
                   subitem's own figure, and since 09-04 that is where every
                   count in the product lives. Without it the rail says "19
                   somewhere in here" and the card that opens it says nothing at
                   all. */
                count={s.count}
                badge={s.badge}
                active={active === s.key}
                onClick={() => onNavigate?.(s.key)}
              />
            ))}
          </div>
        </div>
      }
    >
      {children}
    </Popover>
  );
}
