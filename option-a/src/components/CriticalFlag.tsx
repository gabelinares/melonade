import { Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import './critical-flag.css';

/**
 * Four states, because criticality here is DERIVED, not toggled: an agent
 * flags an issue when it matches a description somebody wrote. So this control
 * reports whose description matched and opens the place you write one. It
 * never sets a flag itself.
 *
 * `mine` and `team` differ by the chip's fill, not by the glyph: ownership is
 * a different axis from severity, so the triangle must not change shape when
 * the owner changes. That distinction is currently invisible in the live app,
 * to the point that the product owner did not know it existed.
 */
export type CriticalState = 'none' | 'team' | 'mine' | 'dismissed';

export interface CriticalFlagProps {
  state: CriticalState;
  /** Whose description matched. Required for `team`, so the tooltip can say. */
  matchedBy?: string;
  onClick: () => void;
}

const label = (state: CriticalState, matchedBy?: string): string => {
  switch (state) {
    case 'mine':
      return 'Matches your description';
    case 'team':
      return matchedBy ? `Matches ${matchedBy}'s description` : 'Matches a description';
    case 'dismissed':
      return 'Not critical for you';
    case 'none':
      return 'Describe what is critical';
  }
};

export function CriticalFlag({ state, matchedBy, onClick }: CriticalFlagProps) {
  const text = label(state, matchedBy);
  return (
    <Tooltip title={text} mouseEnterDelay={0.3}>
      <button
        type="button"
        className={`m-crit m-crit--${state}`}
        aria-label={text}
        aria-pressed={state === 'mine' || state === 'team'}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
