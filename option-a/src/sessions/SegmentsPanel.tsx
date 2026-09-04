import { useMemo, useState } from 'react';
import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { Layers, Plus, Users, UserRound } from 'lucide-react';
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
import { FilterStrip } from '../components/FilterStrip.tsx';
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
/* ⚠ A TAB BAR, NOT A FILTER MENU (Gabriel, 2026-09-04: "to be consistent, in
   segments you'll add a tab bar with Mine and Team, with icons, on the left on
   top of the table").

   Whose a segment is has exactly two answers and every segment has one, which
   is the shape a strip is for and the shape a menu is not: a menu hides a
   two-way choice behind a click and a badge, and then needs a count on the
   trigger to tell you whether it is doing anything. The strip shows both
   answers, both counts and the current state without being opened - and it is
   the same control the sessions list uses for its issue kinds, one row above,
   which is the consistency he is asking for.

   ⚠ AND IT IS SINGLE-SELECT, WITH AN "ALL" (Gabriel, 2026-09-04: "there should
   be the All item on the left tab - besides, a tab menu is one where the tab
   MOVES, just like the others; it's not something you can select each").

   It was multi-select, on the reasoning that a segment can be both yours and
   shared, so with neither picked you saw everything. True about the data and
   wrong about the control: a strip whose thumb can be in two places at once, or
   in none, is not a tab bar - it is a row of checkboxes wearing one. The
   sliding thumb is what makes a strip readable without being read, and it only
   exists if exactly one item is on.

   So the third state gets a NAME instead of being the absence of the other two.
   "All" is what you are looking at when you have not narrowed, said out loud,
   and it is where every other strip in this app starts. */
type Owner = 'all' | 'mine' | 'shared';
const OWNER_TABS: { key: Owner; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Layers size={13} /> },
  { key: 'mine', label: 'Mine', icon: <UserRound size={13} /> },
  { key: 'shared', label: 'Team', icon: <Users size={13} /> },
];

const ownedBy = (seg: SavedSegment, who: Owner) =>
  who === 'all' ? true : who === 'mine' ? seg.mine : seg.shared;

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
  const [owner, setOwner] = useState<Owner>('all');
  const [sort, setSort] = useState<SegSort>('updated');
  const [fields, setFields] = useState<readonly SegField[]>(['count', 'owner', 'updated']);

  const shown = useMemo(() => {
    const kept = segments.filter((seg) => ownedBy(seg, owner));
    const by = [...kept];
    if (sort === 'name') by.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'count') by.sort((a, b) => segmentCount(b, pool) - segmentCount(a, pool));
    else by.sort((a, b) => b.updatedAt - a.updatedAt);
    return by;
  }, [segments, owner, sort, pool]);

  const has = (f: SegField) => fields.includes(f);
  const toggleField = (f: SegField) =>
    setFields((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));

  /* ⚠ FILTER THEN DISPLAY, which is the order every list in this app uses:
     what period, then which rows, then how they are drawn. Tests had them the
     other way round until 09-04 and it was the only page that did. */
  /* ⚠ THE STRIP IS ON THE LEFT AND THE BUTTONS ARE ON THE RIGHT (Gabriel,
     2026-09-04: "the segment tabs are not consistent with everything else - it
     is a tab menu on the left, just like sessions").

     It was all one right-aligned cluster, which put a two-way choice you READ
     in the corner reserved for controls you PRESS. Every list in this app
     splits the row the same way: what narrows it on the left, what acts on it
     on the right - including the sessions table one row above, which is the
     comparison he is making.

     ⚠ `.m-page__controls` IS THE RIGHT-HAND HALF, not the whole row. Its
     `margin-left: auto` is what puts it there, so wrapping the strip in it too
     was the bug. */
  const head = (
    <>
      <FilterStrip
        label="Whose segments"
        items={OWNER_TABS.map((t) => ({
          key: t.key,
          label: t.label,
          icon: t.icon,
          /* ⚠ COUNTED OFF THE UNFILTERED LIST, so the figures hold still as you
             narrow. A count that changes when you tick it is a count of the
             wrong thing. */
          count: segments.filter((seg) => ownedBy(seg, t.key)).length,
        }))}
        selected={[owner]}
        onSelect={(k) => setOwner(k as Owner)}
      />
      <div className="m-page__controls">
      {/* ⚠ NEW SEGMENT LEADS THE RIGHT-HAND BUTTONS (Gabriel, 2026-09-04). It
          is the only thing on this page that MAKES one, and everything else in
          the cluster only changes how the ones you have are drawn - so it goes
          first, where a primary action goes, rather than last where it would
          read as another display control. */}
      <Button size="small" className="m-seg__new" icon={<Plus size={13} />} onClick={onNew}>
        New segment
        </Button>
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
    </>
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
