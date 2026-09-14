import { useMemo, useState } from 'react';
import { App, Button, Dropdown, Modal, Segmented, Select, Tooltip } from 'antd';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Link2,
  LayoutPanelLeft,
  LayoutPanelTop,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CARD_TYPE_LABELS, type Card } from '@shared/cards-data.ts';
import type { Dashboard } from '@shared/dashboards-data.ts';
import type { Alert } from '@shared/alerts-data.ts';
import type { SessionRow } from '@shared/sessions-data.ts';
import { displayNameOf } from '@shared/sessions-data.ts';
import { seedFor } from '@shared/avatar.ts';
import { rangeBounds } from '@shared/date-range.ts';
import {
  MAX_SERIES,
  STEP_OPTIONS,
  alertFromDraft,
  draftIsValid,
  draftOf,
  drilldownSessionsOf,
  type AlertDraft,
  type MetricOf,
  type Series,
  type SortBy,
} from '@shared/analytics-logic.ts';
import type { CardsController } from '../state/useCards.ts';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { DateRange } from '../components/DateRange.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { CheckRow } from '../components/CheckRow.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { RenameDialog } from '../components/RenameDialog.tsx';
import { DrawerFooter, EntityDrawer } from '../components/EntityDrawer.tsx';
import { SessionReplay } from '../sessions/SessionReplay.tsx';
import { AlertForm } from './AlertForm.tsx';
import { CardChart } from './CardChart.tsx';
import './product-analytics.css';

export interface CardPageProps {
  card: Card;
  model: CardsController;
  dashboards: readonly Dashboard[];
  /** Where the card was opened from, when not the Cards list. */
  from?: { label: string; onClick: () => void };
  onAddToDashboard: (dashboardId: number) => void;
  onCreateAlert: (alert: Omit<Alert, 'id' | 'updatedAt'>) => void;
  onToggleBookmark: (sessionId: string) => void;
}

type Layout = 'left' | 'top' | 'right';

const fmtDate = (t: number) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(t));

/**
 * ONE CARD - production's `WidgetView`, the builder a Cards row opens.
 *
 * The header holds the name and the verbs: Update (disabled until the
 * definition differs from what was saved), a link to copy, a switch for where
 * the filters sit, and a menu for the three things that leave the page - add
 * to a dashboard, set an alert on it, delete it. The body is the definition
 * (series of steps) beside its preview (window, options, chart), and under
 * both the sessions the card drills into, each a click from its replay.
 *
 * ⚠ THE SERIES EDITOR IS A LIST OF STEPS, NOT PRODUCTION'S FULL FILTER
 * BUILDER. A step is an event from the catalogue; production lets each step
 * carry its own operator and value. The one filter builder this app has is
 * the sessions filter (SearchCard), and putting three of them on this page
 * would be three copies of the heaviest component in the app for a screen
 * whose job here is "what is a card made of". Said once, here.
 */
export function CardPage({ card, model, dashboards, from, onAddToDashboard, onCreateAlert, onToggleBookmark }: CardPageProps) {
  const { message } = App.useApp();
  const [layout, setLayout] = useState<Layout>('left');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [seriesFilter, setSeriesFilter] = useState<string>('all');

  const def = model.definition;
  const sessions = useMemo(() => drilldownSessionsOf(card), [card]);
  const bounds = rangeBounds(model.range);

  if (model.watching) {
    return <SessionReplay key={model.watching.sessionId} session={model.watching} onClose={model.closeSession} onToggleBookmark={onToggleBookmark} />;
  }
  if (!def) return null;

  const editSeries = (id: string, fn: (s: Series) => Series) =>
    model.editDefinition((d) => ({ ...d, series: d.series.map((s) => (s.id === id ? fn(s) : s)) }));
  const addSeries = () =>
    model.editDefinition((d) => ({
      ...d,
      series: [...d.series, { id: `s${Date.now()}`, name: `Series ${d.series.length + 1}`, steps: [] }],
    }));
  const removeSeries = (id: string) => model.editDefinition((d) => ({ ...d, series: d.series.filter((s) => s.id !== id) }));
  const toggleCollapsed = (id: string) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const allCollapsed = collapsed.length === def.series.length;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/metrics/${card.id}`);
      message.success('Link copied');
    } catch {
      message.error('Could not copy');
    }
  };

  const form = (
    <div className="m-cardp__form">
      {def.series.map((s, i) => {
        const open = !collapsed.includes(s.id);
        return (
          <section key={s.id} className="m-cardp__series">
            <header className="m-cardp__series-head">
              <button type="button" className="m-cardp__series-toggle" onClick={() => toggleCollapsed(s.id)} aria-expanded={open}>
                {open ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
              </button>
              <input
                className="m-cardp__series-name"
                value={s.name}
                aria-label={`Series ${i + 1} name`}
                onChange={(e) => editSeries(s.id, (x) => ({ ...x, name: e.target.value }))}
              />
              <span className="m-cardp__series-count">{s.steps.length} {s.steps.length === 1 ? 'step' : 'steps'}</span>
              {def.series.length > 1 && (
                <IconButton icon={<X size={13} />} label={`Remove ${s.name}`} variant="ghost" onClick={() => removeSeries(s.id)} />
              )}
            </header>
            {open && (
              <div className="m-cardp__steps">
                {s.steps.length === 0 && <p className="m-cardp__steps-empty">Add an event or filter step to define the series.</p>}
                {s.steps.map((step, j) => (
                  <div key={`${step}:${j}`} className="m-cardp__step">
                    <span className="m-cardp__step-n">{j + 1}</span>
                    <Select
                      size="small"
                      className="m-cardp__step-select"
                      value={step}
                      showSearch
                      options={STEP_OPTIONS}
                      onChange={(v) => editSeries(s.id, (x) => ({ ...x, steps: x.steps.map((st, k) => (k === j ? v : st)) }))}
                    />
                    <IconButton
                      icon={<X size={13} />}
                      label="Remove step"
                      variant="ghost"
                      onClick={() => editSeries(s.id, (x) => ({ ...x, steps: x.steps.filter((_, k) => k !== j) }))}
                    />
                  </div>
                ))}
                <Button
                  type="text"
                  size="small"
                  icon={<Plus size={13} />}
                  onClick={() => editSeries(s.id, (x) => ({ ...x, steps: [...x.steps, STEP_OPTIONS[0]!.value] }))}
                >
                  Add step
                </Button>
              </div>
            )}
          </section>
        );
      })}
      <div className="m-cardp__form-foot">
        <Tooltip title={def.series.length >= MAX_SERIES ? 'Maximum of 3 series reached.' : undefined}>
          <span>
            <Button size="small" icon={<Plus size={13} />} disabled={def.series.length >= MAX_SERIES} onClick={addSeries}>
              Add series
            </Button>
          </span>
        </Tooltip>
        <Button type="text" size="small" onClick={() => setCollapsed(allCollapsed ? [] : def.series.map((s) => s.id))}>
          {allCollapsed ? 'Expand all' : 'Collapse all'}
        </Button>
      </div>
    </div>
  );

  const preview = (
    <div className="m-cardp__preview">
      <div className="m-cardp__preview-bar">
        <DateRange field="Recorded" value={model.range} onChange={model.setRange} />
        <div className="m-page__controls">
          <Select
            size="small"
            value={def.sortBy}
            onChange={(v: SortBy) => model.editDefinition((d) => ({ ...d, sortBy: v }))}
            options={[
              { value: 'latest', label: 'Latest' },
              { value: 'sessions', label: 'Sessions' },
              { value: 'users', label: 'Users' },
            ]}
            popupMatchSelectWidth={false}
            aria-label="Sort"
          />
          <Segmented
            size="small"
            value={def.metricOf}
            onChange={(v) => model.editDefinition((d) => ({ ...d, metricOf: v as MetricOf }))}
            options={[
              { value: 'sessions', label: 'All sessions' },
              { value: 'users', label: 'Unique users' },
              { value: 'events', label: 'Total events' },
            ]}
          />
        </div>
      </div>
      <div className="m-cardp__chart">
        <CardChart card={card} height={220} />
      </div>
    </div>
  );

  return (
    <>
      <PageCard
        back={from ?? { label: 'Cards', onClick: model.closeCard }}
        title={card.name}
        meta={<span className="m-cardp__type">{CARD_TYPE_LABELS[card.type]}</span>}
        actions={
          <>
            <Button type="primary" size="small" disabled={!model.isDirty} onClick={() => { model.save(); message.success('Card updated'); }}>
              Update
            </Button>
            <Tooltip title="Copy link to clipboard">
              <span>
                <IconButton icon={<Link2 size={14} />} label="Copy link" variant="outline" onClick={copyLink} />
              </span>
            </Tooltip>
            <Segmented
              size="small"
              value={layout}
              onChange={(v) => setLayout(v as Layout)}
              aria-label="Where the filters sit"
              options={[
                { value: 'left', icon: <Tooltip title="Filters on left"><LayoutPanelLeft size={13} /></Tooltip> },
                { value: 'top', icon: <Tooltip title="Filters on top"><LayoutPanelTop size={13} /></Tooltip> },
                { value: 'right', icon: <Tooltip title="Filters on right"><LayoutPanelLeft size={13} style={{ transform: 'scaleX(-1)' }} /></Tooltip> },
              ]}
            />
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
                  { key: 'dashboard', icon: <Plus size={13} />, label: 'Add to dashboard' },
                  {
                    key: 'alert',
                    icon: <Bell size={13} />,
                    label: card.type === 'timeseries' ? 'Set alerts' : <Tooltip title="Alerts watch a timeseries" placement="left"><span>Set alerts</span></Tooltip>,
                    disabled: card.type !== 'timeseries',
                  },
                  { type: 'divider' },
                  { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'rename') setRenaming(true);
                  if (key === 'dashboard') setAdding(true);
                  if (key === 'alert') setAlerting(true);
                  if (key === 'delete') setDeleting(true);
                },
              }}
            >
              <span>
                <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
              </span>
            </Dropdown>
          </>
        }
        split
      >
        <div className={`m-cardp m-cardp--${layout}`}>
          <PagePanel head={<span className="m-pa__head-title">Definition</span>}>{form}</PagePanel>
          <PagePanel head={<span className="m-pa__head-title">Preview</span>}>{preview}</PagePanel>
        </div>

        <PagePanel
          head={
            <>
              <span className="m-pa__head-title">Sessions</span>
              <span className="m-cardp__between">
                between {fmtDate(bounds.from)} and {fmtDate(bounds.to)}
              </span>
              <div className="m-page__controls">
                <Select
                  size="small"
                  value={seriesFilter}
                  onChange={setSeriesFilter}
                  options={[{ value: 'all', label: 'All series' }, ...def.series.map((s) => ({ value: s.id, label: s.name }))]}
                  popupMatchSelectWidth={false}
                  aria-label="Filter by series"
                />
              </div>
            </>
          }
        >
          {sessions.length === 0 ? (
            <p className="m-cardp__none">No relevant sessions found for the selected time period.</p>
          ) : (
            <>
              <ul className="m-psess m-cardp__sessions">
                {sessions.map((s) => (
                  <li key={s.sessionId}>
                    <SessionRowButton s={s} onWatch={model.watch} />
                  </li>
                ))}
              </ul>
              <p className="m-cardp__count">
                Showing 1 to {sessions.length} of {sessions.length} sessions.
              </p>
            </>
          )}
        </PagePanel>
      </PageCard>

      <RenameDialog
        open={renaming}
        title="Rename card"
        value={card.name}
        onCancel={() => setRenaming(false)}
        onOk={(name) => {
          model.rename(card.id, name);
          setRenaming(false);
        }}
      />
      <AddToDashboard
        open={adding}
        dashboards={dashboards}
        onClose={() => setAdding(false)}
        onAdd={(ids) => {
          ids.forEach(onAddToDashboard);
          setAdding(false);
          message.success(ids.length === 1 ? 'Added to 1 dashboard' : `Added to ${ids.length} dashboards`);
        }}
      />
      {alerting && (
        <AlertDrawer
          card={card}
          onClose={() => setAlerting(false)}
          onCreate={(a) => {
            onCreateAlert(a);
            setAlerting(false);
            message.success('New alert saved');
          }}
        />
      )}
      <ConfirmDialog
        open={deleting}
        title="Remove this card?"
        okText="Remove"
        onCancel={() => setDeleting(false)}
        onOk={() => {
          setDeleting(false);
          model.remove(card.id);
        }}
      >
        <span className="m-dlg__subject">{card.name}</span> is removed from the library and from every dashboard it is on. This
        cannot be undone.
      </ConfirmDialog>
    </>
  );
}

/** The same row a person's sessions drawer draws - avatar, who, when · how
 *  long, where, and the figures. One shape for "a session you can open". */
function SessionRowButton({ s, onWatch }: { s: SessionRow; onWatch: (s: SessionRow) => void }) {
  return (
    <button type="button" className="m-psess__row" onClick={() => onWatch(s)}>
      <SessionAvatar seed={seedFor(s)} size={22} />
      <span className="m-psess__main">
        <span className="m-psess__line">
          {displayNameOf(s)} · <RelativeTime minutesAgo={s.startedAgoMin} /> · {Math.round(s.durationSec / 60)} min
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
      <Play size={14} aria-hidden="true" />
    </button>
  );
}

function AddToDashboard({
  open,
  dashboards,
  onClose,
  onAdd,
}: {
  open: boolean;
  dashboards: readonly Dashboard[];
  onClose: () => void;
  onAdd: (ids: number[]) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <Modal
      title="Add to dashboard"
      open={open}
      onCancel={() => {
        setPicked([]);
        onClose();
      }}
      okText={picked.length > 1 ? `Add to ${picked.length} dashboards` : 'Add'}
      okButtonProps={{ disabled: picked.length === 0 }}
      onOk={() => {
        onAdd(picked);
        setPicked([]);
      }}
      width={440}
      destroyOnHidden
    >
      <div className="m-cardp__dash-list">
        {dashboards.map((d) => (
          <CheckRow
            key={d.id}
            on={picked.includes(d.id)}
            onToggle={() => setPicked((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]))}
            meta={d.visibility === 'team' ? 'Team' : 'Private'}
          >
            {d.name}
          </CheckRow>
        ))}
      </div>
    </Modal>
  );
}

/** Production's AlertFormModal: the same form, in a 620px drawer, creating an
 *  alert on this card's metric. */
function AlertDrawer({ card, onClose, onCreate }: { card: Card; onClose: () => void; onCreate: (a: Omit<Alert, 'id' | 'updatedAt'>) => void }) {
  const [draft, setDraft] = useState<AlertDraft>(() => ({ ...draftOf(null), name: `${card.name} alert`, metricName: 'sessions count' }));
  const valid = draftIsValid(draft);
  return (
    <EntityDrawer
      open
      onClose={onClose}
      width={620}
      eyebrow="Alert"
      title={`On ${card.name}`}
      footer={
        <DrawerFooter
          right={
            <>
              <Button size="small" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="small"
                type="primary"
                disabled={!valid}
                onClick={() => {
                  const { id: _id, updatedAt: _u, ...rest } = alertFromDraft(draft, { id: 0 });
                  onCreate(rest);
                }}
              >
                Create
              </Button>
            </>
          }
        />
      }
    >
      <div className="m-alertf__drawer">
        <AlertForm draft={draft} onChange={setDraft} withName />
      </div>
    </EntityDrawer>
  );
}
