import { useEffect, useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { ListFilter } from 'lucide-react';
import {
  describeRules,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { ChevronDown } from 'lucide-react';
import { FilterPicker } from './FilterPicker.tsx';
import { SearchRow } from './SearchRow.tsx';
import { useFilterCollapse } from './useFilterCollapse.ts';
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
  /** The sessions the value counts are computed against.
   *
   *  ⚠ THIS AND THE RESULT ARE TWO DIFFERENT NUMBERS, and they were one prop
   *  for a day. On the page they happen to coincide - the pool is the filtered
   *  list, so the strip's count is its length. In the segment drawer they must
   *  not: the pool there is every session in the window, because a picker that
   *  offered only the values SURVIVING the clause you are editing can never let
   *  you add a second country - France filters the list to France, and France
   *  is then the only country the picker can see. */
  rows: readonly SessionRow[];
  /** What the rules currently hold, for the strip. Defaults to `rows.length`,
   *  which is right wherever the pool and the result are the same list. */
  resultCount?: number;
  /** The controls that belong to the LIST rather than to the search - the date
   *  range and the display menu. They ride the search's own bar because the
   *  bar is what sticks: a window you cannot change without scrolling back up
   *  is the same complaint the sticky came out of. A slot rather than props,
   *  because the search has no business knowing what a date range is. */
  trailing?: ReactNode;
  /**
   * `page` is the sessions list's own filter: it sticks, it collapses itself as
   * you scroll into the results, and it carries the list's controls on its bar.
   *
   * `panel` is the SAME EDITOR inside a drawer — the segment drawer, which
   * edits a saved search and therefore edits this. Two things go, and both for
   * the same reason: a drawer is not a page, so there is nothing to scroll past
   * and nothing to get out of the way of. It does not collapse, and it has no
   * bar to hang a date range on.
   *
   * ⚠ A variant, not a second component. "The segment is just one saved search
   * so the design should be really consistent" is a claim you can only make
   * true by using the same component, and a lookalike is how the two drift.
   */
  variant?: 'page' | 'panel';
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
  resultCount,
  trailing,
  variant = 'page',
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
  const rowCount = events.length + properties.length;
  const inPanel = variant === 'panel';
  const collapse = useFilterCollapse(inPanel ? 0 : rowCount);
  /* A drawer holds still: nothing scrolls past it, so there is nothing for it
     to get out of the way of, and a collapsed rule list in a panel opened to
     edit rules is the control working against its own reason for being open. */
  const collapsed = inPanel ? false : collapse.collapsed;
  const canCollapse = inPanel ? false : collapse.canCollapse;
  const { toggle: toggleCollapsed, anchor } = collapse;

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
    <section className={`m-sc${inPanel ? ' m-sc--panel' : ''}`} aria-label="Session filter" ref={anchor}>
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
            {/* ⚠ AN SVG STROKE, not a gradient (Mehdi, 2026-09-02: "the ring
                should be a circle, and have a nice modern effect of increasing
                and decreasing the size of the arc"). A dash on a stroked path
                is measured in ARC LENGTH, which is the only model that treats
                a 1400x40 rectangle as a loop: the arc is the same length on
                the long rims and the end caps, it travels the whole perimeter,
                and its length is a number that can be animated on its own. The
                two gradients that came before could not do either - a conic
                one divides by angle, a linear one only moves sideways.

                `pathLength="100"` normalises the perimeter, so the dash figures
                below are percentages of the loop and hold at any field width. */}
            <span className="m-sc__ring" aria-hidden="true">
              <svg>
                {/* TWO PASSES OF ONE ARC. The wide, heavily blurred one is the
                    glow; the narrow, barely blurred one is the arc itself, and
                    its blur is what gives the ends a gradient instead of a
                    cap. Same dash, same keyframes, so they cannot drift. */}
                <rect className="m-sc__glow" x="0" y="0" width="100%" height="100%" rx="4" pathLength="100" />
                <rect className="m-sc__arc" x="0" y="0" width="100%" height="100%" rx="4" pathLength="100" />
              </svg>
            </span>
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

      {/* ── THE STRIP: WHAT THE FILTER SAYS, AND HOW TO PUT IT AWAY ──────────
          It used to hold Clear and nothing else, which is a whole row of height
          for one word at the far end of it (Gabriel, 2026-09-02: "the clear
          button takes a whole space in height that doesn't have anything
          else"). So it earns the row: it is the filter's own summary AND its
          disclosure.

          COLLAPSED IT PRINTS THE WHOLE FILTER AS ONE SENTENCE - the same
          `describeRules` the segments tab and the screen reader use - so
          putting the rows away never costs you knowing what they said. That is
          the difference between a collapse and hiding something.

          The count sits beside it because it is the filter's own result and
          this is the filter's own row. The footer's "1-12 of 134" is about the
          page of rows; this is about the filter. */}
      {any && (
        <div className={`m-sc__strip${collapsed ? ' is-collapsed' : ''}`}>
          {/* ⚠ THE CARET IS ALWAYS HERE now (Mehdi, 2026-09-02: "what happened
              with the collapse search, I can't see it anymore" - he had two
              clauses). It used to appear at three, because collapsing one row
              saves less height than the line replacing it costs. That is true
              and it is not the point: a control that comes and goes on a count
              nobody is tracking reads as broken, and the moment you go looking
              for it is the moment it is not there. See useFilterCollapse. */}
          {canCollapse ? (
            <button
              type="button"
              className="m-sc__toggle"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-controls="m-sc-rows"
            >
              <ChevronDown size={13} className="m-sc__caret" aria-hidden="true" />
              <span className="m-sc__summary m-truncate">
                {collapsed
                  ? describeRules(events, properties, eventsOrder)
                  : `${rowCount} ${rowCount === 1 ? 'filter' : 'filters'}`}
              </span>
            </button>
          ) : (
            <span className="m-sc__summary is-static">
              {rowCount === 1 ? '1 filter' : `${rowCount} filters`}
            </span>
          )}
          <span className="m-sc__count">
            {resultCount ?? rows.length} {(resultCount ?? rows.length) === 1 ? 'session' : 'sessions'}
          </span>
          {/* TWO events, not one: with a single event there is no gap for an
              operator to sit in, and a control that cannot change the result is
              a control that teaches you to ignore controls. */}
          {/* Hidden while collapsed: it edits a relationship between rows you
              cannot see, and the summary already prints the word. */}
          {events.length > 1 && !collapsed && (
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
      {any && !collapsed ? (
        <div className="m-sc__list" id="m-sc-rows">
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
          `describeRules` the segments tab prints, so the sentence a
          screen reader hears and the sentence a segment shows are one
          sentence. */}
      <p className="m-sr-only" aria-live="polite">
        {describeRules(events, properties, eventsOrder)}
      </p>
    </section>
  );
}
