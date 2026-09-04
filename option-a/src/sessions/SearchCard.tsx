import { useEffect, useState, type ReactNode } from 'react';
import { Button, Select, Tooltip } from 'antd';
import { Filter } from 'lucide-react';
import {
  describeRules,
  summariseRules,
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
import { EVENTS_HEAD, EVENTS_EMPTY, GROUP_HEAD, GROUP_EMPTY, GROUP_SCOPE } from './vocabulary.ts';
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

/** Once there is a rule, both shapes say the same thing: this makes another
 *  one. It is an Add at the foot of a list, which is what it now is. */
const ADD = 'Add filter';

/** ⌘ on a Mac, Ctrl everywhere else. Read once, because it cannot change. */
const HOTKEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '') ? '⌘K' : 'Ctrl K';

/** The full sentence, for the accessible name and the drawer's own heading. */
const LEAD = 'Filter the recordings';

/** ⚠ THE BAR'S OWN LEAD, and it is longer on purpose. A button is read as a
 *  label and a bar is read as a sentence: at full width "Filter" would be one
 *  word floating in 1400px, which is what makes a bar look like an empty input.
 *  It ends on "like" so the rotating specimen finishes it. */
const LEAD_BAR = 'Filter the recordings and save search segments, like';

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
  /** ⚠ NO LONGER READ, and kept because the callers still pass it and the
   *  segment drawer may want it back. The filter's row carried a session count
   *  until 2026-09-04; the result is stated by the component that holds it. */
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
  trailing,
  saveAction,
  variant = 'page',
}: SearchCardProps) {
  const [fork, setFork] = useState(false);
  /* What the catalogue's search starts with. Set when a keystroke opened the
     panel, cleared when it closes, so the next open is a clean list. */
  const [seed, setSeed] = useState('');
  const [drag, setDrag] = useState<{ from: number; over: number | null; at: 'top' | 'bottom' | null }>({
    from: -1,
    over: null,
    at: null,
  });

  const any = events.length > 0 || properties.length > 0;

  const openPanel = (typed = '') => {
    setSeed(typed);
    setFork(true);
  };
  /* The ring answers to the pointer rather than to a clock, and only while the
     bar exists - once there is a rule the bar retires and the listener with
     it, so a page of results is not measuring pointer distance to a control
     that is not on it. See useTorch. */
  /* The trigger is always on the card now, so the torch always has something
     to light. */
  const torch = useTorch(true);
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

  /* ⚠ ⌘K FROM ANYWHERE, and it is the badge's promise rather than a hidden
     extra: a control that advertises a shortcut and does not answer it is worse
     than one that advertises nothing. Skipped while you are typing somewhere
     else, because ⌘K inside a text field belongs to that field. */
  useEffect(() => {
    if (inPanel) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))) return;
      e.preventDefault();
      openPanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

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
      {/* ── THE HEAD: WHAT THE FILTER SAYS, AND WHAT IT RUNS OVER ──────────
          ⚠ ONE ROW WHERE THERE WERE TWO (2026-09-04). The card opened with a
          bar holding the trigger and the window, and carried a summary strip
          under it - two rows of chrome above the first rule. Mehdi asked for
          the opposite on 09-03: *"maybe custom range and that button for
          display on the right - maybe then you can merge with the line above it
          and then you can use less space."*

          So they are one row: what the filter says, how its events relate, the
          window it runs over, and the two verbs that dispose of it. And it is
          ALWAYS THERE, because the date window has to be reachable before there
          is anything to summarise - on an empty search it reads "Every session"
          beside the window, which is exactly true. */}
      {(
        <div className={`m-sc__strip${collapsed ? ' is-collapsed' : ''}${any ? '' : ' is-empty'}`}>
          {/* ⚠ THE CARET IS ALWAYS HERE now (Mehdi, 2026-09-02: "what happened
              with the collapse search, I can't see it anymore" - he had two
              clauses). It used to appear at three, because collapsing one row
              saves less height than the line replacing it costs. That is true
              and it is not the point: a control that comes and goes on a count
              nobody is tracking reads as broken, and the moment you go looking
              for it is the moment it is not there. See useFilterCollapse. */}
          {/* ⚠ NOTHING ON THE LEFT WHEN THERE IS NOTHING TO SAY (Gabriel,
              2026-09-04: "remove the 'Every session' copy of the filter
              component, making the button the only thing in the container").

              It printed "Every session" for one build, on the reasoning that a
              row saying what the filter currently means is exactly true. It is
              true and it is not worth a line: it restates the absence of a
              filter to somebody who can see there is no filter, next to a
              button whose whole job is to make one. */}
          {!any ? null : (
            /* ⚠ THE SUMMARY IS A COUNT, NOT A SENTENCE (Gabriel, 2026-09-04:
                "make the closed version a better summary - maybe just the
                number of events and filters, in a way that the width of the
                collapsed version is always the same").

                It printed `describeRules`, on the argument that collapsing
                something should never cost you knowing what it said. Right
                argument, wrong instrument: a real error filter carries a
                serialised response, so the ellipsis landed inside a JSON blob
                and ate the clauses you had not read yet - and the row was a
                different width every time you met it, which is the one thing a
                collapsed state must not be.

                THE SENTENCE MOVED TO THE TOOLTIP, where length costs nothing.
                Nothing is hidden; it is one hover away instead of truncated in
                place. See `summariseRules`. */
            <Tooltip
              title={describeRules(events, properties, eventsOrder)}
              mouseEnterDelay={0.4}
              placement="bottomLeft"
            >
              {canCollapse ? (
                <button
                  type="button"
                  className="m-sc__toggle"
                  onClick={toggleCollapsed}
                  aria-expanded={!collapsed}
                  aria-controls="m-sc-rows"
                >
                  <ChevronDown size={13} className="m-sc__caret" aria-hidden="true" />
                  <span className="m-sc__summary">{summariseRules(events, properties)}</span>
                </button>
              ) : (
                <span className="m-sc__summary is-static">{summariseRules(events, properties)}</span>
              )}
            </Tooltip>
          )}

          {/* ⚠ THE RESULT COUNT LEFT THIS ROW (Gabriel, 2026-09-04: "remove
              the sessions count from the filter bar, leave only the number of
              events and filters").

              It was here on the argument that a filter should say what it
              caught. It should - and it already does, twice: the table's footer
              prints "1-12 of 134" and the issue-type strip prints a count per
              kind, both of them one component below and both about the same
              set. Three counts of one thing is how a reader learns to check
              which one is lying.

              What is left on this row is the only count the RESULT cannot give
              you: how many clauses produced it. */}
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

      {/* ── THE TRIGGER, FIRST ON THE ROW ────────────────────────────────
          ⚠ IT HAS BEEN IN THREE PLACES IN ONE DAY, and the third is the one
          that agrees with the rest of the app. It opened the card (a search
          bar's position), then moved to the FOOT (an Add's position), and now
          sits at the head's right end - "move the filter icon to the right,
          aligned on the top right of the table" (Gabriel, 2026-09-04).

          ⚠ AND FOURTH: THE LEFT END OF THAT ROW (Gabriel, 2026-09-04: "the
          button, on the button version, is on the left, not right - it's just
          this case"). The other lists put their filter at the top right because
          there it is one control among four on a toolbar. Here it is THE
          control, and the thing on the right is the WINDOW it runs over - so the
          row reads in the order you build in: what you are asking for, then over
          what period, then what to do with the answer.

          ⚠ FIRST IN THE DOM TOO, not shuffled into place with `order`: it is the
          first thing you reach by keyboard on this card, and a row whose tab
          order disagrees with its reading order is a row that works for nobody
          looking at it.

          ⚠ AND THE BAR SHARES THE ROW rather than wrapping under it. It took a
          line of its own while the trigger was on the right, because a
          full-width control and a right-hand cluster cannot both have the row.
          With the trigger on the left, "full width" simply means "the width the
          window leaves it". One row in both shapes.

          ── TWO SHAPES, ONE CONTROL (prototype panel → "Filter entry") ──────
          Mehdi killed the bar on 09-03 with a reason worth respecting - "we
          tried the bar before, people type into the bar, they're expecting to
          see results" - and Gabriel liked it. So both are built and switchable,
          and the argument gets settled by looking rather than by remembering.

          ⚠ AND THE BAR'S FAILURE MODE IS FIXED RATHER THAN ARGUED WITH. Typing
          into it now DOES something: the first character you type opens the
          catalogue with that character already in its search. So the bar is a
          launcher rather than a field that ignores you, which is the honest
          answer to "people type into it" - and the ⌘K badge says so before you
          try. Both shapes take it; only the bar looks like it might. */}
      <div className="m-sc__triggerwrap">
        <button
          type="button"
          className="m-sc__filter"
          onClick={() => openPanel()}
          /* A printable character with no modifier opens the panel and goes
             into its search. `key.length === 1` is the whole test: every
             named key ("Enter", "Tab", "ArrowLeft") is longer. */
          onKeyDown={(e) => {
            if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
            e.preventDefault();
            openPanel(e.key);
          }}
          aria-expanded={fork}
          aria-haspopup="dialog"
          aria-label={any ? ADD : inPanel ? LEAD_PANEL : LEAD}
        >
          {/* ⚠ AN SVG STROKE rather than a border: a stroke can be blurred
              without blurring what it surrounds, and the glow is half the
              effect. The torch is on BOTH shapes - it is a mask around a
              pointer and knows nothing about the box it is masking. */}
          <span className="m-sc__ring" ref={torch as React.RefObject<HTMLSpanElement>} aria-hidden="true">
            <svg>
              <rect className="m-sc__glow" x="0" y="0" width="100%" height="100%" rx="4" />
              <rect className="m-sc__arc" x="0" y="0" width="100%" height="100%" rx="4" />
            </svg>
          </span>
          <Filter size={14} className="m-sc__filter-glyph" aria-hidden="true" />
          {/* BOTH COPIES ARE RENDERED AND CSS PICKS ONE, the same trick the
              avatar uses for its two themes: the shape is a data attribute on
              the root, so it cannot be read in JS without giving the switch a
              second code path that can disagree with the first. */}
          <span className="m-sc__filter-word" aria-hidden="true">{any ? ADD : LABEL}</span>
          <span className="m-sc__barcopy" aria-hidden="true">
            <span className="m-sc__lead">{any ? ADD : inPanel ? LEAD_PANEL : LEAD_BAR}</span>
            {!any && <RotatingExample />}
          </span>
          <kbd className="m-sc__key" aria-hidden="true">{HOTKEY}</kbd>
        </button>
        {/* ⚠ NO `onTranslate` ANYWHERE. That one prop is the sentence path's
            only switch, so the parked feature stays parked and intact. */}
        <FilterPanel
          open={fork}
          seed={seed}
          onClose={() => {
            setFork(false);
            setSeed('');
          }}
          onPick={(e) => {
            onAdd(e);
            setFork(false);
          }}
          taken={takenProperties}
        />
      </div>

          {/* ── THE RIGHT-HAND CLUSTER ────────────────────────────────────
              ⚠ SAVE COMES FIRST, AND THE WINDOW LAST (Gabriel, 2026-09-04:
              "change the Save as segment and the Past 30 days order, because
              the segment isn't saved with the date - it might be confusing").

              He is right, and the reason is stronger than the ordering: A
              SEGMENT DOES NOT STORE ITS WINDOW. It holds rules, and the window
              belongs to whichever list you later open it in - so Save sitting
              immediately after "Past 30 days" read as a caption on it, as if
              the thirty days were part of what you were about to keep.

              Putting the window at the far end breaks that adjacency and leaves
              the row reading in the order you actually work: build it, keep it,
              and separately choose the period you are looking at. */}
          <span className="m-sc__head-trailing">
            {/* ⚠ CLEAR IS RIGHT-ALIGNED WITH THE REST (Gabriel, 2026-09-04:
                "the Clear button should always be aligned in the right part,
                not in a random place").

                It sat after the summary, on the argument that it undoes the
                thing the summary describes - which put it at a different
                horizontal position for every filter, because the summary's
                width was the filter's width. That was already the wrong side of
                the trade before the summary became a count, and it is plainly
                wrong now: a destructive verb should be somewhere you can find
                without reading, and "wherever the sentence happens to end" is
                the opposite of that.

                It leads the cluster rather than closing it, so the two verbs
                that DISPOSE of a filter stay together and the window - which
                belongs to neither - stays at the far end. */}
            {any && (
              <Button type="text" size="small" className="m-sc__clear" onClick={onClear}>
                Clear
              </Button>
            )}
            {/* Saving is only possible once there is something to save. */}
            {any && saveAction}
            {trailing}
          </span>
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
          {/* ⚠ A SUBTLE EMPTY STATE, because both headings exist whenever the
              filter does (Gabriel, 2026-09-04). A heading over nothing reads as
              a section that failed to load; a line saying what the absence
              MEANS reads as a section you have not used yet. */}
          {events.length === 0 && <p className="m-sc__none">{EVENTS_EMPTY}</p>}
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

          {properties.length === 0 && <p className="m-sc__none">{GROUP_EMPTY}</p>}
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

/* ── THE EXAMPLES ─────────────────────────────────────────────────────────────
   ⚠ THIRD LIFE, AND ONLY IN THE BAR. The 09-02 pair rotated prose you were
   invited to TYPE and came out because the control could not read a sentence.
   The 09-04 pair sat after the word "like" as SPECIMENS of what a filter can
   express, and came out with the bar itself.

   They are back because the bar is back as an option - and because the thing
   that made them dishonest is fixed: typing at this control now opens the
   catalogue with your keystroke in its search. An example after "like" is no
   longer a promise the control breaks.

   Still specimens rather than input hints: you read one, learn that this
   control expresses that sort of thing, and click. A little more muted than the
   lead, because the lead is the instruction and this illustrates it. */
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
  /* Keyed so the fade restarts on each change. */
  return (
    <span className="m-sc__eg" key={i}>
      {EXAMPLES[i]}
    </span>
  );
}
