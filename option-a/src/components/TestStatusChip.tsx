import type { DisplayStatus } from '@shared/tests-data.ts';
import { Chip, type ChipTone } from './Chip.tsx';

/**
 * A test's status, as one chip.
 *
 * The production page tints all five states - green, indigo, blue, orange, grey
 * - which on a page where most rows are Active means most rows carry a coloured
 * chip, and colour that is on everything reports nothing. Here colour is spent
 * only where it changes what you would do:
 *
 *   Needs review  the accent, because it is the one row asking for a person
 *   Paused        warning, because it is not running and somebody stopped it
 *   Active        success, quiet, and the only steady state that earns a tint
 *   Draft         neutral - the novelty is already carried by the dot beside
 *                 the title, and saying it twice on one row says it once
 *   Approved      neutral - ready, idle, nothing owed
 */
const TONE: Record<DisplayStatus, ChipTone> = {
  draft: 'neutral',
  needs_review: 'info',
  approved: 'neutral',
  active: 'success',
  paused: 'warning',
};

const LABEL: Record<DisplayStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  approved: 'Approved',
  active: 'Active',
  paused: 'Paused',
};

export interface TestStatusChipProps {
  status: DisplayStatus;
}

export function TestStatusChip({ status }: TestStatusChipProps) {
  return (
    <Chip kind="status" tone={TONE[status]}>
      {LABEL[status]}
    </Chip>
  );
}

export const testStatusLabel = (status: DisplayStatus): string => LABEL[status];
