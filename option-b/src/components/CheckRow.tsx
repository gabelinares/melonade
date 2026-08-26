import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import './check-row.css';

export interface CheckRowProps {
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
  meta?: ReactNode;
  /** The option's own glyph, in a slot after the checkbox. Omit and the slot
   *  collapses, so a list of plain labels carries no dead leading space. */
  icon?: ReactNode;
  /** Single-select dimensions read as a radio choice, not an accumulation. */
  single?: boolean;
}

/**
 * Every option row in every menu: the filter tree, the display menu, the capture
 * popover. It exists because the three sibling popovers in the app being replaced
 * each rolled their own, so one had no hover target, one had no selected tint,
 * and the click area was only as wide as the label.
 *
 * **The checkbox only appears on hover, on focus, or when the option is
 * selected.** A column of empty checkboxes turns a menu into a form: it pulls the
 * eye to the controls instead of the labels, and it makes nine unchecked boxes as
 * loud as the one that matters. The slot is RESERVED rather than inserted on
 * hover, which is what stops every label shifting sideways under the cursor.
 */
export function CheckRow({ on, onToggle, children, meta, icon, single }: CheckRowProps) {
  return (
    <button
      type="button"
      role={single ? 'menuitemradio' : 'menuitemcheckbox'}
      aria-checked={on}
      className={`b-checkrow${on ? ' is-on' : ''}${single ? ' is-single' : ''}`}
      onClick={onToggle}
    >
      <span className="b-checkrow__box" aria-hidden="true">
        {on && <Check size={11} strokeWidth={3} />}
      </span>
      {icon != null && <span className="b-checkrow__icon" aria-hidden="true">{icon}</span>}
      <span className="b-checkrow__label m-truncate">{children}</span>
      {meta != null && <span className="b-checkrow__meta">{meta}</span>}
    </button>
  );
}
