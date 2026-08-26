import { forwardRef, type ReactNode } from 'react';
import { Tooltip } from '@mantine/core';
import './icon-button.css';

export interface IconButtonProps {
  icon: ReactNode;
  /** Required. An icon-only control with no accessible name is unusable. */
  label: string;
  /** A number the control is reporting, rendered as a badge. Zero shows none. */
  count?: number;
  /** `outline` sits in a toolbar; `ghost` is for a control inside another
   *  surface, where a border would be a second edge; `primary` is the filled
   *  accent, for the one action in a bar that is the point of the bar. */
  variant?: 'outline' | 'ghost' | 'primary';
  active?: boolean;
  open?: boolean;
  /** A toggle that is currently on. Distinct from `open`, which is a menu
   *  showing its dropdown: a pressed control reports state, so it carries
   *  aria-pressed rather than aria-expanded. */
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Every icon-only control in a toolbar.
 *
 * It exists because the three controls at the head of the queue column, search,
 * filters and display, were built three different ways: search was Mantine's
 * ActionIcon at 34px, the other two were hand-rolled buttons at 28px, and they
 * sat flush against each other because the row that held them had no gap. Three
 * sizes and no rhythm in a group of three, which is the exact failure a design
 * system exists to prevent, and it was visible at a glance.
 *
 * One component, one height, one radius, one badge treatment. The variants differ
 * only in whether they carry a border.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, count = 0, variant = 'outline', active, open, pressed, disabled, onClick },
  ref,
) {
  return (
    <Tooltip label={label} position="bottom" openDelay={350}>
      <button
        ref={ref}
        type="button"
        className={`b-iconbtn b-iconbtn--${variant}${active ? ' is-active' : ''}${
          open ? ' is-open' : ''
        }${pressed ? ' is-on' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={count > 0 ? `${label}, ${count}` : label}
        aria-expanded={open}
        aria-pressed={pressed}
      >
        <span className="b-iconbtn__icon" aria-hidden="true">{icon}</span>
        {count > 0 && <span className="b-iconbtn__count" aria-hidden="true">{count}</span>}
      </button>
    </Tooltip>
  );
});
