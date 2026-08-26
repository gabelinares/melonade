import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import './rail-item.css';

export interface RailItemProps {
  icon: ReactNode;
  label: string;
  /** Open work behind this agent. Zero renders no badge. */
  count?: number;
  active?: boolean;
  onClick?: () => void;
  /** Renders as an outline, for the "add an agent" slot. */
  ghost?: boolean;
}

/**
 * One slot in the rail.
 *
 * The label lives in a tooltip and in an accessible name rather than on screen.
 * That is the trade this menu makes and it is the whole scaling argument: a rail
 * slot costs 44px of height and ZERO width, so the eleventh agent is as cheap as
 * the third and the content panes never give anything back.
 *
 * The count is a badge rather than a number in a row, because there is no row.
 * It is still the queue: you can see which agent has work without opening it.
 *
 * The tooltip is antd's, not the one this came over with. A ported component
 * that keeps its old library's popup would put a second tooltip look in a shell
 * that already has one, and the difference shows up on the first hover.
 */
export function RailItem({ icon, label, count = 0, active, onClick, ghost }: RailItemProps) {
  return (
    <Tooltip title={count > 0 ? `${label} · ${count} open` : label} placement="right">
      <button
        type="button"
        className={`m-rail-item${active ? ' is-active' : ''}${ghost ? ' is-ghost' : ''}`}
        aria-current={active ? 'page' : undefined}
        aria-label={count > 0 ? `${label}, ${count} open` : label}
        onClick={onClick}
      >
        <span className="m-rail-item__icon" aria-hidden="true">{icon}</span>
        {count > 0 && (
          <span className="m-rail-item__badge" aria-hidden="true">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
