import { useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { Filter } from 'lucide-react';
import {
  describeRules,
  type CatalogueEntry,
  type EventsOrder,
  type SearchFilter,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { ChevronDown } from 'lucide-react';
import { FilterPanel } from './FilterPanel.tsx';
import { SearchRow } from './SearchRow.tsx';
import { useFilterCollapse } from './useFilterCollapse.ts';
import { useTorch } from './useTorch.ts';
import { EVENTS_HEAD, GROUP_HEAD, GROUP_SCOPE } from './vocabulary.ts';
import './search-card.css';

/* ── WHAT THE BUTTON SAYS ─────────────────────────────────────────────────────
   ONE WORD ON THE BUTTON, and a full sentence only where a screen reader will
   hear it. The button is 14px of chrome beside a date range; a sentence on it
   would make it a bar again by another route.

   ⚠ THE ROTATING EXAMPLES ARE GONE, for the second time and now for a better
   reason. The first pair (09-02) rotated prose you were invited to TYPE, and
   came out because the control cannot read a sentence. The second (09-04) sat
   after the word "like" as specimens of what a filter can express, which was
   honest - but Mehdi's objection to the bar is that a field-shaped control
   invites typing AT ALL, and an example after "like" is an invitation with a
   worked demonstration attached. A button with one word invites a click.

   ⚠ AND THE NATURAL-LANGUAGE PATH IS STILL PARKED, NOT CUT (Mehdi, 09-02: it
   is a feature OpenReplay shipped and removed, so putting it back is out of
   scope, and he is warm on it later - "today you would ask an LLM"). WHAT
   STAYED: `translate()` and the picker's whole sentence path, untouched, in
   `sessions-logic.ts`. `onTranslate` is optional and gates all of it, so the
   feature is ONE PROP from returning. */
const LABEL = 'Filter';

/** The full sentence, for the accessible name and the drawer's own heading. */
const LEAD = 'Filter the recordings';

/** ⚠ THE SAME CONTROL IN THE SEGMENT DRAWER, in that drawer's own words. "The
 *  recordings" points at a list, and in a drawer there is no list to point at:
 *  you are saying which recordings the segment will hold. */
const LEAD_PANEL = 'Say which recordings this segment holds';

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
      {/* ── THE TRIGGER IS A BUTTON. IT WAS A BAR FOR A DAY. ────────────────
          ⚠ AND THE BAR WAS A KNOWN FAILURE, not a matter of taste. Mehdi,
          2026-09-03: *"I like this thing of events and group filters, but
          probably we can make it as a button. I WOULDN'T PUT IT AS A BAR. We
          tried the bar before. People sometimes they type into the bar,
          they're expecting to see results in there - which we used to have at
          some point, but for technical reasons it adds much more overhead."*

          OpenReplay shipped a bar, people typed into it, and it was removed.
          Everything a field-shaped control communicates is an invitation to
          type, and this one cannot take text: it opens a menu. The 09-04
          version made that worse rather than better by adding a rotating
          example after the word "like", which is the exact invitation he was
          describing.

          So it is a button, drawn as one: a funnel, a word, and the accent.
          *"You can have a nice button like this funnel... and have it in blue
          or in something obvious."* This is the one place on the page the
          accent is spent, which is the app's rule and also his instruction.

          WHAT THE BAR WAS FOR is not lost. The claim was never that the
          control should be large - it was that there should be ONE of them,
          and there still is.

          ⚠ THE TORCH STAYS. Gabriel picked it hours before the bar was
          rejected, and it is size-independent: the rim is masked to a radius
          around the pointer, which opens as you approach. It reads better on a
          small target than it did on a 1400px one, because a light that finds
          a small thing is doing something a hover state cannot.

          ── ⚠ AND IT NEVER RETIRES. IT DID, FOR ONE MORNING. ───────────────
          It used to vanish the moment there was a rule, and each section grew
          its own Add - which made sense while the button opened a FORK, because
          a second visit to a fork is a second click on a question you have
          already answered. The fork is gone (see FilterPanel), and the reason
          went with it.

          Gabriel, 2026-09-04: *"when the list appears, we should keep having a
          single Add button - they won't be divided into two Add buttons."*

          Two Adds is the thing Mehdi objected to in the first place. Putting one
          at the foot of each section made them read as belonging to their
          section rather than as a choice between kinds, which is a real
          improvement on production - and it is still two controls doing one job,
          in a component whose whole premise is that there is ONE door. A control
          that moves house when the list fills is also a control you have to
          find twice.

          So: one button, one place, always. The date range and the display menu
          keep it company on that row whatever the filter holds. */}
      <div className="m-sc__bar">
        <div className="m-sc__triggerwrap">
          <button
            type="button"
            className="m-sc__filter"
            onClick={() => setFork(true)}
            aria-expanded={fork}
            aria-haspopup="dialog"
            aria-label={lead}
          >
            {/* ⚠ AN SVG STROKE rather than a border: a stroke can be blurred
                without blurring what it surrounds, and the glow is half the
                effect. */}
            <span className="m-sc__ring" ref={torch as React.RefObject<HTMLSpanElement>} aria-hidden="true">
              <svg>
                {/* TWO PASSES OF THE WHOLE PERIMETER. The wide, heavily
                    blurred one is the glow; the narrow, barely blurred one is
                    the rim. Neither is dashed - the MASK decides what shows. */}
                <rect className="m-sc__glow" x="0" y="0" width="100%" height="100%" rx="4" />
                <rect className="m-sc__arc" x="0" y="0" width="100%" height="100%" rx="4" />
              </svg>
            </span>
            <Filter size={14} className="m-sc__filter-glyph" aria-hidden="true" />
            <span className="m-sc__filter-word">{LABEL}</span>
          </button>
          {/* ⚠ NO `onTranslate` ANYWHERE. That one prop is the sentence path's
              only switch, so the parked feature stays parked and intact. */}
          <FilterPanel
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
          {/* ⚠ AND IT CAME BACK HERE, the same day (Gabriel, 2026-09-04: "you
              also have removed the events order, then and and or - go back to
              what it was").

              It had moved to the Events heading on the argument that production
              keeps it there (`FilterListHeader`, right-aligned above the event
              rows) and that it edits a relationship between the EVENT rows, so
              it belongs over them. Both true, and both beaten by what actually
              happened: it could not be found. A heading is a label, and a
              control parked at the end of one reads as part of the label -
              two quiet words and a dropdown, beside a quiet Add.

              On the strip it is on the row that speaks for the whole filter,
              next to the count it changes. That row is where you look to find
              out what the filter is doing, which is exactly when the
              conjunction matters.

              TWO events, not one: with a single event there is no gap for an
              operator to sit in, and a control that cannot change the result
              teaches you to ignore controls. Hidden while collapsed, because it
              edits a relationship between rows you cannot see and the summary
              already prints the word. */}
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
                   repeats its own explanation is twice as wide as it needs. */
                labelRender={({ value }) => <span>{String(value)}</span>}
                aria-label="How the events relate"
              />
            </span>
          )}

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
          {/* ⚠ BOTH HEADINGS, ALWAYS, once the search has anything in it. The
              structural reason went away with the section Adds - a heading no
              longer has to exist for its Add to be reachable - and the design
              reason it was built on is the one that mattered anyway: a reader
              cannot otherwise tell WHICH SCOPE a row has, and an empty section
              says "nothing here yet" rather than leaving you to wonder whether
              the kind exists at all.

              Production draws both always too, which is the second-best
              argument for anything in this component. */}
          <div className="m-sc__head">
            <span className="m-sc__head-name">{EVENTS_HEAD}</span>
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

/* ⚠ `AddTo` LIVED HERE - production's own small Add beside each heading, one
   per kind - and came out on 2026-09-04 with the fork it was serving. It was
   the right shape for a two-door design and the wrong one for a single-door
   design, which is what this is. `git show fc3f12f` has it. */
