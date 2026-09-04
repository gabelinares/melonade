import { useMemo, useState } from 'react';
import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { Plus, Users, UserRound } from 'lucide-react';
import {
  describeSegment,
  segmentCount,
  type SavedSegment,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { PagePanel } from '../components/PageCard.tsx';
import { FilterMenu } from '../components/FilterMenu.tsx';
import { DisplayShell, MenuSelect } from '../components/DisplayMenu.tsx';
import './segments-panel.css';

/* ── ⚠ SEGMENTS IS A LIST, SO IT GETS WHAT EVERY LIST GETS (Gabriel,
   2026-09-04: "segments also should have filters, display and be a shell, like
   the others").

   It had none of it - no card, no filter, no display menu - because it arrived
   as a TAB rather than as a page and inherited the page's chrome by accident.
   When the plane gave up its surface on 09-04 that accident became visible: the
   table was sitting directly on the ground, the one list in the app without a
   card under it.

   ── THE STATE IS LOCAL, AND THAT IS DELIBERATE ────────────────────────────
   Every other list keeps its filter and display state in its page's model. This
   one keeps it here, because the sessions model is the SESSIONS model: threading
   six fields through it for a sibling section that shares none of them would
   make the page's state describe two lists and be honest about neither. If
   segments ever becomes its own page the state moves with the component.

   The vocabulary is its own too: you filter segments by WHOSE they are, which
   is the only dimension a saved search has that a session does not. */
type OwnerKey = 'owner';
/** ⚠ EVERY OPTION CARRIES ITS COUNT, which the menu requires and is right to:
 *  an option that would return nothing should say so before you pick it, not
 *  after. Counted off the unfiltered list, so the figures do not move as you
 *  narrow - a count that changes when you tick it is a count of the wrong
 *  thing. */
const ownerOptions = (segments: readonly SavedSegment[]) => [
  { value: 'mine', label: 'Yours', count: segments.filter((s) => s.mine).length },
  { value: 'shared', label: 'Shared with the team', count: segments.filter((s) => s.shared).length },
];
const SEG_FILTER_ICONS = { owner: UserRound };

type SegSort = 'updated' | 'name' | 'count';
const SEG_SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'Name' },
  { value: 'count', label: 'Most sessions' },
];

type SegField = 'count' | 'owner' | 'updated';
const SEG_FIELDS: { value: SegField; label: string }[] = [
  { value: 'count', label: 'Sessions' },
  { value: 'owner', label: 'Owner' },
  { value: 'updated', label: 'Updated' },
];

export interface SegmentsPanelProps {
  segments: readonly SavedSegment[];
  /** Every session in the current window. Each segment's count is measured
   *  against this, so the figure a row prints is the figure you get when you
   *  open it. */
  pool: readonly SessionRow[];
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
  onNew: () => void;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SEGMENTS, AS A SECTION OF THIS PAGE.
 *
 * Mehdi, 2026-09-02: *"what if segments were a whole new tab in sessions,
 * instead of just a button on the top."*
 *
 * ── WHY A TAB IS THE RIGHT SHAPE ──────────────────────────────────────────
 * It is the same argument Bookmarked won on: a section REPLACES the body, a
 * filter narrows it. Segments is not a narrower list of sessions — it is a list
 * of a different thing — so it cannot be a filter, and it was a dropdown at the
 * top of the page, which is where things go when nobody has decided what they
 * are. A dropdown could show you their names and nothing else: not what they
 * mean, not how many sessions they hold, not who made them, not when anybody
 * last touched them.
 *
 * ── EVERY ROW PRINTS ITS OWN RULES ────────────────────────────────────────
 * In the same sentence the collapsed filter prints, from the same function. A
 * segment is one saved search, and a list of saved searches that shows only
 * their names makes you open each one to find out which is which. "Paid users,
 * checkout" is a name somebody chose; `add_to_cart then checkout_start, plan is
 * paid` is what it does.
 *
 * ── AND THE COUNT IS LIVE ─────────────────────────────────────────────────
 * Counted against the same window the sessions list is in, by the same
 * evaluator. So the number here is the number you get when you open it, and a
 * segment that has gone empty says so on the shelf rather than after you click
 * it.
 *
 * ── TWO VERBS, AND THEY ARE DIFFERENT ─────────────────────────────────────
 * The ROW opens the segment, because reading is what you came for. **Use**
 * loads its rules into the sessions filter and takes you back to the list. One
 * of these edits the saved thing and the other one runs it, so they are not
 * allowed to be the same click — which is what a dropdown of names made them.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function SegmentsPanel({ segments, pool, onOpen, onApply, onNew }: SegmentsPanelProps) {
  const [owners, setOwners] = useState<readonly string[]>([]);
  const [sort, setSort] = useState<SegSort>('updated');
  const [fields, setFields] = useState<readonly SegField[]>(['count', 'owner', 'updated']);

  const shown = useMemo(() => {
    /* No owner picked is every owner, which is how every other filter in this
       app reads an empty dimension. */
    const kept = owners.length
      ? segments.filter((seg) => owners.some((o) => (o === 'mine' ? seg.mine : seg.shared)))
      : segments;
    const by = [...kept];
    if (sort === 'name') by.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'count') by.sort((a, b) => segmentCount(b, pool) - segmentCount(a, pool));
    else by.sort((a, b) => b.updatedAt - a.updatedAt);
    return by;
  }, [segments, owners, sort, pool]);

  const has = (f: SegField) => fields.includes(f);
  const toggleField = (f: SegField) =>
    setFields((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));

  /* ⚠ FILTER THEN DISPLAY, which is the order every list in this app uses:
     what period, then which rows, then how they are drawn. Tests had them the
     other way round until 09-04 and it was the only page that did. */
  const head = (
    <div className="m-page__controls">
      <FilterMenu<OwnerKey>
        dimensions={[{ key: 'owner', label: 'Owner', options: ownerOptions(segments) }]}
        isActive={(_k, v) => owners.includes(v)}
        onToggle={(_k, v) => setOwners((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))}
        activeCount={owners.length}
        icons={SEG_FILTER_ICONS}
        label="Filter segments"
      />
      <DisplayShell
        label="Display segments"
        changeCount={(sort === 'updated' ? 0 : 1) + (3 - fields.length)}
        onReset={() => {
          setSort('updated');
          setFields(['count', 'owner', 'updated']);
        }}
        rows={[
          {
            id: 'sort',
            label: 'Order',
            control: (
              <MenuSelect
                id="seg-sort"
                value={sort}
                choices={SEG_SORTS}
                onChange={(v) => setSort(v as SegSort)}
              />
            ),
          },
        ]}
        fields={SEG_FIELDS.map((f) => ({ value: f.value, label: f.label, on: has(f.value) }))}
        onToggleField={(v) => toggleField(v as SegField)}
      />
    </div>
  );

  const columns: TableColumnsType<SavedSegment> = [
    {
      title: 'Segment',
      key: 'name',
      render: (_: unknown, seg) => (
        <div className="m-seg__cell">
          <span className="m-seg__name m-truncate">{seg.name}</span>
          {/* ⚠ THE RULES, under the name, for the same reason an audit's scope
              is under its name: it is what the name MEANS, and two segments
              called "Checkout" over different rules are two different searches. */}
          <span className="m-seg__rules m-truncate">{describeSegment(seg)}</span>
        </div>
      ),
    },
    {
      title: 'Sessions',
      key: 'count',
      hidden: !has('count'),
      width: 108,
      align: 'right' as const,
      render: (_: unknown, seg) => {
        const n = segmentCount(seg, pool);
        return (
          <Tooltip title={`In the window this list is showing`} mouseEnterDelay={0.3}>
            {/* A segment that currently holds nothing is a fact worth reading
                off the shelf, and a dash is how every other empty figure in
                this app reads. */}
            <span className={`m-seg__n${n === 0 ? ' is-zero' : ''}`}>{n === 0 ? '—' : n}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Owner',
      key: 'owner',
      hidden: !has('owner'),
      width: 168,
      render: (_: unknown, seg) => (
        <span className="m-seg__owner m-truncate">
          {seg.mine ? 'You' : seg.createdBy}
          {seg.shared && (
            <Tooltip title="Shared with the team">
              <Users size={12} className="m-seg__shared" aria-label="Shared with the team" />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Updated',
      key: 'updated',
      hidden: !has('updated'),
      width: 104,
      render: (_: unknown, seg) => <RelativeTime minutesAgo={(Date.now() - seg.updatedAt) / 60000} />,
    },
    {
      title: '',
      key: 'use',
      width: 84,
      align: 'right' as const,
      render: (_: unknown, seg) => (
        <Button
          size="small"
          type="text"
          className="m-seg__use"
          onClick={(e) => {
            e.stopPropagation();
            onApply(seg.id);
          }}
        >
          Use
        </Button>
      ),
    },
  ];

  if (segments.length === 0) {
    return (
      <PagePanel head={head}>
        <EmptyState
        title="No saved segments"
        hint="Build a filter on the sessions list and save it. A segment is that search, kept — so you can come back to it, share it, or drop it into another search."
        action={
          <Button icon={<Plus size={14} />} onClick={onNew}>
              New segment
            </Button>
          }
        />
      </PagePanel>
    );
  }

  return (
    <PagePanel head={head}>
      <Table<SavedSegment>
        className="m-seg__table"
        tableLayout="fixed"
        rowKey="id"
        columns={columns}
        dataSource={shown}
        pagination={false}
        rowClassName="m-seg__row"
        onRow={(seg) => ({
          onClick: (e) => {
            const el = e.target as HTMLElement;
            if (el.closest('button')) return;
            onOpen(seg.id);
          },
        })}
      />
      <ListFooter page={1} pageSize={shown.length} total={shown.length} noun={['segment', 'segments']} />
    </PagePanel>
  );
}
