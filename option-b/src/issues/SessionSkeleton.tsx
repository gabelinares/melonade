import { Skeleton } from '@mantine/core';
import './session-card.css';

/**
 * A session card with nothing in it yet.
 *
 * It is built out of the CARD'S OWN classes, not out of a second set of boxes
 * that happen to be about the same size. That is the whole trick: the still,
 * the variation line, the identity row and the device line are laid out by
 * `session-card.css`, so a skeleton cannot drift from the card it stands in for
 * and the band cannot change height when the real ones arrive.
 */
export function SessionSkeleton({ index }: { index: number }) {
  return (
    <div className="b-scard b-scard--skeleton" aria-hidden="true">
      <span className="b-scard__shot">
        <Skeleton className="b-scard__frame" />
      </span>
      {/* Varied widths, so it reads as a sentence waiting to arrive rather than
          as three identical bars. */}
      <span className="b-scard__variation">
        <Skeleton height={11} width={`${86 - (index % 3) * 16}%`} />
      </span>
      <span className="b-scard__foot">
        <Skeleton height={9} width={`${52 - (index % 2) * 12}%`} />
      </span>
      <span className="b-scard__meta">
        <Skeleton height={8} width="64%" />
      </span>
    </div>
  );
}
