import type { CSSProperties } from 'react';
import { Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SortOrder } from 'antd/es/table/interface';
import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react';
import { formatDuration, type SessionField, type SessionRow } from '@shared/sessions-logic.ts';
import type { ColumnSort, SortColumn } from '@shared/sessions-logic.ts';
import { hueIndexFor, seedFor } from '@shared/avatar.ts';
import { displayNameOf } from '@shared/sessions-data.ts';
import { Chip } from '../components/Chip.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { SortIcon } from '../components/SortIcon.tsx';
import { OpenReplayMark } from '../nav/OpenReplayMark.tsx';
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
const DEVICE_WORD: Record<SessionRow['deviceType'], string> = {
  desktop: 'Desktop',
  mobile: 'Phone',
  tablet: 'Tablet',
};

export interface SessionTableProps {
  rows: readonly SessionRow[];
  /** Which optional columns are drawn. The session itself and the play are
   *  always there; everything between them is a field the Display menu can
   *  turn off - or, on a list that has no notion of one, a field the page
   *  leaves out. */
  fields: readonly SessionField[];
  /** Which headers sort. Sessions: Started and Events, because those are the
   *  two the backend orders on. The live list: Started and Duration, because
   *  those are the two production's live search orders on. */
  sortable: readonly SortColumn[];
  /** The order the rows are in, expressed as a column and a direction, so the
   *  header shows the state the list is actually in. Controlled: the caller
   *  owns it, the way it owns the rows. */
  sort: ColumnSort;
  /** A header was clicked. `null` is antd's third click - no order - and the
   *  caller answers it with its default. */
  onSort: (next: ColumnSort | null) => void;
  onOpen: (s: SessionRow) => void;
  /** The name narrows the list to that person. Absent, the name is still a
   *  button - the same element on every list - but it does nothing. */
  onFilterToUser?: (s: SessionRow) => void;
  /** A metadata chip searches for its value. */
  onMetaClick?: (key: string, value: string) => void;
  /** The one row that gets the "Last viewed" chip. */
  lastViewedId?: string | null;
  /** Whether a live row says so. On Sessions it must - one live row among a
   *  hundred recordings is the row you want. On the Live tab every row is
   *  live and the tab already said it, so a badge on each is the same fact
   *  five times: the argument that took the new-dot off the session rows. */
  liveBadge?: boolean;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE SESSIONS TABLE - ONE COMPONENT, EVERY LIST OF SESSIONS (2026-09-15).
 *
 * It lived inline in SessionsPage until Mehdi, on the 09-15 call, put the
 * CoBrowse live list next to it: "you have start time and end time there, but
 * that's not consistent with what we've done in sessions... in sessions we
 * have it as headers, you can sort them." Told that production's own live
 * list differs: "No, no, no. Don't. That's the whole point - consistency."
 *
 * Production, as it happens, already draws its live rows with the sessions
 * list's `SessionItem`. So this is that arrangement: the columns, the widths,
 * the alignment rule, the hue-per-person, the name-as-control and the play at
 * the edge are defined ONCE here, and a page says which fields it has and
 * which headers it can honour. A live session arrives as a `SessionRow` (see
 * shared/cobrowse-logic.ts) and is drawn by the same code path.
 *
 * Every design note below was written on the Sessions page and moved with the
 * code it explains; where a note says "this page" it means whichever page is
 * drawing the table.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SessionTable({
  rows,
  fields,
  sortable,
  sort,
  onSort,
  onOpen,
  onFilterToUser,
  onMetaClick,
  lastViewedId,
  liveBadge = true,
}: SessionTableProps) {
  const has = (f: SessionField) => fields.includes(f);

  /* A sortable header, or nothing. Spread into a column instead of
     `sorter: true`, so no table can end up with antd's triangles by forgetting
     the icon (the same reason `sortable` in SortIcon.tsx exists). The order is
     CONTROLLED - `sortOrder` is read off `sort`, never left to antd's own
     state - so the chevron always shows the order the rows are actually in. */
  const sortProps = (column: SortColumn) =>
    sortable.includes(column)
      ? {
          sorter: true as const,
          sortOrder: (sort.column === column ? sort.order : null) as SortOrder,
          sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
        }
      : {};


  /* ── ONE ALIGNMENT RULE AND ONE WIDTH RHYTHM (2026-09-04) ─────────────────
     Gabriel: *"you need to standardize the column width and alignment, I feel
     that Started and Events are different and Duration is really close to
     Location."* Both halves of that were true and they were the same bug.

     ⚠ EVERY COLUMN IS LEFT-ALIGNED except the device glyph, which is centred
     because a lone glyph has nothing to hold a line with, and the play, which
     is pinned right because it is the row's affordance. Events, Pages and
     Duration were right-aligned - which is correct in a table you compare
     magnitudes down, and this is not one; you scan it for a session. What it
     cost is exactly what he saw: a right-aligned Duration ends where the
     left-aligned Location begins, so the two values touch while their columns
     are 96 and 160 apart. Right alignment puts the whitespace on the wrong
     side of the number.

     ⚠ AND EVERY WIDTH IS A MULTIPLE OF 8: 88, 96, 112, 160, 200, with 56 for
     the two glyph columns. Started and Events were 104 and 82 - no rhythm, and
     the 2px is the sort of thing you feel without being able to name. Pages
     takes Events' width because it is the same kind of thing. */
  const columns: TableColumnsType<SessionRow> = [
    {
      title: 'Session',
      key: 'user',
      render: (_: unknown, s: SessionRow) => (
        <div className="m-ss__who">
          {/* ⚠ NO DOT SLOT HERE. See "NO DOT ON A SESSION ROW" above. */}
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
              onFilterToUser?.(s);
            }}
          >
            {displayNameOf(s)}
          </button>
          {liveBadge && s.live && <span className="m-ss__live">live</span>}
          {/* ⚠ THE ONE CHIP IN THE SYSTEM, not a one-off pill (Gabriel,
              2026-09-04: the first pass at this read as "a metadata pill" and
              he asked for the same tag treatment Issues gives its tags).
              `status`, not `tag`: "Last viewed" is a sentence you read, not a
              label you scan, and `neutral` because muting the rest of the row
              is the whole point - a coloured chip here would be the one thing
              spent on a state that is meant to recede. */}
          {s.sessionId === lastViewedId && (
            <Chip kind="status" tone="neutral">Last viewed</Chip>
          )}
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
            width: 112,
            ...sortProps('started'),
            render: (_: unknown, s: SessionRow) => <RelativeTime minutesAgo={s.startedAgoMin} />,
          },
        ]
      : []),
    ...(has('events')
      ? [
          {
            title: 'Events',
            key: 'events',
            width: 88,
            ...sortProps('events'),
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
            /* The same width as Events, because it is the same KIND of thing -
               a count of something in the session. Two counts of different
               widths is the kind of difference a reader notices and cannot
               explain. */
            width: 88,
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
            /* ⚠ SORTABLE ONLY WHERE THE CALLER SAYS SO. On Sessions it is not,
               and neither is anything but Started and Events: the backend
               orders on `startTs` and `eventsCount` only - see SORT_CHOICES -
               because anything else means reloading a list that "might be like
               millions of sessions". A sortable header the backend cannot
               honour works in a prototype and gets filed as a bug later. The
               live list CAN sort on it (production's live search orders by
               duration), so the column takes its sorter from `sortable`. */
            ...sortProps('duration'),
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
            width: 160,
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
            width: 56,
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
                          onMetaClick?.(k, v);
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
      width: 56,
      /* ⚠ CENTRED, not pinned right (Gabriel, 2026-09-04). Right-aligned it sat
         hard against the plane's edge with the cell's whole width of empty
         behind it, which reads as a thing that fell off the row rather than a
         column. Centred it has a column of its own, the way the device glyph
         two along does. */
      align: 'center' as const,
      className: 'm-ss__playcell',
      /* ⚠ THE OPENREPLAY MARK, NOT A GENERIC PLAY (Gabriel, 2026-09-04: "the
         recording icon should be two triangles, like the OpenReplay logo").
         It was `CirclePlay` - a circle with a triangle in it, the same glyph
         every media player on the internet uses. The product's own mark is a
         play button already, and using it here makes the one affordance on the
         row say WHOSE recording this is. It is also the second half of Mehdi's
         recognition argument: the avatar on the left and this on the right, and
         "right away I understand I'm on the sessions page."

         No colour of its own: it inherits the row's hue. See the stylesheet. */
      render: (_: unknown, s: SessionRow) => (
        <span className="m-ss__play">
          {/* ⚠ SOLID UNTIL YOU HAVE WATCHED IT (Gabriel, 2026-09-04: "the
              sessions not watched are still not different enough - maybe the
              inner triangle should be filled"). A muted outline against an
              unmuted one is a difference you have to compare two rows to see;
              filled against hollow you see in one. And the weight is on the
              right state: an unwatched session is the one with something in it
              for you. */}
          <OpenReplayMark variant="plain" filled={!s.viewed} />
        </span>
      ),
    },
  ];


  return (
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
      dataSource={[...rows]}
      showSorterTooltip={false}
      /* ⚠ THE HEADER SORT IS WIRED (2026-09-15). It was `sorter: true`
         with nothing listening: clicking Started flipped the chevron and
         left the rows where they were, because antd treats `true` as
         "the server sorts" and waits for `onChange`. Now the click hands
         the column and direction to the caller, which owns the order the
         way it owns everything else about which rows exist. A third click
         clears antd's order; the caller reads `null` as its default. */
      onChange={(_p, _f, sorter) => {
        const s = Array.isArray(sorter) ? sorter[0] : sorter;
        onSort(s?.order ? { column: s.columnKey as SortColumn, order: s.order } : null);
      }}
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
        /* ⚠ ONE HUE PER ROW, SET ON THE ROW - which is what makes it one
           hue rather than two things that agree. Mehdi's own resolution
           to his twenty-colours objection: "on each line the colour of
           the play button and the colour of whatever this widget you use
           could be the same. You'll have some consistency, you'll still
           recognise the page, but it wouldn't be too many colours."

           The avatar on the left and the mark on the right both read this
           one property, so the two ends of a wide row are visibly the
           same row. Twelve hues, seeded on the identity, so a person's
           rows are always the same colour - see shared/avatar.ts. */
        style: {
          /* ⚠ THE HASHED HUE, AND ONLY THAT (Gabriel, 2026-09-14). For a
             week the row also read the robot's OWN colour off its pixels
             and overrode this with it, so the avatar's ground here was
             one colour and the same avatar in the replay header - where
             no row sets anything - was another: "when I open the session
             the colours are the original ones, while in the list it seems
             something is altering it." CoBrowse never had the override,
             and its list and its header agree; that is the rule now.
             Twelve hues off a hash of the identity, the same twelve every
             surface in the app mixes from, so one person is one colour
             everywhere. The play's hover ink reads the same angle (see
             `--m-row-hue` in sessions-page.css). */
          '--m-avatar-i': hueIndexFor(seedFor(s)),
        } as CSSProperties,
        onClick: (e) => {
          const el = e.target as HTMLElement;
          if (el.closest('button') || el.closest('.ant-dropdown')) return;
          onOpen(s);
        },
      })}
    />
  );
}
