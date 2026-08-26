import { Tooltip } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import type { CriticalState } from '@shared/issues-logic.ts';
import './critical-flag.css';

export interface CriticalFlagProps {
  state: CriticalState;
  matchedBy?: string;
  onClick: () => void;
  /** The detail pane's copy is a labelled button; the list's is a glyph. */
  variant?: 'glyph' | 'labelled';
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

const shortLabel = (state: CriticalState): string => {
  switch (state) {
    case 'mine':
      return 'Critical to you';
    case 'team':
      return 'Critical to the team';
    case 'dismissed':
      return 'Not critical for you';
    case 'none':
      return 'Not flagged';
  }
};

/**
 * Four states, because criticality is DERIVED: an agent flags an issue when it
 * matches a description somebody wrote, so this control reports whose
 * description matched and opens the place you write one. It never sets a flag.
 *
 * `mine` and `team` differ by fill, not by glyph, since ownership is a
 * different axis from severity. In the live app those two states are pixel
 * identical, which is why the product owner did not know the distinction
 * existed. The `labelled` variant exists so the detail pane can say it in
 * words, where there is room for words.
 */
export function CriticalFlag({
  state,
  matchedBy,
  onClick,
  variant = 'glyph',
}: CriticalFlagProps) {
  const text = label(state, matchedBy);

  if (variant === 'labelled') {
    return (
      <Tooltip label={text} position="bottom">
        <button
          type="button"
          className={`b-crit b-crit--labelled b-crit--${state}`}
          aria-label={text}
          onClick={onClick}
        >
          <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
          <span>{shortLabel(state)}</span>
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={text} position="top">
      <button
        type="button"
        className={`b-crit b-crit--${state}`}
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
