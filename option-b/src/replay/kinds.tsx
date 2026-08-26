import { AlertTriangle, ArrowRight, Hourglass, Keyboard, MousePointerClick, Zap } from 'lucide-react';
import type { MarkerKind } from '@shared/replay.ts';

/**
 * WHAT EACH KIND OF EVENT LOOKS LIKE, in one place.
 *
 * The track under the player says kind with colour, because a 8px dot cannot
 * hold a glyph. The journey panel beside it has a whole row per step, so it says
 * kind with the glyph as well. Those two readings have to be the same reading,
 * and the way to guarantee that is for there to be one table rather than two
 * components that each decided what "rage" looks like.
 */
export const KIND_ICON: Record<MarkerKind, typeof Zap> = {
  click: MousePointerClick,
  input: Keyboard,
  nav: ArrowRight,
  slow: Hourglass,
  rage: Zap,
  error: AlertTriangle,
};

/** Said in words for the screen reader, since the glyph says it for everyone else. */
export const KIND_NAME: Record<MarkerKind, string> = {
  click: 'Click',
  input: 'Typing',
  nav: 'Page change',
  slow: 'Stall',
  rage: 'Repeated attempts',
  error: 'Error',
};
