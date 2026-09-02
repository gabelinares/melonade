import { useEffect, useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { ListFilter } from 'lucide-react';
import {
  describeFilter,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { FilterPicker } from './FilterPicker.tsx';
import { SearchRow } from './SearchRow.tsx';
import './search-card.css';

/* ── THE PLACEHOLDER ─────────────────────────────────────────────────────────
   IT IS NOT A SEARCH BAR AND IT IS NOT CALLED SEARCH (Gabriel, 2026-09-02:
   "it's still really looking like a search bar, and that's something else, and
   I don't even like to call it search - maybe it's just a field with a very
   nice objective concise placeholder, maybe we can rotate examples").

   He is right about the word. You are not searching a corpus, you are SAYING
   WHICH SESSIONS YOU WANT - a description that then becomes rows you can edit.
   So the magnifier went, because a magnifier IS the search signal; the "reads
   plain English" badge went; and the row of example pills went with them.

   WHAT REPLACED ALL THREE IS THE PLACEHOLDER. A fixed lead that never changes,
   so the field always says what it is for, and one example that rotates, so it
   teaches the half nobody expects without a badge, a row of pills, or a word of
   explanation. Everything those three were doing, done by the one thing you
   were going to read anyway.

   Every example really translates - `sessions-check` runs all of them - because
   a placeholder promising something the field cannot do is worse than a
   placeholder that promises nothing. */
const LEAD = 'Describe the sessions you want';

const EXAMPLES: readonly string[] = [
  'paid users who hit an error',
  'mobile sessions with rage clicks',
  'trials that reached checkout',
  'anyone who bounced off the cart',
  'long sessions on Safari',
];

/** 4.2s: long enough to read a sentence and look away, short enough that a
 *  second one arrives before you have stopped noticing the field. */
const ROTATE_MS = 4200;

/**
 * The example the placeholder is currently showing.
 *
 * IT PAUSES WHILE YOU ARE THERE. Text that changes under a cursor aiming at it
 * is the most irritating thing a placeholder can do, and somebody hovering is
 * somebody reading.
 *
 * It does not rotate at all under `prefers-reduced-motion`. A cycling line of
 * text is motion in every sense that matters, whatever the spec counts.
 */
function useRotatingExample(paused: boolean): string {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = window.setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return EXAMPLES[i]!;
}

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
 * THE FILTER — ONE FIELD, ONE LIST.
 *
 * ⚠ IT IS NOT CALLED SEARCH. Gabriel, 2026-09-02: "I don't even like to call it
 * search." He is right - you are not searching a corpus, you are saying which
 * sessions you want, and what comes back is a description you can edit rather
 * than a result set. Every word a reader sees says filter or describe.
 *
 * The `m-sc` prefix and this file's name predate that call and are left alone
 * deliberately: renaming a prefix across four stylesheets, five components and
 * a check suite to change a word nobody sees is churn, and a half-done rename
 * is worse than an old one.
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

  /* Hovered or focused: the placeholder stops rotating while you are reading
     it. See useRotatingExample. */
  const [here, setHere] = useState(false);
  const example = useRotatingExample(here);

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
    <section className="m-sc" aria-label="Session filter">
      {/* ── THE FIELD ─────────────────────────────────────────────────────────
          THE MOST IMPORTANT THING ON THE PAGE, and now drawn like it: the
          tallest control here, the only one at 14px, and the only one that gets
          the ring. Everything that was competing with it is gone - the
          magnifier, the "reads plain English" badge, the row of example pills -
          so what is left is a field and a sentence.

          THE GLYPH IS A FILTER AND NOT A MAGNIFIER. That one swap is most of
          what stopped this reading as a search bar: a magnifier IS the search
          signal, and this control narrows a list rather than searching a
          corpus.

          THE RING is the one piece of expression here. It sweeps around the
          field on hover and on focus - a slow conic pass, mostly the border's
          own grey with a single accent arc in it - because this field is where
          the agent will live, and a control that is about to start answering
          questions should look like it is listening. Not on at rest: a
          permanently animated border is a page you cannot read.

          Still a `<button>`, because it opens a menu and holds no text of its
          own. It is DRAWN as a field. */}
      <div className="m-sc__bar">
        <FilterPicker taken={takenProperties} onPick={onAdd} onTranslate={onAddMany}>
          <button
            type="button"
            className="m-sc__field"
            /* The rotating example goes in the accessible name too, or the
               field says less to a screen reader than it does on screen. */
            aria-label={`${LEAD}. For example, ${example}`}
            onMouseEnter={() => setHere(true)}
            onMouseLeave={() => setHere(false)}
            onFocus={() => setHere(true)}
            onBlur={() => setHere(false)}
          >
            <span className="m-sc__ring" aria-hidden="true" />
            <ListFilter size={16} className="m-sc__field-glyph" aria-hidden="true" />
            {/* The lead never moves and the example is keyed on itself, so only
                the example crossfades. A placeholder whose whole line changed
                every four seconds would be a page with a pulse. */}
            <span className="m-sc__field-text" aria-hidden="true">
              <span className="m-sc__lead">{LEAD}</span>
              <span className="m-sc__eg" key={example}>, like “{example}”</span>
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
      ) : null}
      {/* ⚠ NO EMPTY STATE, and no row of example pills (Gabriel, 2026-09-02:
          "remove the examples pill and row, make the field the most important
          part"). They were doing the placeholder's job in a second place, and
          twice the surface for one idea is what made the field read as one
          control among several rather than as THE control. An empty filter is
          simply a field. */}

      {/* THE FILTER, IN WORDS. Off-screen, and live: the rows ARE the filter, so
          a change to them has to be announced as a change to the whole thing
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
