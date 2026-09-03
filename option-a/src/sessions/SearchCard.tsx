import { useEffect, useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { ListFilter } from 'lucide-react';
import {
  catalogueNow,
  describeRules,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { ChevronDown, Plus } from 'lucide-react';
import { FilterPicker } from './FilterPicker.tsx';
import { FilterFork } from './FilterFork.tsx';
import { SearchRow } from './SearchRow.tsx';
import { useFilterCollapse } from './useFilterCollapse.ts';
import { useTorch } from './useTorch.ts';
import { EVENTS_HEAD, GROUP_HEAD, GROUP_SCOPE } from './vocabulary.ts';
import './search-card.css';

/* ── THE PLACEHOLDER ─────────────────────────────────────────────────────────
   ⚠ IT NO LONGER OFFERS PROSE, AND THE FEATURE IS PARKED RATHER THAN CUT
   (Mehdi, 2026-09-02): *"'Describe the sessions you want' - we used to have it
   as a feature. We removed it. So we won't have something like this. It's a new
   feature. We can have it. Not saying we don't."*

   So this is not a rejection. It is out because **it is a feature OpenReplay
   once shipped and removed**, and the whole scope this week forbids adding
   features. He is warm on it for later and said why it is cheap now: two years
   ago it needed a trained model, *"today you would ask an LLM."*

   WHAT WENT: the rotating example, the `useRotatingExample` hook, and the
   `onTranslate` prop at the callsite. WHAT STAYED: `translate()` and the
   picker's whole sentence path, untouched, in `sessions-logic.ts` -
   `onTranslate` is optional and gates all of it, so the feature is ONE PROP
   from returning. Deleting it would have thrown away the part that is hard.

   The field says what it does and nothing else. A control that promises a
   sentence and cannot read one is worse than a plain button, which is the
   whole reason this line is now four words long. */
const LEAD = 'Filter the recordings and save search segments, like';

/** ⚠ THE SAME COPY IN THE SEGMENT DRAWER, in that drawer's own words. It is
 *  the same control doing the same job, so it says the same thing - but "these
 *  sessions" points at a list, and in a drawer there is no list to point at:
 *  you are saying which sessions the segment will hold. One word changes and
 *  the sentence keeps its shape. */
const LEAD_PANEL = 'Say which recordings this segment holds, like';


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
  /** ⚠ KEPT AND CURRENTLY UNUSED, deliberately. It is what the sentence path
   *  hands its whole translation to, and passing it to `FilterPicker` as
   *  `onTranslate` is the single switch that turns that path back on. The
   *  callers still supply it; the card stopped forwarding it on 2026-09-02.
   *  See the note above LEAD. */
  onAddMany?: (filters: SearchFilter[]) => void;
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
  /** Saving the current rules as a segment. It rides the STRIP, beside Clear
   *  (Gabriel, 2026-09-04) - and the strip is the right home for it because the
   *  strip exists only when there are rules to save. In the page header it was
   *  a control that spent most of its life disabled, explaining in a tooltip
   *  that you had not built a filter yet; here it cannot be reached before it
   *  is true. The two verbs also belong together: this row is where you keep
   *  what you built and where you throw it away. */
  saveAction?: ReactNode;
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
  saveAction,
  variant = 'page',
}: SearchCardProps) {
  const [fork, setFork] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number | null; at: 'top' | 'bottom' | null }>({
    from: -1,
    over: null,
    at: null,
  });

  const any = events.length > 0 || properties.length > 0;
  /* The ring answers to the pointer rather than to a clock, and only while the
     bar exists - once there is a rule the bar retires and the listener with
     it, so a page of results is not measuring pointer distance to a control
     that is not on it. See useTorch. */
  const torch = useTorch(!any);
  const takenProperties = properties.map((f) => f.entryId);
  const rowCount = events.length + properties.length;
  const inPanel = variant === 'panel';
  const lead = inPanel ? LEAD_PANEL : LEAD;
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

          THE RING is the one piece of expression here, and since 09-04 it
          answers to the pointer rather than to a clock: the whole rim is drawn
          and a radial mask reveals only the stretch near your cursor, opening
          as you APPROACH rather than when you land. A control that animates on
          its own schedule is a control that is talking; one that lights where
          your hand is going is one that is listening. Nothing at rest, nothing
          moving unless you are.

          Still a `<button>`, because it opens a menu and holds no text of its
          own. It is DRAWN as a field. */}
      {/* ── THE BAR RETIRES ONCE THE SEARCH HAS SOMETHING IN IT ─────────────
          (Gabriel, 2026-09-04: "after the filter and event was added there
          should also exist the two adds in their sections, so the user doesn't
          need to click at the bar again - actually the bar vanishes and only
          appears after deleting or clearing.")

          It is the right trade and it is what makes the FORK affordable. A
          fork step charges a click every time you add anything, which is the
          standing objection to one; here it is charged once, on the empty
          search, when a reader is least oriented - and from the second clause
          on you add from the section you are adding TO, which is nearer, more
          specific and needs no choice made in advance.

          ⚠ THE DATE RANGE AND THE DISPLAY MENU DO NOT RETIRE WITH IT. They are
          the LIST's controls riding the search's bar, and they move down to the
          strip, which becomes the top row of the well the moment the bar goes.
          So they hold the same corner of the same surface either way: nothing
          about the window moves when you add your first filter. */}
      {!any && (
      <div className="m-sc__bar">
        <div className="m-sc__fieldwrap">
          <button
            type="button"
            className="m-sc__field"
            onClick={() => setFork(true)}
            aria-expanded={fork}
            aria-haspopup="dialog"
            aria-label={lead}
          >
            {/* ⚠ STILL AN SVG STROKE rather than a border, and now for one
                reason rather than three: a stroke can be blurred without
                blurring what it surrounds, and the glow is half the effect.
                The dash, the arc length and the `pathLength` normalisation all
                went with the travelling animation they served. */}
            <span className="m-sc__ring" ref={torch as React.RefObject<HTMLSpanElement>} aria-hidden="true">
              <svg>
                {/* TWO PASSES OF THE WHOLE PERIMETER. The wide, heavily
                    blurred one is the glow; the narrow, barely blurred one is
                    the rim. Neither is dashed any more - the MASK decides what
                    is visible, so the geometry stopped needing to, and
                    `pathLength` went with the dash arithmetic it existed for. */}
                <rect className="m-sc__glow" x="0" y="0" width="100%" height="100%" rx="4" />
                <rect className="m-sc__arc" x="0" y="0" width="100%" height="100%" rx="4" />
              </svg>
            </span>
            <ListFilter size={16} className="m-sc__field-glyph" aria-hidden="true" />
            <span className="m-sc__field-text" aria-hidden="true">
              <span className="m-sc__lead">{lead}</span>
              <RotatingExample />
            </span>
          </button>
          {/* ⚠ NO `onTranslate` ANYWHERE. That one prop is the sentence path's
              only switch, so the parked feature stays parked and intact. */}
          <FilterFork
            open={fork}
            onClose={() => setFork(false)}
            onPick={(e) => {
              onAdd(e);
              setFork(false);
            }}
            taken={takenProperties}
          />
        </div>
        {trailing}
      </div>
      )}

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
          {/* ⚠ THE ORDER CONTROL LEFT THIS ROW on 2026-09-04 and went to the
              Events heading, which is where production keeps it
              (`FilterListHeader`, right-aligned above the event rows). It edits
              a relationship BETWEEN THE EVENT ROWS, so it belongs over them
              rather than in a summary bar that also speaks for the group
              filters below. See `m-sc__head` in the list. */}
          {/* The list's controls, on whichever row is the top one. See the
              note above the bar. */}
          <span className="m-sc__strip-trailing">{trailing}</span>

          {saveAction}

          <Button type="text" size="small" className="m-sc__clear" onClick={onClear}>
            Clear
          </Button>
        </div>
      )}

      {/* ── THE LIST, IN PRODUCTION'S OWN TWO SECTIONS ──────────────────────
          ⚠ THE HEADINGS ARE BACK, AND THE SECOND ONE IS RENAMED (Mehdi,
          2026-09-02). Two instructions of his pull in the same direction here
          and the build had honoured neither:

            "Keep everything the same, even the layout of the search itself."
            "Not filters - we'll call them something else, like group filters."

          Production draws this as a Card holding `Events`, a Divider, and
          `Filters`, each with its own heading (`SessionFilters.tsx`). The 09-02
          build deleted both headings along with the two Add buttons - but only
          the BUTTONS were what Mehdi asked to merge. The headings were carrying
          something the buttons were not, and it is the thing he spent five
          minutes explaining: WHICH SCOPE A ROW HAS.

          ── WHY THE NAME IS THE FIX, in his words ──────────────────────────
          "People don't know right away what an event is, what a filter is." A
          filter here is not a filter on the list - it is a condition applied to
          every event above it, which production calls "a group filtering
          basically". So the heading says GROUP FILTERS and prints the scope
          under it, and the funnel on an event row says the opposite scope in
          the same voice. Two labels, one distinction, no glossary.

          ⚠ A HEADING APPEARS ONLY OVER ROWS THAT EXIST. Production shows both
          always, because each owns an Add button that has to be reachable. With
          one picker there is nothing to reach, so an empty section would be a
          heading over nothing - and the scope line under "Group filters" would
          be false, since there would be no events for it to apply to. */}
      {any && !collapsed ? (
        <div className="m-sc__list" id="m-sc-rows">
          {/* ⚠ BOTH HEADINGS, ALWAYS, once the search has anything in it -
              and that changed on 09-04 for a reason that is structural rather
              than aesthetic. Each heading now owns the ADD for its own kind,
              and a heading that appears only when its section is already
              occupied is an Add you cannot reach until you have already used
              it. Production shows both for exactly this reason.

              This is also where the fork's cost goes away: you never choose a
              kind in the abstract again, you point at the section you want the
              thing to land in. */}
          <div className="m-sc__head">
            <span className="m-sc__head-name">{EVENTS_HEAD}</span>
            <AddTo kind="events" taken={takenProperties} onPick={onAdd} />
            {/* TWO events, not one: with a single event there is no gap for an
                operator to sit in, and a control that cannot change the result
                is a control that teaches you to ignore controls. */}
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
                  /* The closed control shows the word alone; the open list
                     shows the word and what it means. A dropdown whose closed
                     state repeats its own explanation is a dropdown twice as
                     wide as it needs to be. */
                  labelRender={({ value }) => <span>{String(value)}</span>}
                  aria-label="How the events relate"
                />
              </span>
            )}
          </div>
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

          {/* Production's own Divider between its two sections. Unconditional
              now, because both sections are. */}
          <hr className="m-sc__rule" />

          <div className="m-sc__head">
            <span className="m-sc__head-name">{GROUP_HEAD}</span>
            <AddTo kind="filters" taken={takenProperties} onPick={onAdd} />
            {/* ⚠ THE SCOPE, PRINTED, and only when it is true. With no events
                above there is nothing for a group filter to apply TO, and a
                line saying otherwise would be the caption teaching the wrong
                model - which is the failure this section exists to stop. */}
            {events.length > 0 && <span className="m-sc__head-hint">{GROUP_SCOPE}</span>}
          </div>

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

/**
 * A SECTION'S OWN ADD. Production has exactly this - `FilterSelection` wrapping
 * a small "Add" beside each heading - and the 09-02 build deleted both when it
 * merged the two buttons on the bar.
 *
 * ⚠ THE TWO ARE NOT BACK SIDE BY SIDE, which is what Mehdi objected to: "we
 * have two buttons and people don't know right away what an event is, what a
 * filter is." Two buttons at the top of a card, before you have picked
 * anything, IS a question about vocabulary. The same two buttons at the foot of
 * the sections they fill are not a question at all - each one is attached to
 * the thing it makes, and the thing it makes is on screen above it.
 */
function AddTo({
  kind,
  taken,
  onPick,
}: {
  kind: 'events' | 'filters';
  taken: readonly string[];
  onPick: (entry: CatalogueEntry) => void;
}) {
  /* ⚠ THE CATALOGUE, RECUT to production's own two lists (`eventOptions` /
     `propertyOptions` in `SessionFilters`). With one kind in it the picker
     draws no kind heading, because there is nothing to disambiguate. */
  const entries = catalogueNow().filter((e) => (kind === 'events' ? e.isEvent : !e.isEvent));
  const what = kind === 'events' ? 'event' : 'group filter';
  return (
    <FilterPicker
      entries={entries}
      taken={taken}
      onPick={onPick}
      placeholder={kind === 'events' ? 'Search events' : 'Search group filters'}
    >
      <button type="button" className="m-sc__add" aria-label={`Add ${what}`}>
        <Plus size={12} aria-hidden="true" />
        <span>Add</span>
      </button>
    </FilterPicker>
  );
}

/* ── THE EXAMPLES ─────────────────────────────────────────────────────────────
   ⚠ THEY CAME BACK ON 09-04, AND THEY ARE NOT WHAT THEY WERE. The 09-02 version
   rotated prose you were invited to TYPE - "paid users who hit an error" - and
   it came out the same day because the field could not read a sentence. A
   placeholder that promises a feature the control does not have is the one kind
   of copy that is worse than none.

   These are the other thing: not input hints but SPECIMENS of what a filter can
   say, sitting after the word "like". You never type them; you read one, learn
   that this control expresses that sort of thing, and click. So the promise is
   true, and the field stays a button.

   A little more muted than the lead (Gabriel, 09-04), because the lead is the
   instruction and the example is only an illustration of it. */
const EXAMPLES: readonly string[] = [
  'rage clicks on /checkout',
  'paid accounts in France',
  'sessions over three minutes',
  'an error after checkout_start',
  'mobile users who saw the new pricing',
];
const EXAMPLE_EVERY = 4200;

function RotatingExample() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), EXAMPLE_EVERY);
    return () => clearInterval(t);
  }, []);
  return (
    /* Keyed so the fade restarts on each change; `aria-hidden` because the
       button's own label already says what it does and a rotating example read
       aloud every four seconds is a control nobody can use. */
    <span className="m-sc__eg" key={i}>
      {EXAMPLES[i]}
    </span>
  );
}
