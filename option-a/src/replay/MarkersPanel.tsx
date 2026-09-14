import type { ReplayMarker } from '@shared/replay.ts';
import { formatClock } from '@shared/replay.ts';
import type { ReplayClock } from './useReplayClock.ts';
import { KIND_ICON, KIND_NAME } from './kinds.tsx';

/**
 * WHAT HAPPENED, IN ORDER, AS A LIST YOU CAN SEEK FROM - the side panel's
 * "Activity" tab for any recording that has markers but no issue: a session
 * opened from the list, a spot, a live visitor. The issue's own Journey tab
 * is the richer version of this (paths, a thread, the failure) and stays its
 * own component; this is the plain one.
 */
export function MarkersPanel({ markers, clock, startLabel = 'Start' }: { markers: readonly ReplayMarker[]; clock: ReplayClock; startLabel?: string }) {
  let current = -1;
  markers.forEach((m, i) => {
    if (clock.at >= m.at) current = i;
  });
  if (markers.length === 0) {
    return <p className="m-evd__none">Nothing recorded yet.</p>;
  }
  return (
    <ul className="m-rs__acts" aria-label="Activity">
      <li>
        <button type="button" className={`m-rs__act${current === -1 ? ' is-now' : ''}`} onClick={() => clock.seek(0)}>
          <span className="m-rs__act-time m-mono">{formatClock(0)}</span>
          <span className="m-rs__act-label m-truncate">{startLabel}</span>
        </button>
      </li>
      {markers.map((m, i) => {
        const Icon = KIND_ICON[m.kind];
        return (
          <li key={`${m.at}-${i}`}>
            <button
              type="button"
              className={`m-rs__act${i === current ? ' is-now' : ''}${m.kind === 'error' ? ' is-error' : ''}`}
              onClick={() => clock.seek(m.at)}
              title={`Jump to ${formatClock(m.at)}`}
            >
              <span className="m-rs__act-time m-mono">{formatClock(m.at)}</span>
              <span className="m-rs__act-icon">
                <Icon size={12} aria-hidden="true" />
              </span>
              <span className="m-rs__act-label m-truncate">
                <span className="m-sr-only">{KIND_NAME[m.kind]}: </span>
                {m.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
