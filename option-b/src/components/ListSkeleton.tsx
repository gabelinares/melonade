import { Skeleton } from '@mantine/core';
import './list-skeleton.css';

export interface ListSkeletonProps {
  rows?: number;
}

/**
 * The list column's loading state, shaped like the rows it replaces: a title
 * line of varying length and a shorter meta line, at the real row height. A
 * centred spinner would tell the reader to wait; this tells them what is
 * arriving and stops the column resizing when it does.
 */
export function ListSkeleton({ rows = 7 }: ListSkeletonProps) {
  return (
    <div className="b-lskel" role="status" aria-label="Loading issues">
      {Array.from({ length: rows }, (_, i) => (
        <div className="b-lskel__row" key={i}>
          <Skeleton height={7} circle />
          <div className="b-lskel__lines">
            {/* the varied widths are what make it read as text rather than bars */}
            <Skeleton height={9} width={`${72 - (i % 3) * 14}%`} />
            <Skeleton height={7} width={`${44 - (i % 2) * 10}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}
