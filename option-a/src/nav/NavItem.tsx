import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import './nav-item.css';

export interface NavItemProps {
  /** Absent on a child row: the indent and the parent above it already say
   *  what this belongs to, and six icons in a nested list is a texture. */
  icon?: ReactNode;
  label: string;
  /** Open work waiting behind this item. Zero renders nothing. */
  count?: number;
  /** A word, not a number: "Beta". */
  badge?: string;
  active?: boolean;
  /** A section of an agent rather than a destination in its own right. */
  nested?: boolean;
  /** Has sections. Renders the caret, which toggles WITHOUT navigating. */
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

/**
 * One nav row.
 *
 * Two things it does that a list of links would not. The COUNT is the reason
 * this component exists at all: the menu doubles as the queue, so you can see
 * which agent has work without opening it, and a growing list of agents stays
 * useful rather than merely long.
 *
 * The COUNTS ARE A COLUMN, not a thing that trails the label: fixed width,
 * right-aligned, tabular figures, with the caret's slot reserved on every row.
 * Numbers that do not share an edge cannot be compared at a glance, which is
 * the only reason to put them in a menu.
 *
 * And the CARET IS ITS OWN CONTROL. Clicking the row goes to the agent;
 * clicking the caret opens its sections without going anywhere. A disclosure
 * that also navigates makes it impossible to look at what is inside something
 * without leaving where you are.
 */
export function NavItem({
  icon,
  label,
  count = 0,
  badge,
  active,
  nested,
  expandable,
  expanded,
  onToggle,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      className={`m-nav-item${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon && (
        <span className="m-nav-item__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="m-nav-item__label m-truncate">{label}</span>
      {badge && <span className="m-nav-item__badge">{badge}</span>}
      {count > 0 && <span className="m-nav-item__count">{count}</span>}
      {expandable ? (
        <span
          role="button"
          tabIndex={-1}
          className={`m-nav-item__caret${expanded ? ' is-open' : ''}`}
          aria-label={`${expanded ? 'Hide' : 'Show'} ${label} sections`}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <ChevronRight size={13} aria-hidden="true" />
        </span>
      ) : (
        /* The caret's slot is held open on every row, expandable or not. One
           agent having sections is not a reason for the other ten counts to sit
           in a different column from its own. */
        <span className="m-nav-item__caret is-empty" aria-hidden="true" />
      )}
    </button>
  );
}
