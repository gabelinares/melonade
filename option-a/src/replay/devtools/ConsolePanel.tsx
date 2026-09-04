import { useMemo, useState } from 'react';
import { Switch } from 'antd';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { LogLevel, SessionLog } from '@shared/replay.ts';
import { FilterStrip } from '../../components/FilterStrip.tsx';
import type { ReplayClock } from '../useReplayClock.ts';
import { DevRow, Keyword, NoData, PanelBar, useNowIndex } from './shared.tsx';

type Sub = 'all' | 'error' | 'warn' | 'info';

const LEVEL_ICON: Record<LogLevel, typeof Info> = { info: Info, warn: TriangleAlert, error: CircleAlert };

export interface ConsolePanelProps {
  logs: readonly SessionLog[];
  clock: ReplayClock;
  /** Production's "Open Errors By Default": land on ERRORS when there are any. */
  openErrors: boolean;
  onOpenErrors: (v: boolean) => void;
}

/**
 * THE CONSOLE, as production draws it: ALL / ERRORS / WARNINGS / INFO across the
 * bar, a keyword filter, and one mono line per entry with its level as the
 * only colour. Production's row also carries the exception's own message as a
 * dotted link into an error drawer; this fixture has no stack to open, so the
 * message is printed inline after the line instead of drawn as a control that
 * would not answer.
 */
export function ConsolePanel({ logs, clock, openErrors, onOpenErrors }: ConsolePanelProps) {
  const errors = logs.filter((l) => l.level === 'error').length;
  const [sub, setSub] = useState<Sub>(openErrors && errors > 0 ? 'error' : 'all');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (sub === 'all' || l.level === sub) &&
        (!needle || `${l.text} ${l.message ?? ''}`.toLowerCase().includes(needle)),
    );
  }, [logs, sub, q]);
  const now = useNowIndex(shown, clock);

  return (
    <>
      <PanelBar
        left={
          <FilterStrip
            label="Console level"
            selected={[sub]}
            onSelect={(k) => setSub(k as Sub)}
            items={[
              { key: 'all', label: 'All', count: logs.length },
              { key: 'error', label: 'Errors', count: errors },
              { key: 'warn', label: 'Warnings', count: logs.filter((l) => l.level === 'warn').length },
              { key: 'info', label: 'Info', count: logs.filter((l) => l.level === 'info').length },
            ]}
          />
        }
        right={
          <>
            <label className="m-dt__switch">
              <Switch size="small" checked={openErrors} onChange={onOpenErrors} />
              Open errors by default
            </label>
            <Keyword value={q} onChange={setQ} />
          </>
        }
      />
      <div className="m-dt__list">
        {shown.length === 0 ? (
          <NoData hint={q ? 'Nothing in the console matches that.' : 'Nothing was logged at this level.'} />
        ) : (
          shown.map((l, i) => {
            const Icon = LEVEL_ICON[l.level];
            return (
              <DevRow
                key={`${l.at}-${i}`}
                at={l.at}
                clock={clock}
                now={i === now}
                tone={l.level === 'error' ? 'error' : l.level === 'warn' ? 'warn' : undefined}
                className="m-dt__log"
              >
                <Icon size={12} className={`m-dt__level is-${l.level}`} aria-hidden="true" />
                <span className="m-sr-only">{l.level}: </span>
                <span className="m-dt__logtext m-mono">
                  {l.text}
                  {l.message && <span className="m-dt__logmsg"> {l.message}</span>}
                </span>
              </DevRow>
            );
          })
        )}
      </div>
    </>
  );
}
