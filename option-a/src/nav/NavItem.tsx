import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import './nav-item.css';

export interface NavItemProps {
  icon: ReactNode;
  label: string;
  /** Open work waiting behind this item. Zero renders nothing. */
  count?: number;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

/**
 * One nav row. The count is the reason this component exists: the nav doubles
 * as the queue, so you can see which agent has work without opening it. That
 * is what makes a growing list of agents useful rather than merely long.
 */
export function NavItem({ icon, label, count = 0, active, collapsed, onClick }: NavItemProps) {
  const row = (
    <button
      type="button"
      className={`m-nav-item${active ? ' is-active' : ''}${collapsed ? ' is-collapsed' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <span className="m-nav-item__icon" aria-hidden="true">{icon}</span>
      {!collapsed && (
        <>
          <span className="m-nav-item__label m-truncate">{label}</span>
          {count > 0 && <span className="m-nav-item__count">{count}</span>}
        </>
      )}
      {collapsed && count > 0 && <span className="m-nav-item__dot" aria-hidden="true" />}
      {collapsed && <span className="m-sr-only">{label}{count > 0 ? `, ${count} open` : ''}</span>}
    </button>
  );

  return collapsed ? (
    <Tooltip title={count > 0 ? `${label} · ${count}` : label} placement="right">
      {row}
    </Tooltip>
  ) : (
    row
  );
}
