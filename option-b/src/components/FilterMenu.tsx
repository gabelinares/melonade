import { useMemo, useState } from 'react';
import { Popover, TextInput } from '@mantine/core';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Gauge,
  Globe,
  ListFilter,
  MousePointerClick,
  Search,
  Split,
  Tag as TagIcon,
} from 'lucide-react';
import type { FilterDimension, FilterKey, FilterOption } from '@shared/issues-logic.ts';
import { CheckRow } from './CheckRow.tsx';
import { IconButton } from './IconButton.tsx';
import './filter-menu.css';

/* The queue's vocabulary. A caller filtering something else passes its own map;
   see the `icons` prop. Which glyph means "slowness" is a design decision, which
   is why the shared layer never names one. */
const ISSUE_ICONS: Record<FilterKey, typeof TagIcon> = {
  cats: MousePointerClick,
  impact: Gauge,
  critical: AlertTriangle,
  tags: TagIcon,
  origins: Split,
};

/** An option's glyph, mapped from the KIND the shared layer reports. The shared
 *  layer never names a glyph: which icon means "slowness" is a design decision,
 *  and the two options answer it differently. */
function optionIcon(kind: FilterOption['kind']) {
  switch (kind) {
    case 'errors':
      return <CircleX size={13} />;
    case 'ui':
      return <MousePointerClick size={13} />;
    case 'slowness':
      return <Gauge size={13} />;
    case 'segment':
      return <Split size={13} />;
    case 'full':
      return <Globe size={13} />;
    case 'mine':
    case 'team':
      return <AlertTriangle size={13} />;
    case 'high':
    case 'medium':
    case 'low':
      return <span className={`b-fm__dot b-fm__dot--${kind}`} />;
    default:
      return null;
  }
}

export interface FilterMenuProps<K extends string = FilterKey> {
  dimensions: FilterDimension<K>[];
  isActive: (key: K, value: string) => boolean;
  onToggle: (key: K, value: string) => void;
  activeCount: number;
  /** One glyph per dimension key. Defaults to the queue's map, which is the
   *  original caller; anything filtering a different set of things brings its
   *  own vocabulary. A key with no glyph falls back to the filter mark rather
   *  than leaving a hole in the row. */
  icons?: Partial<Record<K, typeof TagIcon>>;
  /** Overrides the trigger's tooltip and accessible name. Two filter buttons on
   *  one screen cannot both be called "Filters". */
  label?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE control for every filter.
 *
 * It replaces a single tall popover that had every dimension stacked inside it:
 * three labelled sections, two nested scroll areas, and a total height that grew
 * every time a filter was added. Stacking is not the same as collapsing. This is
 * a two-level menu with search at the top, and the level that matters is the
 * search:
 *
 * 1. **Search spans every dimension.** Typing "checkout" surfaces the Checkout
 *    tag and the Billing & checkout segment together, so you never have to know
 *    which dimension a value lives in before you can reach it. Stacked sections
 *    structurally cannot do that.
 * 2. **Every option carries its count**, computed with the other filters still
 *    applied. "Payment 2" tells you the filter is worth applying before you
 *    apply it.
 * 3. **Options that match nothing are still listed.** A menu that changes shape
 *    as you use it is harder to learn than one with a zero in it.
 * 4. **The applied filters are NOT in here.** They render as removable chips
 *    under the column head, because folding a whole dimension set behind one
 *    icon without that is how filter state becomes invisible.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function FilterMenu<K extends string = FilterKey>({
  dimensions,
  isActive,
  onToggle,
  activeCount,
  icons,
  label = 'Filters',
}: FilterMenuProps<K>) {
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<K | null>(null);
  const [query, setQuery] = useState('');
  const iconFor = (key: K) =>
    (icons?.[key] ?? (ISSUE_ICONS as Partial<Record<string, typeof TagIcon>>)[key] ?? ListFilter);

  const q = query.trim().toLowerCase();

  /* Searching flattens the tree into one list of matching values across every
     dimension, each labelled with the dimension it came from, because "which
     dimension is Safari in" is the question the search exists to remove. */
  const matches = useMemo(() => {
    if (!q) return [];
    return dimensions.flatMap((d) =>
      d.options
        .filter((o) => o.label.toLowerCase().includes(q) || d.label.toLowerCase().includes(q))
        .map((o) => ({ dimension: d, option: o })),
    );
  }, [dimensions, q]);

  const active = dimensions.find((d) => d.key === openKey) ?? null;

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setOpenKey(null);
      setQuery('');
    }
  };

  return (
    <Popover opened={open} onChange={close} position="bottom-end" width={280} trapFocus>
      <Popover.Target>
        <IconButton
          icon={<ListFilter size={15} />}
          label={label}
          count={activeCount}
          active={activeCount > 0}
          open={open}
          onClick={() => close(!open)}
        />
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <div className="b-fm" role="menu">
          <div className="b-fm__search">
            {active && !q ? (
              <button
                type="button"
                className="b-fm__back"
                onClick={() => setOpenKey(null)}
                aria-label="Back to all filters"
              >
                <ChevronLeft size={14} />
                <span>{active.label}</span>
              </button>
            ) : (
              <Search size={14} className="b-fm__search-icon" aria-hidden="true" />
            )}
            <TextInput
              data-autofocus
              variant="unstyled"
              size="sm"
              className="b-fm__input"
              placeholder={active && !q ? `Filter ${active.label.toLowerCase()}` : 'Add filter'}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              aria-label="Search filters"
            />
          </div>

          <div className="b-fm__body">
            {q &&
              (matches.length === 0 ? (
                <p className="b-fm__none">Nothing matches that.</p>
              ) : (
                matches.map(({ dimension, option }) => (
                  <CheckRow
                    key={`${dimension.key}:${option.value}`}
                    on={isActive(dimension.key, option.value)}
                    single={dimension.single}
                    icon={optionIcon(option.kind)}
                    meta={
                      <span className="b-fm__meta">
                        <span className="b-fm__dim">{dimension.label}</span>
                        {option.count}
                      </span>
                    }
                    onToggle={() => onToggle(dimension.key, option.value)}
                  >
                    {option.label}
                  </CheckRow>
                ))
              ))}

            {!q && !active &&
              dimensions.map((d) => {
                const Icon = iconFor(d.key);
                const applied = d.options.filter((o) => isActive(d.key, o.value)).length;
                return (
                  <button
                    key={d.key}
                    type="button"
                    className="b-fm__dim-row"
                    onClick={() => setOpenKey(d.key)}
                    aria-haspopup="menu"
                  >
                    <span className="b-fm__dim-icon" aria-hidden="true"><Icon size={14} /></span>
                    <span className="b-fm__dim-label">{d.label}</span>
                    {applied > 0 && <span className="b-fm__applied">{applied}</span>}
                    <ChevronRight size={13} className="b-fm__caret" aria-hidden="true" />
                  </button>
                );
              })}

            {!q && active && (
              <>
                {active.hint && <p className="b-fm__hint">{active.hint}</p>}
                {active.options.map((o) => (
                  <CheckRow
                    key={o.value}
                    on={isActive(active.key, o.value)}
                    single={active.single}
                    icon={optionIcon(o.kind)}
                    meta={o.count}
                    onToggle={() => onToggle(active.key, o.value)}
                  >
                    {o.label}
                  </CheckRow>
                ))}
              </>
            )}
          </div>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}
