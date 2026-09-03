import { Button, Dropdown, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Angry,
  BookOpen,
  CircleAlert,
  CirclePlay,
  type LucideIcon,
  MessageCircleWarning,
  Monitor,
  MoreHorizontal,
  Plus,
  Settings2,
  Share2,
  Skull,
  Smartphone,
  Tablet,
  WifiOff,
} from 'lucide-react';
import {
  FIELD_CHOICES,
  ISSUE_TABS,
  SORT_CHOICES,
  entryOf,
  issueTypeCount,
  formatDuration,
  type SessionDisplay,
  type SessionField,
  type SessionRow,
  type SessionTab,
  type SessionTag,
} from '@shared/sessions-logic.ts';
import type { useSessions } from '../state/useSessions.ts';
import { seedFor } from '@shared/avatar.ts';
import { displayNameOf } from '@shared/sessions-data.ts';
import { DateRange } from '../components/DateRange.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { DisplayShell, MenuSelect } from '../components/DisplayMenu.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { FilterStrip } from '../components/FilterStrip.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { sortable } from '../components/SortIcon.tsx';
import { SearchCard } from './SearchCard.tsx';
import { SegmentDrawer } from './SegmentDrawer.tsx';
import { SegmentsPanel } from './SegmentsPanel.tsx';
import { SessionReplay } from './SessionReplay.tsx';
import './sessions-page.css';

/* ── THE DEVICE, AS ONE GLYPH ────────────────────────────────────────────────
   Three types, three shapes, and lucide has all three - which is the whole
   reason the icon is the DEVICE and not the browser. A browser mark is a brand
   logo; lucide carries none, and redrawing one from memory is the thing the
   design rules here forbid first. */
const DEVICE_ICONS: Record<SessionRow['deviceType'], LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

/** What the tooltip and the screen reader call it. The fixture's own words are
 *  lower-case route names; these are the words a person would say. */
const DEVICE_WORD: Record<SessionRow['deviceType'], string> = {
  desktop: 'Desktop',
  mobile: 'Phone',
  tablet: 'Tablet',
};

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
 * ── THE DOT IS THE UNVIEWED MARK ───────────────────────────────────────────
 * Same 5px accent the menu wears one level up and the issue list wears at the
 * same altitude: there it says an agent found something, here it says nobody
 * has watched this yet. THE SLOT IS ON EVERY ROW - rendered only where it
 * applies it would push the identified names five pixels right of the
 * anonymous ones.
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
  const has = (f: SessionField) => display.fields.includes(f);


  const columns: TableColumnsType<SessionRow> = [
    {
      title: 'Session',
      key: 'user',
      render: (_: unknown, s: SessionRow) => (
        <div className="m-ss__who">
          {/* THE SLOT IS ON EVERY ROW. See the note above. */}
          <span className={`m-dot is-slot${s.viewed ? ' is-off' : ''}`} aria-hidden={s.viewed} />
          {/* ⚠ KEYED ON THE SEED. The avatar holds a failed-request flag, and
              antd reuses a row's React node across pages - so without the key
              a robot that failed to load on page one would leave whoever lands
              in that position on page two with no avatar at all. */}
          <SessionAvatar key={seedFor(s)} seed={seedFor(s)} />
          {/* ⚠ A BUTTON INSIDE A CLICKABLE ROW, which is a thing to do carefully
              and not a thing to avoid. The row opens the replay; the name asks
              a different question - *show me the rest of this person's* - and
              that question has no other control on the page. Without it you
              open the filter picker, find "User ID", and type an id you can
              see on screen.

              `stopPropagation` is what keeps the two apart, and it is on the
              CLICK rather than on the row's handler: the row does not need to
              know that one of its cells has its own verb. */}
          <button
            type="button"
            className={`m-ss__name m-truncate${s.userId ? '' : ' is-anon'}`}
            title={`Show only ${displayNameOf(s)}`}
            onClick={(e) => {
              e.stopPropagation();
              model.filterToUser(s);
            }}
          >
            {displayNameOf(s)}
          </button>
          {s.live && <span className="m-ss__live">live</span>}
          {/* ⚠ NO BOOKMARK MARK HERE. It moved to the actions cell on the right
              and became a CONTROL (Mehdi, 2026-09-02). A read-only copy of it
              beside the name would be the same fact drawn twice, and the copy
              would be the one that does not respond to a click. */}
        </div>
      ),
    },
    ...(has('started')
      ? [
          {
            title: 'Started',
            key: 'started',
            width: 104,
            ...sortable,
            render: (_: unknown, s: SessionRow) => <RelativeTime minutesAgo={s.startedAgoMin} />,
          },
        ]
      : []),
    ...(has('events')
      ? [
          {
            title: 'Events',
            key: 'events',
            width: 82,
            align: 'right' as const,
            ...sortable,
            render: (_: unknown, s: SessionRow) => <span className="m-ss__fig">{s.eventsCount}</span>,
          },
        ]
      : []),
    /* ⚠ NO ERRORS COLUMN, and it was the cheapest-looking win in the whole
       rebuild: `errorsCount` is in the payload and drawn nowhere, so putting it
       on screen cost nothing. Mehdi checked production live on 2026-09-02 - "I
       don't think we have errors... no, we don't" - and gave the reason it was
       never drawn: "it would be too much data to read and people wouldn't get
       it. THAT'S WHY WE MADE IT AS TABS." The issue-type strip above answers
       the same question as one choice instead of 134 figures. See
       ISSUE_TABS. */
    ...(has('pages')
      ? [
          {
            title: 'Pages',
            key: 'pages',
            width: 74,
            align: 'right' as const,
            render: (_: unknown, s: SessionRow) => <span className="m-ss__fig">{s.pagesCount}</span>,
          },
        ]
      : []),
    ...(has('duration')
      ? [
          {
            title: 'Duration',
            key: 'duration',
            width: 96,
            align: 'right' as const,
            /* ⚠ NOT SORTABLE, and neither is anything but Started and Events.
               The backend orders on `startTs` and `eventsCount` only - see
               SORT_CHOICES - because anything else means reloading a list that
               "might be like millions of sessions". A sortable header the
               backend cannot honour works in a prototype and gets filed as a
               bug later. */
            render: (_: unknown, s: SessionRow) => (
              <span className="m-ss__fig">{formatDuration(s.durationSec)}</span>
            ),
          },
        ]
      : []),
    ...(has('location')
      ? [
          {
            title: 'Location',
            key: 'location',
            width: 150,
            render: (_: unknown, s: SessionRow) => (
              <span className="m-ss__where m-truncate">
                <span className="m-ss__cc">{s.countryCode}</span>
                {s.city}
              </span>
            ),
          },
        ]
      : []),
    ...(has('device')
      ? [
          {
            title: 'Device',
            key: 'device',
            /* ⚠ 60px, DOWN FROM 158, and the number is the HEADER's not the
               glyph's. It was 44 - a glyph needs a column the width of a glyph -
               and "Device" is 38px of 12px medium plus 16px of cell padding, so
               it wrapped to two lines and took the whole header row from 33px
               to 49px with it. A header that does not fit does not overflow its
               own cell; it makes every column taller, which is why this looked
               like a table bug rather than a column one.

               The 98px it still gives back go to the session name - the only
               column with no width of its own and the one that runs out of
               room. */
            width: 60,
            align: 'center' as const,
            /* ⚠ ONE GLYPH, AND THE WORDS MOVE TO THE TOOLTIP (Gabriel,
               2026-09-04, on Mehdi's ask): the device type is drawn, the browser
               and the OS are read on hover.

               It was `Chrome / macOS · desktop` set in two sizes. Three facts in
               a 158px cell is a paragraph in a table, and nobody SCANS a
               paragraph - which is the only thing a list column is for. What a
               reader actually wants from this column at a glance is *phone or
               computer*, because it changes what the session means: a rage
               click and a rage tap are different events, the viewport is
               different, and the journey is different. The browser version is a
               detail you look up about one row, never a thing you compare down
               a column - so it goes where details go.

               ⚠ THE GLYPH IS THE DEVICE, NOT THE BROWSER, and that is what
               makes this buildable at all. Browser marks are brand logos, lucide
               has none of them, and drawing Chrome from memory is the one thing
               the design rules here forbid outright. Three device types are
               three shapes that already exist. */
            render: (_: unknown, s: SessionRow) => {
              const Glyph = DEVICE_ICONS[s.deviceType];
              return (
                <Tooltip title={`${s.browser} on ${s.os} · ${DEVICE_WORD[s.deviceType]}`}>
                  {/* ⚠ THE LABEL IS ON THE ELEMENT, not left to the tooltip. A
                      Tooltip is a hover, and a hover is not available to a
                      screen reader or to a keyboard - so the cell would have
                      been an unlabelled picture of a phone. */}
                  <span
                    className="m-ss__dev"
                    role="img"
                    aria-label={`${s.browser} on ${s.os}, ${DEVICE_WORD[s.deviceType]}`}
                  >
                    <Glyph size={15} strokeWidth={1.75} />
                  </span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
    ...(has('metadata')
      ? [
          {
            title: 'Metadata',
            key: 'metadata',
            width: 200,
            /* CLICKABLE, which is the best affordance on production's card and
               the one thing from it that had to survive: clicking a metadata
               value searches for it. It is the shortest path from "this session
               is interesting" to "show me the others like it". */
            render: (_: unknown, s: SessionRow) => {
              const pairs = Object.entries(s.metadata);
              if (!pairs.length) return <span className="m-ss__fig is-zero">—</span>;
              return (
                <span className="m-ss__meta">
                  {pairs.slice(0, 2).map(([k, v]) => (
                    <Tooltip key={k} title={`Search for ${k} is ${v}`}>
                      <button
                        type="button"
                        className="m-ss__meta-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          const entry = entryOf(`meta.${k}`);
                          if (entry) model.addFilters([{ ...makeMeta(entry.id), value: [v] }]);
                        }}
                      >
                        {v}
                      </button>
                    </Tooltip>
                  ))}
                  {pairs.length > 2 && <span className="m-ss__more">+{pairs.length - 2}</span>}
                </span>
              );
            },
          },
        ]
      : []),
    /* ── THE PLAY, PINNED TO THE RIGHT EDGE (Mehdi, 2026-09-02) ──────────────
       ⚠ AND IT IS ALONE HERE NOW. The bookmark sat beside it for one morning,
       on Mehdi's own ask, and came off the same evening with a reason from
       their own usage: "people don't use the bookmark there. They need to view
       the session first before bookmarking it. So keep that for when you're
       going to be reviewing the replay." So it moves to the replay page, and
       `favorite` plus the Bookmarked tab stay exactly as they were - the state
       is real, only the control on the row is gone.

       Third position for this glyph in a day, and the two rejected ones are
       worth keeping because each was wrong for its own reason.

       It began as a hover-only glyph in the last column, on the argument that
       the ROW opens the replay so a button repeating that 134 times is 134
       invitations to do what the row already does. Half of that still holds -
       the row is the target and this is not a second control - but it made the
       one verb of the whole page invisible until you were already pointing at
       it.

       Then it led the row, at 12px and filled: "the play icon on the left is
       horrible, it looks like a chevron". Right - a small solid triangle with
       no container is a caret, and at the START of a row a caret means expand.

       Now: an OUTLINE glyph in a circle, at the right edge, always drawn, and
       ⚠ STICKY - it holds the right edge while the table scrolls under it, so
       narrowing the window can never take the one affordance off screen. The
       gradient behind it is what makes that legible: content scrolling past
       fades out under the glyph instead of colliding with it. */
    {
      title: '',
      key: 'play',
      /* Narrower by the bookmark's width, and the glyph is a size down: with
         nothing beside it there is no pair to hold an edge against, and Mehdi's
         last word on it was "keep the play button, but make it much smaller". */
      width: 52,
      className: 'm-ss__playcell',
      render: () => (
        <span className="m-ss__play" aria-hidden="true">
          <CirclePlay size={15} strokeWidth={1.75} />
        </span>
            ),
    },
  ];

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
      /* ⚠ NO `tabs` SLOT SINCE 2026-09-04, and the three that were in it are
         menu rows now. Gabriel's spec marks Sessions / Bookmarks / Segments as
         **(Subitem)** while Synthetics' three stay **(Tab)**, and the two are
         not interchangeable: a thing drawn in the menu AND in the page is two
         controls showing one fact, which is exactly what the "tabs don't show
         in the sidemenu" rule exists to prevent. `model.tab` is still the one
         source - the shell writes it from the route and reads it back for the
         highlight, so applying a segment (which moves you to the session list)
         moves the menu with it.

         Which is also why the TITLE moves now and did not before. A tab strip
         under one title says *these are three views of Sessions*; three menu
         rows say *these are three destinations*, and a destination whose header
         does not name it is a page you cannot tell you have arrived at. */
      title={SECTION[model.tab].title}
      subtitle={SECTION[model.tab].sub}
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
          {model.tab === 'segments' ? (
            <Button size="small" icon={<Plus size={13} />} onClick={model.newSegment}>
              New segment
            </Button>
          ) : (
            <Tooltip
              title={
                model.filters.length === 0
                  ? 'Add a filter first'
                  : model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')
                    ? 'A search that uses a segment cannot itself be saved'
                    : 'Save this search as a segment'
              }
            >
              <span>
                <Button
                  size="small"
                  disabled={
                    model.filters.length === 0 ||
                    model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')
                  }
                  onClick={model.newSegment}
                >
                  Save as segment
                </Button>
              </span>
            </Tooltip>
          )}
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
      toolbar={
        model.tab === 'segments' ? undefined : (
          <FilterStrip
            label="Filter by issue type"
            items={ISSUE_TABS.map((t) => ({
              key: t.value,
              label: t.label,
              icon: iconFor(t.value),
              /* Counted against everything the search and the window already
                 left, so the figure on a tab is the length of the list that tab
                 produces. */
              count: issueTypeCount(model.inScope, t.value),
            }))}
            selected={[model.tag]}
            onSelect={(key) => model.setTag(key as SessionTag)}
          />
        )
      }
      /* ⚠ THE ISSUE-TYPE STRIP IS BACK ON A TOOLBAR ROW (Mehdi, 2026-09-02:
         "we're missing the tabs for errors, this and that... it should be the
         same tabs as we have in tests"). It was deleted the same morning, on
         his ask, and the reason it returns arrived with the rest of his
         sentence: THE ERRORS COLUMN GOES, and this is what answers the question
         it was answering. See ISSUE_TABS for why it is its own state rather
         than a second path to the `issueType` property.

         ⚠ ONLY ON THE SESSION TABS. Segments is a list of a different thing, so
         a strip that narrows sessions has nothing to narrow there - and
         PageCard's toolbar is one row for the whole page, so it has to be the
         page that decides.

         The date range and the display menu stay on the SEARCH's own bar rather
         than moving up here, for the reason they went there: that bar is what
         STICKS, and a window you cannot change without scrolling back up is the
         complaint the sticky came out of. */
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
      <div className="m-ss__sticky">
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
          trailing={
            <>
              {/* ⚠ THE SAME CONTROL AS EVERY OTHER LIST since 2026-09-02, and
                  the same one Issues, Runs and Audits carry. It names the field
                  it measures - a session's window is when it STARTED - and its
                  custom range is a real pair of dates rather than the preset
                  that quietly applied ninety days. */}
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
            </>
          }
        />
      </div>

      {model.dataState === 'loading' ? (
        <SkeletonRows rows={8} />
      ) : model.rows.length === 0 ? (
        empty
      ) : (
        <>
          <Table<SessionRow>
            className="m-ss__table"
            /* ⚠ FIXED, AND EVERY TABLE IN THE APP IS (Mehdi, 2026-09-02: "when
               you change the pages and the data changes, the column widths
               change too, and this shouldn't happen"). antd's default is
               `auto`, under which a column's `width` is a SUGGESTION the
               browser overrides from the content - so page 2 with a longer
               email in it shifted every column beside it, and the columns you
               were reading moved under you between pages. Fixed makes the
               widths mean what they say; the one column without one - the
               session itself - takes the remainder. */
            tableLayout="fixed"
            rowKey={(s) => s.sessionId}
            columns={columns}
            dataSource={[...model.rows]}
            pagination={false}
            rowClassName={(s) => `m-ss__row${s.viewed ? ' is-viewed' : ''}`}
            /* ⚠ THE ROW OPENS THE REPLAY, EXCEPT WHERE IT DOES NOT (Gabriel,
               2026-09-04: "clicking on the sessions row - except the session
               name and the metadata pills - will open a session replay, same
               session replay we have in issues").

               The two exceptions are both `<button>`s, so ONE guard covers them
               and covers whatever gets added next: anything on a row that is
               already a control keeps its own verb. Writing the exceptions out
               by class would have been a list to maintain, and the first
               control somebody adds without updating it would silently open the
               replay instead of doing its own job. */
            onRow={(s) => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                model.openSession(s.sessionId);
              },
            })}
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
