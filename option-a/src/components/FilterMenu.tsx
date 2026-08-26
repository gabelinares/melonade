import { useMemo, useState } from 'react';
import { Input, Popover } from 'antd';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Gauge,
  Globe,
  ListFilter,
  MousePointerClick,
  Split,
  Tag as TagIcon,
} from 'lucide-react';
import type { FilterDimension, FilterKey, FilterOption } from '@shared/issues-logic.ts';
import { CheckRow } from './CheckRow.tsx';
import { IconButton } from './IconButton.tsx';
import './filter-menu.css';

/** The dimension's own glyph, so the root list reads as a set of things rather
 *  than a set of words. */
/* The queue's vocabulary. A caller filtering something else brings its own map;
   see the `icons` prop. Which glyph means "slowness" is a design decision,
   which is why the shared layer never names one. */
const ISSUE_ICONS: Record<FilterKey, typeof TagIcon> = {
  cats: MousePointerClick,
  impact: Gauge,
  critical: AlertTriangle,
  tags: TagIcon,
  origins: Split,
};

/** An option's glyph, mapped from the KIND the shared layer reports. The shared
 *  layer never names a glyph: which icon means "slowness" is a design decision. */
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
      return <span className={`m-fm__dot m-fm__dot--${kind}`} />;
    default:
      return null;
  }
}

export interface FilterMenuProps<K extends string = FilterKey> {
  dimensions: FilterDimension<K>[];
  isActive: (key: K, value: string) => boolean;
  onToggle: (key: K, value: string) => void;
  /** How many filters are applied, for the trigger's badge. */
  activeCount: number;
  /** One glyph per dimension key. Defaults to the queue's map, which is the
   *  original caller; anything filtering a different set of things brings its
   *  own vocabulary. */
  icons?: Partial<Record<K, typeof TagIcon>>;
  /** Overrides the trigger's tooltip and accessible name. Two filter buttons on
   *  one screen cannot both be called "Filters". */
  label?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE control for every filter.
 *
 * It replaces three sibling dropdowns (Tags, Found in, Display) that sat on the
 * toolbar competing for width. Three buttons is not three times the power of
 * one: each one had to be opened to find out whether it held anything, none of
 * them could show a count against an option, and adding a sixth filter meant
 * finding another 90px on a row that had already started wrapping.
 *
 * The shape is a two-level menu with a search field at the top, which is worth
 * naming because it is what makes the collapse a gain rather than a trade:
 *
 * 1. **Search spans every dimension.** Typing "checkout" surfaces the Checkout
 *    tag and the Billing & checkout segment together, so you do not have to know
 *    which dimension a value lives in before you can reach it. That is the thing
 *    three separate dropdowns structurally cannot do.
 * 2. **Every option carries its count**, computed with the other filters still
 *    applied. "Payment 2" tells you the filter is worth applying before you
 *    apply it, which turns the menu from a guess into a plan.
 * 3. **Options that match nothing are still listed, just quieter.** A menu that
 *    changes shape as you use it is harder to learn than one with a zero in it.
 * 4. **The applied filters are NOT in here.** They render as removable chips
 *    beside the list. Folding five controls into one icon without that is how
 *    filter state becomes invisible.
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
  const iconFor = (key: K) =>
    (icons?.[key] ?? (ISSUE_ICONS as Partial<Record<string, typeof TagIcon>>)[key] ?? ListFilter);
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<K | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  /* Searching flattens the tree. While there is a query the menu is a single
     list of matching values across every dimension, each labelled with the
     dimension it came from, because "which dimension is Safari in" is exactly
     the question the search exists to make unnecessary. */
  const matches = useMemo(() => {
    if (!q) return [];
    return dimensions.flatMap((d) =>
      d.options
        .filter((o) => o.label.toLowerCase().includes(q) || d.label.toLowerCase().includes(q))
        .map((o) => ({ dimension: d, option: o })),
    );
  }, [dimensions, q]);

  const active = dimensions.find((d) => d.key === openKey) ?? null;

  const reset = () => {
    setOpenKey(null);
    setQuery('');
  };

  const content = (
    <div className="m-fm" role="menu">
      <div className="m-fm__search">
        {active && !q && (
          <button
            type="button"
            className="m-fm__back"
            onClick={() => setOpenKey(null)}
            aria-label="Back to all filters"
          >
            <ChevronLeft size={14} />
            <span>{active.label}</span>
          </button>
        )}
        <Input
          autoFocus
          variant="borderless"
          size="small"
          placeholder={active && !q ? `Filter ${active.label.toLowerCase()}` : 'Add filter'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search filters"
        />
      </div>

      <div className="m-fm__body">
        {/* searching: one flat list across every dimension */}
        {q && (
          matches.length === 0 ? (
            <p className="m-fm__none">Nothing matches that.</p>
          ) : (
            matches.map(({ dimension, option }) => (
              <CheckRow
                key={`${dimension.key}:${option.value}`}
                on={isActive(dimension.key, option.value)}
                single={dimension.single}
                icon={optionIcon(option.kind)}
                meta={
                  <span className="m-fm__meta">
                    <span className="m-fm__dim">{dimension.label}</span>
                    {option.count}
                  </span>
                }
                onToggle={() => onToggle(dimension.key, option.value)}
              >
                {option.label}
              </CheckRow>
            ))
          )
        )}

        {/* the root: one row per dimension */}
        {!q && !active && (
          <>
            {dimensions.map((d) => {
              const Icon = iconFor(d.key);
              const applied = d.options.filter((o) => isActive(d.key, o.value)).length;
              return (
                <button
                  key={d.key}
                  type="button"
                  className="m-fm__dim-row"
                  onClick={() => setOpenKey(d.key)}
                  aria-haspopup="menu"
                >
                  <span className="m-fm__dim-icon" aria-hidden="true"><Icon size={14} /></span>
                  <span className="m-fm__dim-label">{d.label}</span>
                  {applied > 0 && <span className="m-fm__applied">{applied}</span>}
                  <ChevronRight size={13} className="m-fm__caret" aria-hidden="true" />
                </button>
              );
            })}
          </>
        )}

        {/* one dimension's options */}
        {!q && active && (
          <>
            {active.hint && <p className="m-fm__hint">{active.hint}</p>}
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
  );

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      content={content}
      destroyOnHidden
    >
      <IconButton
        icon={<ListFilter size={15} />}
        label={label}
        count={activeCount}
        active={activeCount > 0}
        open={open}
      />
    </Popover>
  );
}
