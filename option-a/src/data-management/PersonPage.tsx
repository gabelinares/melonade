import { useMemo, useState } from 'react';
import { App, Button, Dropdown, Popover, Tooltip } from 'antd';
import { ArrowDownAZ, ChevronRight, Copy, EyeOff, MapPin, MoreHorizontal, Play, Tag as TagIcon, Trash2, Zap } from 'lucide-react';
import type { ActivityEvent } from '@shared/activity-data.ts';
import { personLabel, type Person } from '@shared/people-data.ts';
import type { SessionRow } from '@shared/sessions-data.ts';
import {
  displayNameOfEvent,
  formatClock,
  groupByDay,
  sessionsOfPerson,
  trackingIdsOf,
  type PersonProperty,
} from '@shared/data-management-logic.ts';
import type { PeopleController } from '../state/usePeople.ts';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { EntityDrawer } from '../components/EntityDrawer.tsx';
import { EditableRow } from '../components/EditableRow.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { DateRange } from '../components/DateRange.tsx';
import { CheckRow } from '../components/CheckRow.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SessionReplay } from '../sessions/SessionReplay.tsx';
import { EventDetailsDrawer } from './EventDetailsDrawer.tsx';
import './data-management.css';

export interface PersonPageProps {
  person: Person;
  model: PeopleController;
  onToggleBookmark: (sessionId: string) => void;
}

/**
 * ONE PERSON - production's `UserPage`, the full page a People row opens.
 *
 * Top to bottom, as production has it: who they are (the identity card - name,
 * id, email, every tracking id, where they are, and how many properties are on
 * them), then what they did (the Activity card: a window, a way to hide the
 * noise, a timeline grouped by day). The two verbs are on the right of each
 * card's head: the person's sessions open from Activity, the person is deleted
 * from the identity card's menu. Clicking a timeline row opens the same event
 * drawer the Activity log uses; "Play session" from there, or a row in the
 * sessions drawer, swaps this page for the replay - the same swap Sessions
 * does, so a replay is reached the same way from every list that has one.
 */
export function PersonPage({ person, model, onToggleBookmark }: PersonPageProps) {
  const { message } = App.useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = useMemo(() => trackingIdsOf(person), [person]);
  const sessions = useMemo(() => sessionsOfPerson(person.userId), [person]);
  const days = useMemo(() => groupByDay(model.timeline), [model.timeline]);
  const email = person.userId.includes('@') ? person.userId : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Copied');
    } catch {
      message.error('Could not copy');
    }
  };

  if (model.watching) {
    return (
      <SessionReplay
        key={model.watching.sessionId}
        session={model.watching}
        onClose={model.closeSession}
        onToggleBookmark={onToggleBookmark}
      />
    );
  }

  const hiddenCount = model.hiddenTypes.length;

  return (
    <PageCard back={{ label: 'People', onClick: model.closePerson }} title={personLabel(person)} split>
      {/* ── who ── */}
      <PagePanel>
        <div className="m-person__card">
          <div className="m-person__who">
            <SessionAvatar seed={person.userId} size={48} />
            <div className="m-person__names">
              <span className="m-person__name m-truncate">{personLabel(person)}</span>
              <span className="m-person__id">
                <span className="m-dmg__mono m-truncate">{person.userId}</span>
                <Tooltip title="Copy user id">
                  <button type="button" className="m-copy-btn" aria-label="Copy user id" onClick={() => copy(person.userId)}>
                    <Copy size={11} aria-hidden="true" />
                  </button>
                </Tooltip>
              </span>
            </div>
          </div>
          <dl className="m-person__facts">
            {email && (
              <div className="m-person__fact">
                <dt>Email</dt>
                <dd>
                  <span className="m-truncate">{email}</span>
                  <Tooltip title="Copy email">
                    <button type="button" className="m-copy-btn" aria-label="Copy email" onClick={() => copy(email)}>
                      <Copy size={11} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </dd>
              </div>
            )}
            <div className="m-person__fact">
              <dt>Distinct ID</dt>
              <dd>
                <span className="m-dmg__mono m-truncate">{ids[0]}</span>
                {ids.length > 1 && (
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    content={
                      <div className="m-person__ids">
                        <p className="m-person__ids-title">Tracking IDs linked to this user</p>
                        <ul className="m-person__ids">
                          {ids.map((id) => (
                            <li key={id}>
                              <span className="m-dmg__mono m-truncate">{id}</span>
                              <button type="button" className="m-copy-btn" aria-label={`Copy ${id}`} onClick={() => copy(id)}>
                                <Copy size={11} aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    }
                  >
                    <button type="button" className="m-person__more">+{ids.length - 1}</button>
                  </Popover>
                )}
              </dd>
            </div>
            <div className="m-person__fact">
              <dt>Location</dt>
              <dd>
                <MapPin size={12} aria-hidden="true" />
                <span className="m-truncate">
                  {person.city}, {person.country}
                </span>
              </dd>
            </div>
            <div className="m-person__fact">
              <dt>Last seen</dt>
              <dd>
                <RelativeTime minutesAgo={Math.max(0, Math.round((Date.now() - person.lastSeenAt) / 60000))} />
              </dd>
            </div>
          </dl>
          <div className="m-person__actions">
            <Button type="text" size="small" onClick={() => model.setPropsOpen(true)}>
              +{model.properties.length} properties
            </Button>
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [{ key: 'delete', icon: <Trash2 size={13} />, label: 'Delete user', danger: true }],
                onClick: ({ key }) => key === 'delete' && setConfirmDelete(true),
              }}
            >
              <span>
                <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
              </span>
            </Dropdown>
          </div>
        </div>
      </PagePanel>

      {/* ── what they did ── */}
      <PagePanel
        head={
          <div className="m-person__acthead">
            <span className="m-ditem__head-title">Activity</span>
            <Button type="text" size="small" icon={<Play size={13} />} onClick={() => model.setSessionsOpen(true)}>
              Play sessions
            </Button>
            <div className="m-page__controls">
              <Popover
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="m-person__ids">
                    <p className="m-person__ids-title">Show or hide event types</p>
                    {model.eventTypes.map((t) => (
                      <CheckRow key={t} on={!model.hiddenTypes.includes(t)} onToggle={() => model.toggleType(t)}>
                        {displayNameOfEvent(t)}
                      </CheckRow>
                    ))}
                    {hiddenCount > 0 && (
                      <Button size="small" type="text" onClick={model.showAllTypes} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                        Show all
                      </Button>
                    )}
                  </div>
                }
              >
                <span>
                  <IconButton
                    icon={<EyeOff size={14} />}
                    label="Hide events"
                    variant="outline"
                    count={hiddenCount || undefined}
                    active={hiddenCount > 0}
                  />
                </span>
              </Popover>
              <DateRange field="Occurred" value={model.range} onChange={model.setRange} />
            </div>
          </div>
        }
      >
        {model.timeline.length === 0 ? (
          <EmptyState
            title="No events in this window"
            hint={
              model.totalEvents === 0
                ? 'Nothing has been captured for this person yet.'
                : 'Widen the date range, or show the event types you hid.'
            }
          />
        ) : (
          <div className="m-ptl">
            {days.map((d) => (
              <div key={d.key}>
                <div className="m-ptl__day">{d.label}</div>
                {d.events.map((e) => (
                  <TimelineRow key={e.id} e={e} onOpen={() => model.openTimelineEvent(e)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </PagePanel>

      <EventDetailsDrawer event={model.openEvent} onClose={model.closeTimelineEvent} onPlaySession={model.watch} />

      <PersonSessionsDrawer open={model.sessionsOpen} person={person} sessions={sessions} onClose={() => model.setSessionsOpen(false)} onWatch={model.watch} />

      <UserPropertiesDrawer
        open={model.propsOpen}
        properties={model.properties}
        onClose={() => model.setPropsOpen(false)}
        onSave={model.setProperty}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this user?"
        okText="Delete"
        onCancel={() => setConfirmDelete(false)}
        onOk={() => {
          setConfirmDelete(false);
          model.removePerson(person.userId);
        }}
      >
        <span className="m-dlg__subject">{personLabel(person)}</span> and their properties are permanently deleted. Their
        sessions stay in Recordings, without a name on them.
      </ConfirmDialog>
    </PageCard>
  );
}

function TimelineRow({ e, onOpen }: { e: ActivityEvent; onOpen: () => void }) {
  return (
    <button type="button" className="m-ptl__row" onClick={onOpen}>
      <span className="m-ptl__time">{formatClock(e.at)}</span>
      <span className="m-ptl__icon">{e.autoCaptured ? <Zap size={12} aria-hidden="true" /> : <TagIcon size={12} aria-hidden="true" />}</span>
      <span className="m-ptl__name m-truncate">{displayNameOfEvent(e.eventName)}</span>
      {e.environment !== 'production' && <span className="m-ptl__env">{e.environment}</span>}
      <ChevronRight size={13} className="m-ptl__chev" aria-hidden="true" />
    </button>
  );
}

/* ── the person's sessions - production's UserSessionsModal, 700px ─────── */
function PersonSessionsDrawer({
  open,
  person,
  sessions,
  onClose,
  onWatch,
}: {
  open: boolean;
  person: Person;
  sessions: SessionRow[];
  onClose: () => void;
  onWatch: (s: SessionRow) => void;
}) {
  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      width={700}
      eyebrow="Sessions"
      title={personLabel(person)}
      meta={<span>{sessions.length} {sessions.length === 1 ? 'recording' : 'recordings'}</span>}
    >
      {sessions.length === 0 ? (
        <EmptyState title="No recordings found" hint="This person has no session in the current window." />
      ) : (
        <ul className="m-psess">
          {sessions.map((s) => (
            <li key={s.sessionId}>
              <button type="button" className="m-psess__row" onClick={() => onWatch(s)}>
                <Play size={14} aria-hidden="true" />
                <span className="m-psess__main">
                  <span className="m-psess__line">
                    <RelativeTime minutesAgo={s.startedAgoMin} /> · {Math.round(s.durationSec / 60)} min
                  </span>
                  <span className="m-psess__sub m-truncate">
                    {s.browser} on {s.os} · {s.city}, {s.country}
                  </span>
                </span>
                <span className="m-psess__figs">
                  <span>{s.eventsCount} events</span>
                  <span>{s.pagesCount} pages</span>
                  <span>{s.errorsCount} errors</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </EntityDrawer>
  );
}

/* ── every property on the person - production's UserPropertiesModal, 620px ── */
function UserPropertiesDrawer({
  open,
  properties,
  onClose,
  onSave,
}: {
  open: boolean;
  properties: PersonProperty[];
  onClose: () => void;
  onSave: (name: string, value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [az, setAz] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = properties
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.value.toLowerCase().includes(q))
    .sort((a, b) => (az ? a.name.localeCompare(b.name) : 0));

  return (
    <EntityDrawer open={open} onClose={onClose} width={620} eyebrow="User" title="All user properties" meta={<span>{properties.length} properties</span>}>
      <div className="m-uprops">
        <div className="m-uprops__tools">
          <SearchField placeholder="Search properties" value={query} onChange={setQuery} />
          <Tooltip title={az ? 'Original order' : 'Sort A to Z'}>
            <span>
              <IconButton icon={<ArrowDownAZ size={14} />} label="Sort A to Z" variant="outline" pressed={az} onClick={() => setAz((v) => !v)} />
            </span>
          </Tooltip>
        </div>
        <div className="m-uprops__list">
          {shown.length === 0 ? (
            <p className="m-evd__none">No property matches that.</p>
          ) : (
            shown.map((p) => (
              <EditableRow key={p.name} label={<span className="m-dmg__mono">{p.name}</span>} value={p.value} onSave={(v) => onSave(p.name, v)} placeholder="—" />
            ))
          )}
        </div>
      </div>
    </EntityDrawer>
  );
}
