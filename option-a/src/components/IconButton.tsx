import { forwardRef, type ReactNode } from 'react';
import { Tooltip } from 'antd';
import './icon-button.css';

export interface IconButtonProps {
  icon: ReactNode;
  /** Required. An icon-only control with no accessible name is unusable. */
  label: string;
  /** A number the control is reporting, rendered as a badge. Zero shows none. */
  count?: number;
  /** `outline` sits in a toolbar; `ghost` is for a control inside another
   *  surface, where a border would be a second edge. */
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
 * One component, one height, one radius, one badge treatment. The filter and
 * display triggers previously each carried their own copy of that CSS, which is
 * how two neighbouring controls drift by a pixel and then by four. The variants
 * differ only in whether they carry a border.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, count = 0, variant = 'outline', active, open, pressed, disabled, onClick },
  ref,
) {
  return (
    <Tooltip title={label} mouseEnterDelay={0.35}>
      <button
        ref={ref}
        type="button"
        className={`m-iconbtn m-iconbtn--${variant}${active ? ' is-active' : ''}${
          open ? ' is-open' : ''
        }${pressed ? ' is-on' : ''}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={count > 0 ? `${label}, ${count}` : label}
        aria-expanded={open}
        aria-pressed={pressed}
      >
        <span className="m-iconbtn__icon" aria-hidden="true">{icon}</span>
        {count > 0 && <span className="m-iconbtn__count" aria-hidden="true">{count}</span>}
      </button>
    </Tooltip>
  );
});
