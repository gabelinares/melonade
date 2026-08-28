import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { SortOrder } from 'antd/es/table/interface';
import './sort-icon.css';

/**
 * The sort affordance on a column header.
 *
 * antd ships a pair of small filled triangles, stacked. They are hard: solid
 * shapes with sharp corners next to a UI drawn entirely in 1.75px rounded
 * strokes, and at 11px the pair reads as a smudge rather than as two arrows.
 *
 * This is the same lucide chevron the project switcher in the menu uses, which
 * is the point - "you can move this up or down" is one gesture and it should
 * look the same wherever it appears. Idle is the DOUBLE chevron, because
 * nothing is sorted and both directions are on offer; a sorted column shows the
 * ONE direction it is in. Two arrows where one would do is how antd's default
 * ends up looking active on every column at once.
 */
export function SortIcon({ sortOrder }: { sortOrder: SortOrder }) {
  const Icon = sortOrder === 'ascend' ? ChevronUp : sortOrder === 'descend' ? ChevronDown : ChevronsUpDown;
  return (
    <span className={`m-sort${sortOrder ? ' is-on' : ''}`} aria-hidden="true">
      <Icon size={13} strokeWidth={1.75} />
    </span>
  );
}

/** Spread into a column instead of `sorter: true`, so no table can end up with
 *  antd's triangles by forgetting the icon. */
export const sortable = {
  sorter: true as const,
  sortIcon: ({ sortOrder }: { sortOrder: SortOrder }) => <SortIcon sortOrder={sortOrder} />,
};
