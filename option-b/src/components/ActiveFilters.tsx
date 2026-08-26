import { X } from 'lucide-react';
import type { ActiveFilterChip, FilterKey } from '@shared/issues-logic.ts';
import './active-filters.css';

export interface ActiveFiltersProps {
  chips: ActiveFilterChip[];
  onRemove: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  resultCount: number;
}

/**
 * The applied filters, spelled out and individually removable.
 *
 * This is the price of collapsing every dimension behind one icon, and it is not
 * optional. A single funnel can say "3 applied" but it cannot say WHICH three, so
 * without this the answer to "why is my queue short" lives behind a click. Each
 * chip names its dimension as well as its value, because "High" alone is
 * ambiguous once impact and critical both have options.
 */
export function ActiveFilters({ chips, onRemove, onClearAll, resultCount }: ActiveFiltersProps) {
  if (chips.length === 0) return null;

  return (
    <div className="b-af" role="region" aria-label="Applied filters">
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          className="b-af__chip"
          onClick={() => onRemove(c.key, c.value)}
          aria-label={`Remove filter ${c.dimension}: ${c.label}`}
        >
          <span className="b-af__dim">{c.dimension}</span>
          <span className="b-af__val m-truncate">{c.label}</span>
          <X size={11} aria-hidden="true" />
        </button>
      ))}
      <span className="b-af__result">
        {resultCount} {resultCount === 1 ? 'issue' : 'issues'}
      </span>
      <button type="button" className="b-af__clear" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}
