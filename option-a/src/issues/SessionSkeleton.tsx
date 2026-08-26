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
    <div className="m-scard m-scard--skeleton" aria-hidden="true">
      <span className="m-scard__shot">
        <span className="m-scard__frame m-skeleton" />
      </span>
      {/* Varied widths, so it reads as a sentence waiting to arrive rather than
          as three identical bars. */}
      <span className="m-scard__variation">
        <span className="m-skeleton" style={{ height: 11, width: `${86 - (index % 3) * 16}%` }} />
      </span>
      <span className="m-scard__foot">
        <span className="m-skeleton" style={{ height: 9, width: `${52 - (index % 2) * 12}%` }} />
      </span>
      <span className="m-scard__meta">
        <span className="m-skeleton" style={{ height: 8, width: '64%' }} />
      </span>
    </div>
  );
}
