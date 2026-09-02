import { Button, Table, Tooltip } from 'antd';
import type { TableColumnsType } from 'antd';
import { Plus, Users } from 'lucide-react';
import {
  describeSegment,
  segmentCount,
  type SavedSegment,
  type SessionRow,
} from '@shared/sessions-logic.ts';
import { EmptyState } from '../components/EmptyState.tsx';
import { ListFooter } from '../components/ListFooter.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import './segments-panel.css';

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
      <EmptyState
        title="No saved segments"
        hint="Build a filter on the sessions list and save it. A segment is that search, kept — so you can come back to it, share it, or drop it into another search."
        action={
          <Button icon={<Plus size={14} />} onClick={onNew}>
            New segment
          </Button>
        }
      />
    );
  }

  return (
    <>
      <Table<SavedSegment>
        className="m-seg__table"
        tableLayout="fixed"
        rowKey="id"
        columns={columns}
        dataSource={[...segments]}
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
      <ListFooter page={1} pageSize={segments.length} total={segments.length} noun={['segment', 'segments']} />
    </>
  );
}
