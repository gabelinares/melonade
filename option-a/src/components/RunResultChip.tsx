import { CheckCircle2, Loader, XCircle } from 'lucide-react';
import type { RunStatus } from '@shared/runs-data.ts';
import { Chip, type ChipTone } from './Chip.tsx';

/**
 * How a run came out.
 *
 * Three states and all three are toned, which is the opposite of the choice the
 * tests list makes next door - and the reason is what the two columns are FOR.
 * A test's status is a lifecycle: most rows are Active and colouring them all
 * reports nothing. A run's status is a RESULT, the single fact the row exists
 * to deliver, and a log is scanned for the failures in it.
 *
 * The icon is not decoration either: it is what keeps the outcome readable
 * without relying on colour, which matters most in exactly this column.
 */
const CONFIG: Record<RunStatus, { label: string; tone: ChipTone; Icon: typeof CheckCircle2; spin?: boolean }> = {
  running: { label: 'Running', tone: 'info', Icon: Loader, spin: true },
  failed: { label: 'Failed', tone: 'danger', Icon: XCircle },
  passed: { label: 'Passed', tone: 'success', Icon: CheckCircle2 },
};

export interface RunResultChipProps {
  status: RunStatus;
}

export function RunResultChip({ status }: RunResultChipProps) {
  const { label, tone, Icon, spin } = CONFIG[status];
  return (
    <Chip kind="status" tone={tone}>
      <Icon size={11} aria-hidden="true" className={spin ? 'm-spin' : undefined} />
      {label}
    </Chip>
  );
}
