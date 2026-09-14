import { useMemo, useState } from 'react';
import { App, Button, Segmented, Tooltip } from 'antd';
import { Braces, Code2, Copy, List, Play } from 'lucide-react';
import type { ActivityEvent } from '@shared/activity-data.ts';
import type { SessionRow } from '@shared/sessions-data.ts';
import {
  OPENREPLAY_PROPERTY_NAMES,
  displayNameOfEvent,
  eventPropertiesOf,
  sessionForActivity,
  type EventProperty,
} from '@shared/data-management-logic.ts';
import { EntityDrawer } from '../components/EntityDrawer.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { OpenReplayMark } from '../nav/OpenReplayMark.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { minutesSince } from '@shared/tests-data.ts';
import './data-management.css';

export interface EventDetailsDrawerProps {
  event: ActivityEvent | null;
  onClose: () => void;
  /** Production's "Play Session" goes to `/session/<id>`. Here it hands the
   *  session up, and the page that owns the drawer swaps itself for the replay. */
  onPlaySession?: (session: SessionRow) => void;
}

type Scope = 'all' | 'openreplay' | 'custom';
type View = 'list' | 'json';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'all', label: 'All properties' },
  { value: 'openreplay', label: 'OpenReplay' },
  { value: 'custom', label: 'Yours' },
];

/**
 * ONE EVENT, OPENED FROM THE LOG - production's `EventDetailsModal`, a 620px
 * right drawer. The same drawer serves the Activity page and a person's
 * timeline, because in production it is the same modal reached from both.
 *
 * What it says: which event, fired by whom, where, when - then every property
 * it carried, the tracker's own first and yours after, filterable by origin
 * and by name, readable as a list or as the JSON the tracker actually sent.
 * "Play session" is the one verb: the event is a moment, the session is where
 * it happened.
 */
export function EventDetailsDrawer({ event, onClose, onPlaySession }: EventDetailsDrawerProps) {
  const { message } = App.useApp();
  const [scope, setScope] = useState<Scope>('all');
  const [view, setView] = useState<View>('list');
  const [query, setQuery] = useState('');

  const props = useMemo(() => (event ? eventPropertiesOf(event) : []), [event]);
  const session = useMemo(() => (event ? sessionForActivity(event) : null), [event]);

  const shown = props.filter((p) => {
    if (scope === 'openreplay' && p.origin !== 'openreplay') return false;
    if (scope === 'custom' && p.origin !== 'custom') return false;
    const q = query.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q) || p.value.toLowerCase().includes(q);
  });

  const json = useMemo(() => {
    if (!event) return '';
    const properties = Object.fromEntries(shown.map((p) => [p.name, p.value]));
    return JSON.stringify({ event: event.eventName, properties }, null, 2);
  }, [event, shown]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      message.success('Copied');
    } catch {
      message.error('Could not copy');
    }
  };

  const display = event ? displayNameOfEvent(event.eventName) : '';

  return (
    <EntityDrawer
      open={event != null}
      onClose={onClose}
      width={620}
      eyebrow="Event"
      title={display}
      meta={
        event && (
          <>
            {display !== event.eventName && <span className="m-dmg__mono">{event.eventName}</span>}
            <span className="m-dmg__mono">{event.distinctId}</span>
            <span>{event.city}</span>
            <span>{event.environment}</span>
            <RelativeTime minutesAgo={minutesSince(event.at)} />
          </>
        )
      }
      headerActions={
        session && onPlaySession ? (
          <Button size="small" icon={<Play size={13} />} onClick={() => onPlaySession(session)}>
            Play session
          </Button>
        ) : undefined
      }
    >
      <div className="m-evd">
        <Segmented
          block
          size="small"
          value={scope}
          options={SCOPES}
          onChange={(v) => setScope(v as Scope)}
          aria-label="Which properties"
        />
        <div className="m-evd__tools">
          <Segmented
            size="small"
            value={view}
            onChange={(v) => setView(v as View)}
            aria-label="List or JSON"
            options={[
              { value: 'list', icon: <List size={13} aria-label="List" /> },
              { value: 'json', icon: <Braces size={13} aria-label="JSON" /> },
            ]}
          />
          <SearchField placeholder="Find property" value={query} onChange={setQuery} />
        </div>

        {view === 'list' ? (
          shown.length === 0 ? (
            <p className="m-evd__none">No property matches that.</p>
          ) : (
            <ul className="m-evd__list">
              {shown.map((p) => (
                <PropertyRow key={p.name} p={p} />
              ))}
            </ul>
          )
        ) : (
          <div className="m-evd__json">
            <Tooltip title="Copy JSON">
              <span className="m-evd__copy">
                <IconButton icon={<Copy size={13} />} label="Copy JSON" variant="ghost" onClick={copy} />
              </span>
            </Tooltip>
            <pre>{json}</pre>
          </div>
        )}
      </div>
    </EntityDrawer>
  );
}

function PropertyRow({ p }: { p: EventProperty }) {
  const ors = OPENREPLAY_PROPERTY_NAMES.includes(p.name);
  return (
    <li className="m-evd__row">
      <Tooltip title={ors ? 'Set by OpenReplay' : 'Set by your code'} mouseEnterDelay={0.4}>
        <span className="m-evd__origin">
          {ors ? <OpenReplayMark variant="plain" size={12} /> : <Code2 size={13} aria-hidden="true" />}
        </span>
      </Tooltip>
      <span className="m-evd__name m-truncate">{p.displayName}</span>
      <Tooltip title={p.value} mouseEnterDelay={0.5}>
        <span className="m-evd__value m-truncate m-dmg__mono">{p.value}</span>
      </Tooltip>
    </li>
  );
}
