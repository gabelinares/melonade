import { Button, Dropdown, Pagination, Select, Table, Tabs, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Bookmark,
  BookOpen,
  MoreHorizontal,
  Play,
  Settings2,
  Share2,
  Split,
} from 'lucide-react';
import {
  DATE_RANGES,
  FIELD_CHOICES,
  SAVED_SEGMENTS,
  SORT_CHOICES,
  entryOf,
  formatDuration,
  type SessionField,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import type { useSessions } from '../state/useSessions.ts';
import { PageCard } from '../components/PageCard.tsx';
import { DisplayShell } from '../components/DisplayMenu.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SkeletonRows } from '../components/SkeletonRows.tsx';
import { pagerItem } from '../components/Pager.tsx';
import { sortable } from '../components/SortIcon.tsx';
import { noNativeTooltip } from '../components/selectOptions.ts';
import { SearchCard } from './SearchCard.tsx';
import './sessions-page.css';

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
export function SessionsPage({ model }: SessionsPageProps) {
  const { display } = model;
  const has = (f: SessionField) => display.fields.includes(f);

  const rangeStart = (model.page - 1) * model.pageSize + 1;
  const rangeEnd = Math.min(model.page * model.pageSize, model.total);

  const columns: TableColumnsType<SessionRow> = [
    {
      title: 'Session',
      key: 'user',
      render: (_: unknown, s: SessionRow) => (
        <div className="m-ss__who">
          {/* THE SLOT IS ON EVERY ROW. See the note above. */}
          <span className={`m-dot is-slot${s.viewed ? ' is-off' : ''}`} aria-hidden={s.viewed} />
          <span className={`m-ss__name m-truncate${s.userId ? '' : ' is-anon'}`}>{s.displayName}</span>
          {s.live && <span className="m-ss__live">live</span>}
          {s.favorite && (
            <Tooltip title="Bookmarked">
              <Bookmark size={12} className="m-ss__mark" aria-label="Bookmarked" />
            </Tooltip>
          )}
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
    ...(has('errors')
      ? [
          {
            title: 'Errors',
            key: 'errors',
            width: 78,
            align: 'right' as const,
            ...sortable,
            /* A zero is drawn as nothing. A column of "0" is a column of noise,
               and the only question this column answers is "which of these went
               wrong" - which a sparse column answers at a glance and a dense
               one hides. */
            render: (_: unknown, s: SessionRow) =>
              s.errorsCount > 0 ? (
                <span className="m-ss__fig m-ss__fig--bad">{s.errorsCount}</span>
              ) : (
                <span className="m-ss__fig is-zero">—</span>
              ),
          },
        ]
      : []),
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
            ...sortable,
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
            width: 158,
            /* Three facts, one cell, and one of them muted: browser is what
               people filter on, the OS and the device type are context. Three
               columns for these would be 300px saying almost nothing. */
            render: (_: unknown, s: SessionRow) => (
              <span className="m-ss__device m-truncate">
                {s.browser}
                <span className="m-ss__quiet">
                  {s.os} · {s.deviceType}
                </span>
              </span>
            ),
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
                  {pairs.length > 2 && <span className="m-ss__quiet">+{pairs.length - 2}</span>}
                </span>
              );
            },
          },
        ]
      : []),
    {
      title: '',
      key: 'play',
      width: 44,
      render: () => (
        <span className="m-ss__play" aria-hidden="true">
          <Play size={13} strokeWidth={2} />
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

  return (
    <PageCard
      title="Sessions"
      subtitle="Every session the tracker recorded on this project. Search by what people did, then watch the ones that matter."
      /* ⚠ antd `Tabs`, NOT `FilterStrip`. The `tabs` slot is text tabs with an
         ink bar, and PageCard says so in as many words: "deliberately a
         different shape from the pill toolbar below, because a section replaces
         the body and a filter only narrows it". A pill strip in here made the
         two sections read as two filters, which is the confusion those two
         shapes exist to prevent - and text tabs are what the Tests page's three
         sections already use. */
      tabs={
        <Tabs
          activeKey={model.tab}
          onChange={(k) => model.setTab(k as 'all' | 'bookmarks')}
          items={[
            { key: 'all', label: 'All sessions' },
            { key: 'bookmarks', label: 'Bookmarked' },
          ]}
        />
      }
      actions={
        <>
          {/* SAVED SEGMENTS. A search you keep is a segment, and it is the same
              entity the catalogue lists under "Segments" - so loading one puts
              it in the search as the one event it is, which is exactly what
              `processFilterResponse` does with it. */}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'head',
                  type: 'group',
                  label: 'Saved segments',
                  children: SAVED_SEGMENTS.map((seg) => ({
                    key: seg.id,
                    icon: <Split size={13} />,
                    label: seg.name,
                    /* Somebody else's segment can be used and not overwritten,
                       which is a real rule in production. */
                    extra: seg.mine ? undefined : 'shared',
                  })),
                },
              ],
              onClick: ({ key }) => {
                const entry = entryOf(key);
                if (entry) model.loadSegment(entry);
              },
            }}
          >
            <Button size="small" icon={<Split size={13} />}>
              Segments
            </Button>
          </Dropdown>
          <Tooltip
            title={
              model.filters.length === 0
                ? 'Add a filter first'
                : model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')
                  ? 'A search that uses a segment cannot itself be saved'
                  : 'Save this search as a segment'
            }
          >
            <Button
              size="small"
              disabled={
                model.filters.length === 0 ||
                model.filters.some((f) => entryOf(f.entryId)?.category === 'segments')
              }
            >
              Save
            </Button>
          </Tooltip>
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
      /* NO TOOLBAR ROW. The issue-type strip went (Mehdi, 2026-09-02: keep only
         the two tabs) and it lost almost nothing: `issueType` is a property in
         the catalogue, so all five are still reachable through the one button -
         and now with their share of traffic beside them, which the strip's bare
         count could not give. What it did cost is the count being visible
         without opening anything; noted in DESIGN.md rather than pretended
         away.

         The date range and the display menu moved onto the search's own bar
         rather than staying on a row of their own with nothing else in it. They
         belong there for a better reason than tidiness: THAT BAR IS WHAT
         STICKS, and a window you cannot change without scrolling back up is
         the same complaint the sticky came out of. */
    >
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
              <Select
                className="m-ss__range"
                size="small"
                value={model.range}
                onChange={model.setRange}
                options={noNativeTooltip(DATE_RANGES.map((d) => ({ value: d.value, label: d.label })))}
                aria-label="Date range"
              />
              <DisplayShell
                changeCount={model.displayChangeCount}
                onReset={model.resetDisplay}
                rows={[
                  {
                    id: 'sort',
                    label: 'Order',
                    control: (
                      <Select
                        id="sort"
                        size="small"
                        value={display.sort}
                        onChange={(v) => model.setDisplay('sort', v)}
                        options={noNativeTooltip(
                          SORT_CHOICES.map((c) => ({ value: c.value, label: c.label })),
                        )}
                      />
                    ),
                  },
                  {
                    id: 'viewed',
                    label: 'Watched',
                    control: (
                      <Select
                        id="viewed"
                        size="small"
                        value={display.viewed}
                        onChange={(v) => model.setDisplay('viewed', v)}
                        options={noNativeTooltip([
                          { value: 'show', label: 'Show all' },
                          { value: 'hide', label: 'Hide watched' },
                          { value: 'only', label: 'Only watched' },
                        ])}
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
            rowKey={(s) => s.sessionId}
            columns={columns}
            dataSource={[...model.rows]}
            pagination={false}
            rowClassName={(s) => `m-ss__row${s.viewed ? ' is-viewed' : ''}`}
            onRow={() => ({
              onClick: (e) => {
                const el = e.target as HTMLElement;
                if (el.closest('button') || el.closest('.ant-dropdown')) return;
                /* The replay is the next piece and it is not wired here. A row
                   that navigated nowhere would be worse than one that does not
                   pretend to: the cursor says it opens, and it will. */
              },
            })}
          />
          <footer className="m-ss__foot">
            <span className="m-ss__range-label">
              {model.total > model.pageSize
                ? `${rangeStart}–${rangeEnd} of ${model.total}`
                : `${model.total} ${model.total === 1 ? 'session' : 'sessions'}`}
            </span>
            {model.total > model.pageSize && (
              <Pagination
                size="small"
                current={model.page}
                total={model.total}
                pageSize={model.pageSize}
                onChange={model.setPage}
                showSizeChanger={false}
                itemRender={pagerItem}
              />
            )}
          </footer>
        </>
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
