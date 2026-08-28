import type { ReactNode } from 'react';
import { CountSuffix } from './CountSuffix.tsx';
import './filter-strip.css';

export interface StripItem {
  key: string;
  label: string;
  /** The faded number after the label. Omit where a count would be noise. */
  count?: number;
  icon?: ReactNode;
}

export interface FilterStripProps {
  items: readonly StripItem[];
  /** Every key currently on. A single-select caller passes one; a multi-select
   *  caller passes as many as it likes. The strip does not care which it is -
   *  it draws state and reports clicks. */
  selected: readonly string[];
  onSelect: (key: string) => void;
  /** Names the group for a screen reader: "Filter by category", "Status". */
  label: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE STRIP OF TOGGLES that stands in for antd's Segmented.
 *
 * It looks like Segmented on purpose - the toolbar should not change shape
 * between pages - but Segmented is single-select by construction, and the issue
 * queue needs category to be a normal multi-select dimension like every other
 * one. Rather than keep two controls that differ by a pixel, there is one
 * control that draws pressed state and lets the CALLER decide what pressing
 * means: exclusive tabs on Tests and Audits, independent toggles on Issues.
 *
 * Which is also why "All" is not special in here. On Issues it is the empty
 * selection; on Tests it is a fifth status. Both are just an item whose key the
 * caller happens to treat differently.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FilterStrip({ items, selected, onSelect, label }: FilterStripProps) {
  return (
    <div className="m-seg" role="group" aria-label={label}>
      {items.map((it) => {
        const on = selected.includes(it.key);
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={on}
            className={`m-seg__item${on ? ' is-on' : ''}`}
            onClick={() => onSelect(it.key)}
          >
            {it.icon}
            {it.label}
            {it.count != null && <CountSuffix n={it.count} />}
          </button>
        );
      })}
    </div>
  );
}
