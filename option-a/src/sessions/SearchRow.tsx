import { InputNumber, Select, Tooltip } from 'antd';
import { CircleMinus, FunnelPlus, GripVertical } from 'lucide-react';
import {
  EVENT_PROPERTIES,
  categoryLabel,
  entryOf,
  hasValueOptions,
  isIncomplete,
  isNullary,
  operatorsFor,
  type CatalogueEntry,
  type SearchFilter,
} from '@shared/sessions-logic.ts';
import type { SessionRow } from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { FilterPicker } from './FilterPicker.tsx';
import { ValuePicker } from './ValuePicker.tsx';
import { EVENT_SCOPE } from './vocabulary.ts';
import './search-row.css';

export interface SearchRowProps {
  filter: SearchFilter;
  /** 1-based, and only on events. A property has no position, so it has no
   *  number — which is most of how the one list stays legible as two kinds. */
  index?: number;
  /** Events only, and only while there is more than one: a handle on a list of
   *  one is a control that cannot do anything. */
  draggable?: boolean;
  /** Every property already in the search, so the picker can disable them. */
  taken?: readonly string[];
  /** The sessions the value counts are computed against. Passed down rather
   *  than imported, so a row in a story counts the story's own rows. */
  rows: readonly SessionRow[];

  onReplace: (entry: CatalogueEntry) => void;
  onUpdate: (patch: Partial<SearchFilter>) => void;
  onRemove: () => void;

  /* events only */
  onAddProperty?: (entry: CatalogueEntry) => void;
  onUpdateProperty?: (propKey: string, patch: Partial<SearchFilter>) => void;
  onRemoveProperty?: (propKey: string) => void;
  onTogglePropertyOrder?: () => void;

  /* drag, owned by the list */
  onDragStart?: () => void;
  onDragOver?: (position: 'top' | 'bottom') => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  dragging?: boolean;
  dropAt?: 'top' | 'bottom' | null;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ONE ROW OF THE SEARCH, and it is a CLAUSE rather than three form fields.
 *
 * "Country is not France" reads left to right in one line of type, at one size,
 * with the operator as a word and not a boxed select. That is the single biggest
 * change from production, where a row is three bordered controls of three
 * different widths and the sentence is something you assemble in your head.
 *
 * The operator is a `variant="borderless"` Select: still a real control, still
 * keyboard-reachable, but drawn as the word it is. It takes its box back on
 * hover and focus, which is the rule this app already uses for a control that
 * lives inside prose.
 *
 * ── WHAT MAKES AN EVENT ROW AN EVENT ROW ───────────────────────────────────
 * Three things, and each one is a fact about events rather than a decoration:
 * the NUMBER (its position in the sequence, which is the only reason order
 * matters), the HANDLE (you can change that position), and the PROPERTY
 * AFFORDANCE (an event has properties; a property does not). A property row has
 * none of the three and gains an operator and a value. Same component, same
 * geometry, and the difference is visible without a heading over either group.
 *
 * ── AND WHAT AN EVENT ROW DOES NOT GET ─────────────────────────────────────
 * An operator. In production an event row draws no operator either - the
 * operator block is gated on `!filter.isEvent` - because "Click" is not a
 * comparison, it is a thing that happened. Keeping that gate is part of "the
 * core functioning should be exactly the same".
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SearchRow({
  filter,
  index,
  draggable,
  taken = [],
  rows,
  onReplace,
  onUpdate,
  onRemove,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onTogglePropertyOrder,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragging,
  dropAt,
}: SearchRowProps) {
  const entry = entryOf(filter.entryId);
  if (!entry) return null;

  const isSegment = entry.category === 'segments';
  const isFeature = entry.category === 'features';
  const canHaveProperties = entry.isEvent && entry.hasProperties === true;
  const incomplete = isIncomplete(filter);

  return (
    <div
      className={`m-srow${dragging ? ' is-dragging' : ''}${dropAt ? ` is-drop-${dropAt}` : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        /* Firefox refuses to start a drag with no payload. The index goes in
           the state, not the transfer, because the transfer is a string and the
           list already knows which row started. */
        e.dataTransfer.setData('text/plain', String(index ?? 0));
        onDragStart?.();
      }}
      onDragOver={(e) => {
        if (!onDragOver) return;
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        onDragOver(e.clientY < box.top + box.height / 2 ? 'top' : 'bottom');
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="m-srow__line">
        {/* THE POSITION SLOT. Held open on every row, filled only on events -
            so the subjects of both kinds share one left edge. Rendered only
            where it applies, a property's name would sit 28px left of the
            events' and the one list would read as two lists that failed to
            line up. */}
        <span className="m-srow__pos" aria-hidden={index == null}>
          {draggable && (
            <span className="m-srow__grip" title="Drag to reorder">
              <GripVertical size={13} />
            </span>
          )}
          {index != null && <span className="m-srow__num">{index}</span>}
        </span>

        {/* THE SUBJECT. Clicking it reopens the picker at this row's own
            category, which is the production behaviour and the reason a
            mis-picked filter costs one click rather than a remove and an add. */}
        <FilterPicker
          taken={taken}
          initialCategory={entry.category}
          onPick={onReplace}
          placeholder="Replace with"
        >
          <button type="button" className="m-srow__subject" aria-label={`Change ${entry.displayName}`}>
            <span className="m-srow__cat">{categoryLabel(entry.category)}</span>
            <span className="m-srow__dot" aria-hidden="true">·</span>
            <span className="m-srow__name m-truncate">{entry.displayName}</span>
          </button>
        </FilterPicker>

        {/* A SEGMENT AND A FEATURE ARE WHOLE CLAUSES. A segment IS a saved
            search and a feature flag is on or it is not, so neither takes an
            operator or a value — which is what production does by carrying the
            id as the value and offering nothing to edit. Saying so in words is
            the only addition: an event row with nothing after it looked
            unfinished. */}
        {isSegment && <span className="m-srow__said">is matched</span>}
        {isFeature && <span className="m-srow__said">is on</span>}

        {/* THE PREDICATE, properties only. */}
        {!entry.isEvent && (
          <>
            <Select
              className="m-srow__op"
              variant="borderless"
              size="small"
              popupMatchSelectWidth={false}
              value={filter.operator}
              onChange={(v) => onUpdate({ operator: v, value: [] })}
              options={noNativeTooltip(
                operatorsFor(entry.dataType).map((o) => ({ value: o.value, label: o.label })),
              )}
              aria-label={`Operator for ${entry.displayName}`}
            />
            <ValueField filter={filter} entry={entry} onUpdate={onUpdate} rows={rows} />
          </>
        )}

        {/* ── THE EVENT-LEVEL FILTER ───────────────────────────────────────
            `FunnelPlus`, the same glyph production uses, on an event that can
            carry properties.

            ⚠ AND IT NOW SAYS ITS SCOPE, in the exact words the group heading
            contradicts. This is the distinction Mehdi spent five minutes of
            2026-09-02 explaining, and the reason production has two sections at
            all: this narrows ONE event ("error, where country is Albania"),
            while a group filter below "will apply to both events on top of
            it... it's a group filtering basically". Two controls that look
            alike and mean different things is the confusion he named; two
            sentences that are opposites is the cheapest possible fix.

            ⚠ AND IT FINALLY DOES SOMETHING. Until 09-04 `eventPosition` ignored
            these rows, so this control could not change a result. See its note
            in sessions-logic. */}
        {canHaveProperties && onAddProperty && (
          <FilterPicker
            entries={EVENT_PROPERTIES}
            onPick={onAddProperty}
            placeholder="Narrow this event by"
            note={EVENT_SCOPE}
          >
            <Tooltip title={EVENT_SCOPE} mouseEnterDelay={0.6}>
              <button type="button" className="m-srow__prop-add" aria-label={`Narrow ${entry.displayName}`}>
                <FunnelPlus size={13} />
              </button>
            </Tooltip>
          </FilterPicker>
        )}

        {incomplete && (
          <Tooltip title="This filter has no value yet, so it is not narrowing anything.">
            <span className="m-srow__pending">needs a value</span>
          </Tooltip>
        )}

        <button type="button" className="m-srow__remove" onClick={onRemove} aria-label={`Remove ${entry.displayName}`}>
          <CircleMinus size={13} />
        </button>
      </div>

      {/* ── the event's own properties ────────────────────────────────────────
          Indented on a rail, the first reading "where" and the rest a clickable
          and/or — production's exact grammar, because it is good and because
          somebody already learned it. One value per event, so clicking any of
          the words changes them all, which is what the backend takes. */}
      {filter.properties && filter.properties.length > 0 && (
        <div className="m-srow__props">
          {filter.properties.map((p, i) => {
            const pe = entryOf(p.entryId);
            if (!pe) return null;
            return (
              <div key={p.key} className="m-srow__prop">
                {i === 0 ? (
                  <span className="m-srow__joint is-fixed">where</span>
                ) : (
                  <button
                    type="button"
                    className="m-srow__joint"
                    onClick={onTogglePropertyOrder}
                    aria-label={`Switch to ${filter.propertyOrder === 'or' ? 'and' : 'or'}`}
                  >
                    {filter.propertyOrder ?? 'and'}
                  </button>
                )}
                <span className="m-srow__prop-name m-truncate">{pe.displayName}</span>
                <Select
                  className="m-srow__op"
                  variant="borderless"
                  size="small"
                  popupMatchSelectWidth={false}
                  value={p.operator}
                  onChange={(v) => onUpdateProperty?.(p.key, { operator: v, value: [] })}
                  options={noNativeTooltip(
                    operatorsFor(pe.dataType).map((o) => ({ value: o.value, label: o.label })),
                  )}
                  aria-label={`Operator for ${pe.displayName}`}
                />
                <ValueField
                  filter={p}
                  entry={pe}
                  onUpdate={(patch) => onUpdateProperty?.(p.key, patch)}
                  rows={rows}
                />
                <button
                  type="button"
                  className="m-srow__remove"
                  onClick={() => onRemoveProperty?.(p.key)}
                  aria-label={`Remove ${pe.displayName}`}
                >
                  <CircleMinus size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The value, in whichever of the four shapes the data type asks for.
 *
 * A nullary operator draws NOTHING — "is any", "is true", "is empty" are whole
 * predicates, and production hides the value box for exactly these. An empty
 * disabled input after them would be a field that can never be filled.
 *
 * A closed option set is a `multiple` Select; free text is a `tags` Select, so
 * several values are one clause ("Country is France, Spain") rather than three
 * rows. That is what production's autocomplete does with its multi-value list,
 * without the network.
 */
function ValueField({
  filter,
  entry,
  onUpdate,
  rows,
}: {
  filter: SearchFilter;
  entry: CatalogueEntry;
  onUpdate: (patch: Partial<SearchFilter>) => void;
  rows: readonly SessionRow[];
}) {
  if (isNullary(entry.dataType, filter.operator)) return null;

  if (entry.dataType === 'duration') {
    /* A pair, not a list: the backend takes min and max. Seconds, labelled, so
       "over 300" is not a mystery unit. */
    return (
      <span className="m-srow__pair">
        <InputNumber
          size="small"
          min={0}
          max={7200}
          value={filter.min ?? undefined}
          onChange={(v) => onUpdate({ min: v ?? 0 })}
          placeholder="min"
          aria-label="Minimum duration in seconds"
        />
        <span className="m-srow__said">to</span>
        <InputNumber
          size="small"
          min={0}
          max={7200}
          value={filter.max ?? undefined}
          onChange={(v) => onUpdate({ max: v ?? 0 })}
          placeholder="max"
          aria-label="Maximum duration in seconds"
        />
        <span className="m-srow__unit">seconds</span>
      </span>
    );
  }

  /* A NUMBER WITH KNOWN VALUES STILL GETS THE SHARE PICKER. A status code is a
     number and also an enumeration - "404" is a value you pick, not one you
     type - and a picker that showed 404's share of traffic and then handed the
     next such field a bare spinner would be the good control appearing at
     random. A number with nothing to enumerate (`errorsCount > 5`) gets the
     spinner, which is the right shape for a threshold. */
  if (entry.dataType === 'number' && !hasValueOptions(entry.id)) {
    return (
      <InputNumber
        className="m-srow__num-input"
        size="small"
        value={filter.value[0] != null ? Number(filter.value[0]) : undefined}
        onChange={(v) => onUpdate({ value: v == null ? [] : [String(v)] })}
        placeholder="value"
        aria-label={`Value for ${entry.displayName}`}
      />
    );
  }

  /* EVERY OTHER VALUE GOES THROUGH THE SHARE PICKER, closed set or open. That
     is the point of it: the share of traffic a value holds is the thing that
     makes choosing one a decision instead of a guess, and a plain multi-select
     is what production's autocomplete stops being the moment you take the bar
     off it. A closed set takes no typed values; an open one does. */
  return (
    <ValuePicker
      entryId={entry.id}
      value={filter.value}
      onChange={(v) => onUpdate({ value: v })}
      rows={rows}
      name={entry.displayName}
      freeText={!entry.options}
    />
  );
}
