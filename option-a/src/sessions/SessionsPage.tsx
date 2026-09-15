import { Button, Dropdown, Tabs, Tooltip } from 'antd';
import {
  Angry,
  BookOpen,
  CircleAlert,
  MessageCircleWarning,
  MoreHorizontal,
  Settings2,
  Share2,
  Skull,
  WifiOff,
} from 'lucide-react';
import {
  FIELD_CHOICES,
  ISSUE_TABS,
  SORT_CHOICES,
  columnSortOf,
  entryOf,
  issueTypeCount,
  sortKeyOf,
  type SessionDisplay,
  type SessionField,
  type SessionTab,
  type SessionTag,
} from '@shared/sessions-logic.ts';
import type { useSessions } from '../state/useSessions.ts';
import { DateRange } from '../components/DateRange.tsx';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { DisplayShell, MenuSelect } from '../components/DisplayMenu.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { SearchCard } from './SearchCard.tsx';
import { SegmentDrawer } from './SegmentDrawer.tsx';
import { SegmentsPanel } from './SegmentsPanel.tsx';
import { SessionReplay } from './SessionReplay.tsx';
import { SessionTable } from './SessionTable.tsx';
import './sessions-page.css';

/* ⚠ PRODUCTION'S OWN GLYPHS, from `SessionTags.tsx`'s `tagIcons` map. Reused
   rather than re-chosen: which icon means "rage" is a decision this product
   already made, and picking a different one would make the same word mean two
   things across two builds of the same app. `all` gets none - it is the empty
   selection, not a kind of issue. */
const ISSUE_ICONS: Partial<Record<SessionTag, typeof CircleAlert>> = {
  js_exception: CircleAlert,
  bad_request: WifiOff,
  click_rage: Angry,
  tap_rage: Angry,
  crash: Skull,
  incident: MessageCircleWarning,
};

const iconFor = (t: SessionTag) => {
  const Icon = ISSUE_ICONS[t];
  return Icon ? <Icon size={13} aria-hidden="true" /> : undefined;
};

/** Written out rather than inlined so the control and its type agree: the
 *  three values are `SessionDisplay['viewed']`, and an inline array of object
 *  literals widens to `string`. */
const WATCHED_CHOICES: ReadonlyArray<{ value: SessionDisplay['viewed']; label: string }> = [
  { value: 'show', label: 'Show all' },
  { value: 'hide', label: 'Hide watched' },
  { value: 'only', label: 'Only watched' },
];

export interface SessionsPageProps {
  model: ReturnType<typeof useSessions>;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SESSIONS.
 *
 * ── THE LIST IS A TABLE ────────────────────────────────────────────────────
 * Production draws each session as a four-zone card: the user on the left, then
 * time and events, then country and browser and OS, then the play button. It is
 * about 84px tall, so seven sessions fill a screen, and NOTHING in it lines up
 * vertically - every zone is a percentage width with its own two-line stack, so
 * "47 events" on one row sits above "12 events" on the next by a few pixels and
 * you cannot compare a column you cannot scan.
 *
 * Three things a table buys, and each one is a real complaint answered:
 *
 * 1. **Figures line up.** Events, errors, pages and duration are tabular
 *    numerals in right-aligned columns, so scanning for the busy session is
 *    reading a column rather than hunting a grid.
 * 2. **Columns sort.** Production has a sort dropdown with four options; a
 *    table header sorts by whatever it shows, so "most errors" stops being a
 *    thing the dropdown has to have thought of.
 * 3. **`errorsCount` and `pagesCount` finally appear.** Both are in the list
 *    payload today and neither is drawn anywhere. That is the single cheapest
 *    win in this whole redesign: no endpoint changes, two more columns.
 *
 * ── AND ONE THING IT DELIBERATELY DOES NOT DO ──────────────────────────────
 * There is no thumbnail and no per-session journey strip, because the list
 * payload carries neither. Both were considered and both would need a new
 * endpoint, which is the one thing this exercise is not allowed to ask for.
 *
 * ── NO DOT ON A SESSION ROW (Mehdi, 2026-09-04) ────────────────────────────
 * ⚠ THE ONE EXCEPTION to the app's dot-means-new convention, and it is an
 * exception of scale rather than of taste. Issues and Synthetics carry the 5px
 * mark because a new row there is an event - dozens of rows, and the ones you
 * have not seen are the ones to look at. A sessions list at production volume
 * is hundreds of thousands of rows an hour, and every one of them is new when
 * you open the page: "it's all going to look like this all the time, so that
 * dot doesn't bring anything." A mark that is on every row marks nothing.
 *
 * What says "viewed" instead is the row itself: an unviewed row is drawn at
 * full strength, a viewed one at 70% (`.m-ss__row.is-viewed`), and the one you
 * came back from wears the "Last viewed" chip. The slot the dot occupied went
 * with it, so the avatar is the row's first thing.
 *
 * ── BOOKMARKS IS A TAB, NOT A FILTER ───────────────────────────────────────
 * It is a different list of the same thing, reached by its own route in
 * production, so it belongs in the page's `tabs` strip beside "All". A section
 * replaces the body; a filter narrows it. The search, the columns and the date
 * range all keep working inside it, which is what makes it a tab and not a
 * separate page.
 * ════════════════════════════════════════════════════════════════════════════
 */
/* ── WHAT EACH OF THE THREE IS, IN ITS OWN WORDS ─────────────────────────────
   One table rather than three ternaries in the header, because the three
   sentences only make sense read against each other: each says what its list
   holds and how it got there, and the differences are the point. */
const SECTION: Record<SessionTab, { title: string; sub: string }> = {
  all: {
    title: 'Sessions',
    sub: 'Every session the tracker recorded on this project. Say what you are looking for, then watch the ones that matter.',
  },
  bookmarks: {
    title: 'Bookmarks',
    sub: 'The sessions you marked to come back to. The search, the columns and the window all still work in here.',
  },
  segments: {
    title: 'Segments',
    sub: 'Saved searches. Each one is the same set of rules the search above builds, kept under a name so a list of sessions can be asked for again.',
  },
};

export function SessionsPage({ model }: SessionsPageProps) {
  const { display } = model;
  /* ⚠ THE ROW'S HUE COMES FROM THE ROBOT, not from a hash of the same seed -
     see useAvatarHue.ts for why that distinction is the whole feature. One call
     for the page; the rows read the map. */
  const has = (f: SessionField) => display.fields.includes(f);

  const empty = (
    <EmptyState
      title={
        model.emptyReason === 'no-data'
          ? 'Nothing recorded yet'
          : model.emptyReason === 'bookmarks'
            ? 'No bookmarked sessions'
            : model.emptyReason === 'filters'
              ? 'No sessions match this search'
              : 'No sessions in this range'
      }
      hint={
        model.emptyReason === 'no-data'
          ? 'Once the tracker is installed, sessions land here within a minute.'
          : model.emptyReason === 'bookmarks'
            ? 'Bookmark a session while watching it and it will be here afterwards.'
            : model.emptyReason === 'filters'
              ? 'Try a wider date range, or loosen one of the filters above.'
              : 'Widen the date range and they will come back.'
      }
      action={
        model.emptyReason === 'filters' ? (
          <Button size="small" onClick={model.clearSearch}>
            Clear the search
          </Button>
        ) : undefined
      }
    />
  );

  /* ⚠ THE REPLAY REPLACES THE PLANE, and it is returned before the PageCard
     rather than rendered inside it. A replay is where you go, not something you
     peek at over the list you left: it takes a viewport, it holds attention for
     minutes, and production opens it as its own page. Wrapping it in the list's
     header and toolbar would say the opposite. See SessionReplay.tsx.

     Keyed on the session id so the clock restarts on a different row. */
  if (model.watching) {
    return (
      <SessionReplay
        key={model.watching.sessionId}
        session={model.watching}
        onClose={model.closeSession}
        onToggleBookmark={model.toggleBookmark}
      />
    );
  }

  return (
    <PageCard
      /* ⚠ THE STRIP IS BACK, AND SO ARE THE MENU ROWS (Gabriel, 2026-09-04:
         "also bring back the sessions/bookmarks/segments tab, same tab as the
         synthetics"). It came out that morning because the spec marked the
         three as (Subitem), and a thing drawn in the menu AND in the page had
         been the standing objection - two controls showing one fact.

         What makes both correct here is that there is still only one fact.
         `model.tab` is the single source: the strip writes it, and the shell
         DERIVES the menu's highlight from it rather than keeping a route of its
         own. So the two controls cannot disagree - and applying a segment,
         which moves you to the session list without either being clicked,
         moves both. The objection was never to two controls; it was to two
         copies of the state behind them.

         And the pair earns its keep: the menu is where you go from anywhere,
         the strip is where you move between siblings without leaving the page
         you are reading. Synthetics has exactly this strip, which is what "same
         tab as the synthetics" asks for.

         The TITLE still moves. A destination whose header does not name it is a
         page you cannot tell you have arrived at, and these three are
         destinations in the menu whatever the strip does. */
      title={SECTION[model.tab].title}
      subtitle={SECTION[model.tab].sub}
      tabs={
        <Tabs
          activeKey={model.tab}
          onChange={(k) => model.setTab(k as SessionTab)}
          /* The menu's own words, not a second set. "All sessions" here and
             "Sessions" in the column would be one section with two names. */
          items={[
            { key: 'all', label: 'Sessions' },
            { key: 'bookmarks', label: 'Bookmarks' },
            { key: 'segments', label: 'Segments' },
          ]}
        />
      }
      actions={
        <>
          {/* ⚠ THE SEGMENTS DROPDOWN IS GONE. It listed four names and did one
              thing with them; segments are a tab now, where each one can print
              its own rules, its live count and its owner. Loading a segment
              INTO a search is still possible and still one click - it is an
              entry in the filter picker, under "Segments", like every other
              thing you can filter by. */}
          {/* ON THE SEGMENTS TAB THE HEADER'S VERB IS "NEW"; on the two session
              tabs it is "save what is on screen". Same button, and the label
              says which, because a New that quietly inherited the filter you
              had built would be a surprise and a New that threw it away would
              be a waste. */}
          {/* ⚠ SAVE AS SEGMENT LEFT THIS HEADER on 2026-09-04 and went to the
              filter's own strip, beside Clear (Gabriel). It is a better home
              for the reason it was a poor one here: in the header it lived
              beside controls that are always available, while it is only ever
              usable once there are rules - so it spent most of its life greyed
              out, explaining in a tooltip that you had not built a filter yet.
              The strip only exists when the filter has something in it, which
              makes the button reachable exactly when it is true.

              It also puts the two verbs that dispose of a filter side by side:
              keep this, or throw it away.

              ⚠ AND THE SEGMENTS TAB'S OWN NEW LEFT TOO (Gabriel, 2026-09-04:
              "remove the new segment from the top of the segments page, leave
              it only one"). The panel below already carries the button beside
              its filter control; the same verb twice on one screen was the
              exact thing this header had just shed with Save as segment. */}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'share', icon: <Share2 size={13} />, label: 'Copy link to this search' },
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Session settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
      /* ⚠ NO `toolbar` (2026-09-04). The issue-type strip used to ride the
         shell's own row, above everything. It is in the ANSWER panel's head
         now, beside the display menu, for the reason Mehdi gave on 09-03:
         "you have the tabs first, all errors whatever, and then you have the
         filters - IT SHOULD BE REVERSED. You filter something and then you look
         at the tabs to see what's in there."

         The rule under his instinct is worth stating, because it decides the
         same question on every other list: a control that displays COUNTS
         DERIVED FROM THE RESULT belongs to the result. "All 38 · Errors 6" is
         arithmetic on what the filter returned, so it cannot sit above the
         thing it counts. See PagePanel. */
      split
    >
      {/* ⚠ A SECTION REPLACES THE BODY. On the segments tab there is no filter
          card and no sessions table, because you are not looking at sessions -
          which is the whole reason this is a tab and not a filter. */}
      {model.tab === 'segments' ? (
        <SegmentsPanel
          segments={model.segments}
          /* ⚠ COUNTED AGAINST THE WINDOW, not against the filtered list. A
             segment is its own search; counting it inside another one would
             answer a question nobody asked. */
          pool={model.inWindow}
          onOpen={model.openSegmentBy}
          onApply={model.applySegment}
          onNew={model.newSegment}
        />
      ) : (
        <>
      {/* ── 1 · THE QUESTION ──────────────────────────────────────────────
          Everything that changes WHICH ROWS EXIST: the filter, the window it
          runs over, and the two verbs that dispose of the query itself. */}
      <PagePanel spills>
        <SearchCard
          events={model.events}
          properties={model.properties}
          eventsOrder={model.eventsOrder}
          onAdd={model.addFilter}
          onAddMany={model.addFilters}
          onReplace={model.replaceFilter}
          onUpdate={model.updateFilter}
          onRemove={model.removeFilter}
          onMoveEvent={model.moveEvent}
          onAddProperty={model.addProperty}
          onUpdateProperty={model.updateProperty}
          onRemoveProperty={model.removeProperty}
          onTogglePropertyOrder={model.togglePropertyOrder}
          onEventsOrder={model.setEventsOrder}
          onClear={model.clearSearch}
          /* The value counts are computed against everything the OTHER filters
             already left, so the menu and the table can never disagree. */
          rows={model.matched}
          saveAction={
            <Tooltip
              title={
                model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')
                  ? 'A search that uses a segment cannot itself be saved'
                  : /* ⚠ AND IT SAYS WHAT IS NOT KEPT. A segment holds RULES; the
                       date window belongs to whichever list you open it in
                       later. The button used to sit next to "Past 30 days",
                       which read as a caption on it - moving it broke the
                       adjacency, and saying so outright closes the question for
                       anybody who wondered. */
                    'Save these rules as a segment. The date window is not part of it.'
              }
            >
              {/* The span is antd's own requirement: a disabled button fires no
                  pointer events, so the Tooltip has nothing to listen to. */}
              <span>
                <Button
                  size="small"
                  className="m-sc__save"
                  disabled={model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')}
                  onClick={model.newSegment}
                >
                  Save as segment
                </Button>
              </span>
            </Tooltip>
          }
        />
      </PagePanel>

      {/* ── 2 · THE ANSWER ────────────────────────────────────────────────
          Everything that reads the rows the question returned: how they are
          broken down, how they are drawn, the rows, and how many there are.

          ⚠ ITS HEAD STICKS AND THE QUESTION SCROLLS AWAY. You stop needing the
          filter once you are reading results - which is the same argument the
          filter's own collapse is built on - and the two things you never stop
          needing are the breakdown and the column titles. */}
      <PagePanel
        head={
          <>
            {/* ⚠ NARROWING TABS, NOT DESTINATION TABS, which is why these are
                here and Sessions/Bookmarks/Segments are in the page header. One
                is a filter on this list and carries counts of it; the other
                three are different lists. They look identical and they belong
                in different places. */}
            <FilterStrip
              label="Filter by issue type"
              items={ISSUE_TABS.map((t) => ({
                key: t.value,
                label: t.label,
                icon: iconFor(t.value),
                /* Counted against everything the search and the window already
                   left, so the figure on a tab is the length of the list that
                   tab produces. */
                count: issueTypeCount(model.inScope, t.value),
              }))}
              selected={[model.tag]}
              onSelect={(key) => model.setTag(key as SessionTag)}
            />
            {/* ⚠ THE WINDOW IS DOWN HERE NOW (Mehdi, 2026-09-04: *"the past
                30 days, I would probably push it down... the button, save as
                segment, doesn't have the same height as past seven days, so it
                looks a little bit weird"*). It rode the filter's own row from
                09-02 to 09-04 on the argument that the filter is what sticks.
                What that cost: the row held a filter trigger, two verbs and a
                dropdown of three different heights, and the window sat beside a
                Save that does not keep it - the adjacency the tooltip below
                has to talk you out of.

                Here it sits where Issues, Runs and Audits already keep theirs:
                on the row that draws the answer, beside the control that draws
                it, in the order every other list reads - the window, then the
                display. And this row sticks too, so the complaint the bar
                placement answered - a window you cannot change without
                scrolling back up - is still answered.

                The display menu changes nothing about which rows exist, only
                which columns you see - so it belongs to the answer, at the far
                end of the row the breakdown starts. */}
            <span className="m-ss__display">
              {/* THE SAME CONTROL AS EVERY OTHER LIST since 2026-09-02. It names
                  the field it measures - a session's window is when it STARTED -
                  and its custom range is a real pair of dates rather than the
                  preset that quietly applied ninety days. */}
              <DateRange field="Started" value={model.range} onChange={model.setRange} />
        <DisplayShell
          changeCount={model.displayChangeCount}
          onReset={model.resetDisplay}
          rows={[
            {
              id: 'sort',
              label: 'Order',
              control: (
                <MenuSelect
                  id="sort"
                  value={display.sort}
                  choices={SORT_CHOICES}
                  onChange={(v) => model.setDisplay('sort', v)}
                />
              ),
            },
            {
              id: 'viewed',
              label: 'Watched',
              control: (
                <MenuSelect
                  id="viewed"
                  value={display.viewed}
                  choices={WATCHED_CHOICES}
                  onChange={(v) => model.setDisplay('viewed', v)}
                />
              ),
            },
          ]}
          fields={FIELD_CHOICES.map((f) => ({
            value: f.value,
            label: f.label,
            on: has(f.value),
          }))}
          onToggleField={(v) => model.toggleField(v as SessionField)}
        />
            </span>
          </>
        }
      >
        {model.dataState === 'loading' ? (
        <SkeletonRows rows={8} />
      ) : model.rows.length === 0 ? (
        empty
      ) : (
        <>
          {/* ⚠ THE SAME TABLE COBROWSE DRAWS (2026-09-15). The columns, their
              widths, the alignment rule, the hue per person and the play at
              the edge are SessionTable's; this page says which fields the
              Display menu has on, which two headers the backend can honour,
              and what a click does. See SessionTable.tsx for every note that
              used to be here. */}
          <SessionTable
            rows={model.rows}
            fields={display.fields}
            sortable={['started', 'events']}
            sort={columnSortOf(display.sort)}
            onSort={(next) => model.setDisplay('sort', sortKeyOf(next))}
            onOpen={(s) => model.openSession(s.sessionId)}
            onFilterToUser={model.filterToUser}
            /* CLICKABLE, which is the best affordance on production's card and
               the one thing from it that had to survive: clicking a metadata
               value searches for it. Built through the CATALOGUE, like every
               other clause, so a `meta.plan` filter is defined once. */
            onMetaClick={(k, v) => {
              const entry = entryOf(`meta.${k}`);
              if (entry) model.addFilters([{ ...makeMeta(entry.id), value: [v] }]);
            }}
            lastViewedId={model.lastViewedId}
          />
          <ListFooter
            page={model.page}
            pageSize={model.pageSize}
            total={model.total}
            noun={['session', 'sessions']}
            onPage={model.setPage}
          />
        </>
      )}
      </PagePanel>
        </>
      )}

      {/* ⚠ KEYED ON WHICH SEGMENT. The drawer's draft is seeded once per mount,
          so a drawer reused across two segments would edit the first one's
          rules under the second one's name. */}
      {model.openSegmentId != null && (
        <SegmentDrawer
          key={model.openSegmentId}
          open
          segment={model.openSegment}
          seed={{ filters: model.filters, eventsOrder: model.eventsOrder }}
          pool={model.inWindow}
          onSave={model.saveSegment}
          onDelete={model.deleteSegment}
          onApply={model.applySegment}
          onClose={model.closeSegment}
        />
      )}
    </PageCard>
  );
}

/** A metadata chip's click builds a real property filter, so clicking a value
 *  on a row and picking the same property from the menu produce the identical
 *  row. */
function makeMeta(entryId: string) {
  return { key: `m${entryId}`, entryId, isEvent: false, operator: 'is', value: [] as string[] };
}
