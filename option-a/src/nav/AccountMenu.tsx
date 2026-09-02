import type { ReactElement } from 'react';
import { Popover } from 'antd';
import { Settings2 } from 'lucide-react';
import { ORG } from './account.ts';
import { NavItem } from './NavItem.tsx';
import './account-menu.css';

export interface AccountMenuProps {
  /** Which project is current. The row for it is filled, the way every other
   *  selection in this build is filled. */
  project: string;
  onProject: (key: string) => void;
  /** The one destination in here, and it already exists in the menu's foot. */
  onPreferences: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The switcher itself. One element, because antd clones it. */
  children: ReactElement;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * WHAT THE SWITCHER OPENS.
 *
 * THE CARD IS THE TILE, CONTINUED. Its head is the same badge and the same two
 * lines as the control you clicked - literally the same three classes, so there
 * is one definition of how an account is set - and under a hairline are the
 * projects it holds. Nothing here is a second design of the thing above it.
 *
 * THREE DECISIONS, and they are all the same decision: put nothing in a menu
 * that a menu is not for.
 *
 * 1. THE CURRENT PROJECT IS A FILL, NOT A TICK. Selection in this build is a
 *    filled surface plus primary ink - the nav's current row, the pager's
 *    current page, the segmented thumb - so a checkmark here would be a fourth
 *    way of saying the one thing all three already say. It is the same NavItem
 *    the menu draws its own sections with, in its `nested` form.
 * 2. THE PROJECTS ARE NOT LABELLED "PROJECTS". A hairline says where a group
 *    starts, which is the same call the menu itself just made when AGENTS
 *    became a rule. Four domains under an organisation do not need a heading to
 *    say what they are.
 * 3. THERE IS NO INVITE, NO BILLING AND NO SECOND ORGANISATION. None of them
 *    exist anywhere in this build. A row that opens nothing is worse than the
 *    control that did nothing before it - it promises twice.
 *
 * The one non-project row is Preferences, and it goes to the page the menu's
 * own foot goes to. It is here because it is the thing you come to an account
 * menu looking for and it already exists.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function AccountMenu({
  project,
  onProject,
  onPreferences,
  open,
  onOpenChange,
  children,
}: AccountMenuProps) {
  const card = (
    <div className="m-account-menu">
      {/* The tile again, without its box: same badge, same two lines, same
          classes. What changes is which fact is on top - out here the project
          leads because that is what you are looking at, in here the
          organisation leads because that is what the list belongs to. */}
      <div className="m-account-menu__head">
        <span className="m-nav__account-badge" aria-hidden="true">
          {ORG.initial}
        </span>
        <span className="m-nav__account-text">
          <span className="m-nav__account-name m-truncate">{ORG.name}</span>
          <span className="m-nav__account-org m-truncate">
            {ORG.plan} · {ORG.projects.length} projects
          </span>
        </span>
      </div>

      <div className="m-account-menu__group" role="group" aria-label="Projects">
        {ORG.projects.map((p) => (
          <NavItem
            key={p.key}
            nested
            label={p.name}
            active={p.key === project}
            onClick={() => {
              onProject(p.key);
              /* The card closes on the switch. You came here to change one
                 thing, and it is changed. */
              onOpenChange(false);
            }}
          />
        ))}
      </div>

      <div className="m-account-menu__group">
        <NavItem
          icon={<Settings2 size={15} />}
          label="Preferences"
          onClick={() => {
            onPreferences();
            onOpenChange(false);
          }}
        />
      </div>
    </div>
  );

  return (
    <Popover
      content={card}
      trigger="click"
      open={open}
      onOpenChange={onOpenChange}
      /* BELOW the switcher and aligned to its left edge, because that is where
         the thing it is about is. The nav's row flyouts come out to the RIGHT,
         and that is not a second convention: those are a row giving back a
         label the width took away, this is a control opening its own menu. */
      placement="bottomLeft"
      arrow={false}
      rootClassName="m-account-root"
      /* Clear of the tile by the same 4px the card insets its rows by, so the
         gap under the control matches the gap inside it. FIVE, not four: antd
         lands the container a pixel high of the trigger's edge, and this is
         measured rather than assumed - proto-check asserts the 4. */
      align={{ offset: [0, 5] }}
    >
      {children}
    </Popover>
  );
}
