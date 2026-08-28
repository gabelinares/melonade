import { Button } from 'antd';
import { X } from 'lucide-react';
import type { ActiveFilterChip, FilterKey } from '@shared/issues-logic.ts';
import './active-filters.css';

export interface ActiveFiltersProps<K extends string = FilterKey> {
  chips: readonly ActiveFilterChip<K>[];
  onRemove: (key: K, value: string) => void;
  onClearAll: () => void;
  /** How many rows the filters left, so the bar answers "did that help". */
  resultCount: number;
  /** What the rows are called, singular and plural. The count is the sentence's
   *  subject, and "12 issues" on the tests page would be a lie about the list. */
  noun?: readonly [string, string];
}

/**
 * The applied filters, spelled out and individually removable.
 *
 * This component is the price of collapsing five controls into one icon, and it
 * is not optional. A single funnel button can say "3 applied" but it cannot say
 * WHICH three, so without this the answer to "why is my list short" lives behind
 * a click. Each chip names its dimension as well as its value, because "High"
 * alone is ambiguous once impact and critical both have options.
 */
export function ActiveFilters<K extends string = FilterKey>({
  chips,
  onRemove,
  onClearAll,
  resultCount,
  noun = ['issue', 'issues'],
}: ActiveFiltersProps<K>) {
  if (chips.length === 0) return null;

  return (
    <div className="m-af" role="region" aria-label="Applied filters">
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          className="m-af__chip"
          onClick={() => onRemove(c.key, c.value)}
          aria-label={`Remove filter ${c.dimension}: ${c.label}`}
        >
          <span className="m-af__dim">{c.dimension}</span>
          <span className="m-af__val m-truncate">{c.label}</span>
          <X size={11} aria-hidden="true" />
        </button>
      ))}
      <span className="m-af__result">
        {resultCount} {resultCount === 1 ? noun[0] : noun[1]}
      </span>
      <Button type="text" size="small" onClick={onClearAll} className="m-af__clear">
        Clear all
      </Button>
    </div>
  );
}
