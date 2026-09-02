import { useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { Search, Sparkles } from 'lucide-react';
import {
  describeFilter,
  translate,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { FilterPicker } from './FilterPicker.tsx';
import { SearchRow } from './SearchRow.tsx';
import './search-card.css';

/** Three sentences that actually translate, so the examples are not a promise
 *  the field cannot keep. Offered only on an empty search: once there is a row
 *  in the card, examples are in the way of the thing you are building. */
const EXAMPLES: readonly string[] = [
  'paid users who hit an error',
  'mobile sessions with rage clicks',
  'trials that reached checkout',
];

const ORDER_OPTIONS: ReadonlyArray<{ value: EventsOrder; label: string; hint: string }> = [
  { value: 'then', label: 'then', hint: 'In this order, one after another' },
  { value: 'and', label: 'and', hint: 'All of them, in any order' },
  { value: 'or', label: 'or', hint: 'Any one of them' },
];

export interface SearchCardProps {
  events: readonly SearchFilter[];
  properties: readonly SearchFilter[];
  eventsOrder: EventsOrder;

  onAdd: (entry: CatalogueEntry) => void;
  onAddMany: (filters: SearchFilter[]) => void;
  onReplace: (key: string, entry: CatalogueEntry) => void;
  onUpdate: (key: string, patch: Partial<SearchFilter>) => void;
  onRemove: (key: string) => void;
  onMoveEvent: (from: number, to: number) => void;
  onAddProperty: (eventKey: string, entry: CatalogueEntry) => void;
  onUpdateProperty: (eventKey: string, propKey: string, patch: Partial<SearchFilter>) => void;
  onRemoveProperty: (eventKey: string, propKey: string) => void;
  onTogglePropertyOrder: (eventKey: string) => void;
  onEventsOrder: (order: EventsOrder) => void;
  onClear: () => void;
  /** The sessions the value counts are computed against — everything the date
   *  range and the other filters already left. */
  rows: readonly SessionRow[];
  /** The controls that belong to the LIST rather than to the search - the date
   *  range and the display menu. They ride the search's own bar because the
   *  bar is what sticks: a window you cannot change without scrolling back up
   *  is the same complaint the sticky came out of. A slot rather than props,
   *  because the search has no business knowing what a date range is. */
  trailing?: ReactNode;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE SEARCH — ONE BUTTON, ONE LIST.
 *
 * Mehdi, 2026-09-02: "the core idea is to add the event and filter button as a
 * single button, but the core functioning should be exactly the same."
 *
 * WHAT WENT: two "+ Add" buttons, two section headings ("Events", "Filters"),
 * and the rule between them that existed to separate two lists.
 *
 * WHAT STAYED, all of it: events are an ORDERED, NUMBERED, DRAGGABLE sequence;
 * properties are an unordered set; `eventsOrder` is one THEN / AND / OR for the
 * whole search; an event carries its own properties under "where … and/or"; a
 * property already in the search cannot be added twice and an event can.
 *
 * ── WHY ONE LIST IS NOT A COMPROMISE ───────────────────────────────────────
 * `searchStore.instance.filters` is ONE array with `isEvent` on each item. Two
 * sections was the UI's invention, and it cost something real: you had to know
 * whether the thing you wanted was an event or a property BEFORE you could
 * start looking for it. "Is duration an event?" is not a question anybody
 * should have to answer to search their own sessions. One picker, and the
 * answer falls out of what you pick.
 *
 * The two kinds are still obvious, and they are obvious from the ROWS rather
 * than from a heading over them: an event has a number, a handle and a property
 * affordance; a property has an operator and a value. That is what the kept
 * hairline is for - it separates the sequence from the constraints, and it is
 * drawn only when there is something on both sides of it.
 *
 * ── THE ORDER CONTROL EARNS ITS PLACE ──────────────────────────────────────
 * It appears when there are TWO events and not before, which is production's
 * own rule (`showEventsOrder={eventFilters.length > 0}` refetching only above
 * one). Reworded from a label plus a dropdown to a sentence you can read:
 * "matching  then ▾". "Events Order: THEN" is the database's name for it.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SearchCard({
  events,
  properties,
  eventsOrder,
  onAdd,
  onAddMany,
  onReplace,
  onUpdate,
  onRemove,
  onMoveEvent,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onTogglePropertyOrder,
  onEventsOrder,
  onClear,
  rows,
  trailing,
}: SearchCardProps) {
  const [drag, setDrag] = useState<{ from: number; over: number | null; at: 'top' | 'bottom' | null }>({
    from: -1,
    over: null,
    at: null,
  });

  const any = events.length > 0 || properties.length > 0;
  const takenProperties = properties.map((f) => f.entryId);

  const endDrag = () => setDrag({ from: -1, over: null, at: null });

  const commitDrop = () => {
    const { from, over, at } = drag;
    if (from < 0 || over == null) return endDrag();
    let to = at === 'bottom' ? over + 1 : over;
    if (from < to) to -= 1;
    if (to !== from) onMoveEvent(from, to);
    endDrag();
  };

  return (
    <section className="m-sc" aria-label="Session search">
      {/* ── THE FIELD ─────────────────────────────────────────────────────────
          It is a FIELD, not a button, and that is the change: "+ Add filter"
          was a 90px control that gave no sign it accepted a sentence, so the
          half of this search nobody expects was invisible until you opened it.
          A field the width of the plane says "type here" without a word, and
          the note on its right says what typing gets you.

          THE RING is the one piece of expression on this page. It sweeps once
          around the field on hover and on focus - a slow conic pass, mostly the
          border's own grey with a single accent arc in it - because this field
          is where the search agent will live and a control that is about to
          become an agent should look like it is listening. It is not on at
          rest: a permanently animated border is a page you cannot read. */}
      <div className="m-sc__bar">
        <FilterPicker taken={takenProperties} onPick={onAdd} onTranslate={onAddMany}>
          <button type="button" className="m-sc__field" aria-label="Search events and filters">
            <span className="m-sc__ring" aria-hidden="true" />
            <Search size={15} className="m-sc__field-glyph" aria-hidden="true" />
            <span className="m-sc__field-text">
              Search events and filters, or describe a session
            </span>
            <span className="m-sc__field-note">
              <Sparkles size={12} aria-hidden="true" />
              reads plain English
            </span>
          </button>
        </FilterPicker>
        {trailing}
      </div>

      {/* ── what the search is doing, once it is doing something ─────────────
          The order control and Clear act on the WHOLE search, so they sit above
          the rows rather than in the field's line: the field is where you add,
          this strip is where you change your mind. Absent until there is a
          search to change. */}
      {any && (
        <div className="m-sc__strip">
          {/* TWO events, not one: with a single event there is no gap for an
              operator to sit in, and a control that cannot change the result is
              a control that teaches you to ignore controls. */}
          {events.length > 1 && (
            <span className="m-sc__order">
              <Tooltip title="How the events relate to each other, across the whole search.">
                <span className="m-sc__order-label">matching</span>
              </Tooltip>
              <Select
                className="m-sc__order-select"
                size="small"
                variant="borderless"
                popupMatchSelectWidth={false}
                value={eventsOrder}
                onChange={onEventsOrder}
                options={noNativeTooltip(
                  ORDER_OPTIONS.map((o) => ({
                    value: o.value,
                    label: (
                      <span className="m-sc__order-option">
                        <span>{o.label}</span>
                        <span className="m-sc__order-hint">{o.hint}</span>
                      </span>
                    ),
                  })),
                )}
                /* The closed control shows the word alone; the open list shows
                   the word and what it means. A dropdown whose closed state
                   repeats its own explanation is a dropdown twice as wide as it
                   needs to be. */
                labelRender={({ value }) => <span>{String(value)}</span>}
                aria-label="How the events relate"
              />
            </span>
          )}

          <Button type="text" size="small" className="m-sc__clear" onClick={onClear}>
            Clear
          </Button>
        </div>
      )}

      {/* ── the list ── */}
      {any ? (
        <div className="m-sc__list">
          {events.map((f, i) => (
            <SearchRow
              key={f.key}
              filter={f}
              index={i + 1}
              draggable={events.length > 1}
              taken={takenProperties}
              rows={rows}
              onReplace={(e) => onReplace(f.key, e)}
              onUpdate={(p) => onUpdate(f.key, p)}
              onRemove={() => onRemove(f.key)}
              onAddProperty={(e) => onAddProperty(f.key, e)}
              onUpdateProperty={(pk, p) => onUpdateProperty(f.key, pk, p)}
              onRemoveProperty={(pk) => onRemoveProperty(f.key, pk)}
              onTogglePropertyOrder={() => onTogglePropertyOrder(f.key)}
              onDragStart={() => setDrag({ from: i, over: null, at: null })}
              onDragOver={(at) => setDrag((d) => (d.from < 0 ? d : { ...d, over: i, at }))}
              onDrop={commitDrop}
              onDragEnd={endDrag}
              dragging={drag.from === i}
              dropAt={drag.over === i && drag.from !== i ? drag.at : null}
            />
          ))}

          {/* The one rule, and only when there is something on both sides of
              it. It separates the sequence from the constraints - which is a
              real difference and the only one the list needs stated. */}
          {events.length > 0 && properties.length > 0 && <hr className="m-sc__rule" />}

          {properties.map((f) => (
            <SearchRow
              key={f.key}
              filter={f}
              taken={takenProperties}
              rows={rows}
              onReplace={(e) => onReplace(f.key, e)}
              onUpdate={(p) => onUpdate(f.key, p)}
              onRemove={() => onRemove(f.key)}
            />
          ))}
        </div>
      ) : (
        /* ── the empty search ──────────────────────────────────────────────
           Not an empty state: there is nothing wrong. One line saying what the
           field takes, and three sentences that DO translate - examples that
           came back empty would be worse than no examples. Requested for the
           Issues search on 06-29 and it applies here for the same reason: a
           field that accepts prose has to show you the shape of prose it
           accepts. */
        <div className="m-sc__empty">
          <p className="m-sc__hint">Try</p>
          <div className="m-sc__examples">
            {EXAMPLES.map((ex) => (
              <ExampleChip key={ex} text={ex} onUse={onAddMany} />
            ))}
          </div>
        </div>
      )}

      {/* THE SEARCH, IN WORDS. Off-screen, and live: the rows are the search,
          so a change to them has to be announced as a change to the search
          rather than as six unrelated control updates. Built from the same
          `describeFilter` the saved-segment list prints, so the sentence a
          screen reader hears and the sentence a segment shows are one
          sentence. */}
      <p className="m-sr-only" aria-live="polite">
        {sentence(events, properties, eventsOrder)}
      </p>
    </section>
  );
}

/** The rows as one line of English. */
function sentence(
  events: readonly SearchFilter[],
  properties: readonly SearchFilter[],
  order: EventsOrder,
): string {
  if (!events.length && !properties.length) return 'Every session';
  const parts: string[] = [];
  if (events.length) parts.push(events.map(describeFilter).join(` ${order} `));
  if (properties.length) parts.push(properties.map(describeFilter).join(' and '));
  return parts.join(', ');
}

/** An example sentence. Clicking it runs the same translator the picker's field
 *  runs, so an example is a demonstration rather than a shortcut with its own
 *  code path. */
function ExampleChip({ text, onUse }: { text: string; onUse: (f: SearchFilter[]) => void }) {
  return (
    <button type="button" className="m-sc__example" onClick={() => onUse(translate(text).filters)}>
      {text}
    </button>
  );
}
