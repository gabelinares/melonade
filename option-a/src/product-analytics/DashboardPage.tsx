import { useState } from 'react';
import { App, Button, Dropdown, Modal, Popover, Radio, Tooltip } from 'antd';
import { Download, Lock, MoreHorizontal, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import type { Dashboard } from '@shared/dashboards-data.ts';
import { CARD_TYPE_LABELS, type Card } from '@shared/cards-data.ts';
import type { DashboardsController } from '../state/useDashboards.ts';
import { PageCard } from '../components/PageCard.tsx';
import { Chip } from '../components/Chip.tsx';
import { DateRange } from '../components/DateRange.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { RenameDialog } from '../components/RenameDialog.tsx';
import { CardChart } from './CardChart.tsx';
import './product-analytics.css';

export interface DashboardPageProps {
  dashboard: Dashboard;
  model: DashboardsController;
  /** The live card list - names can change on the Cards page. */
  cards: readonly Card[];
  onOpenCard: (cardId: number) => void;
}

/**
 * ONE DASHBOARD - production's `DashboardView`, the page a Dashboards row opens.
 *
 * A back link to the list, the name, its visibility, and on the right the
 * three things you do to a dashboard: add a card, choose the window, and the
 * menu (rename, who sees it, delete, and the report download that is an
 * Enterprise feature and says so). Under that the grid: four columns, each
 * widget a card at the span its type wants, with its own menu and a chart you
 * click to drill into the card.
 *
 * ⚠ NOT BUILT: dragging widgets to reorder them. Production does it with
 * react-dnd; here the order is the order cards were added, which is what a
 * prototype of "what is on this dashboard" needs to say. Resizing is out for
 * the same reason.
 */
export function DashboardPage({ dashboard, model, cards, onOpenCard }: DashboardPageProps) {
  const { message } = App.useApp();
  const [renaming, setRenaming] = useState(false);
  const [access, setAccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const widgets = model.widgetsOf(dashboard.id);
  const onBoard = new Set(widgets.map((w) => w.cardId));
  const available = cards.filter((c) => !onBoard.has(c.id));
  const cardOf = (id: number) => cards.find((c) => c.id === id);

  const addCard = (
    <Popover
      open={adding}
      onOpenChange={setAdding}
      trigger="click"
      placement="bottomRight"
      content={
        <div className="m-dash__picker">
          <p className="m-dash__picker-title">Add a card to this dashboard</p>
          {available.length === 0 ? (
            <p className="m-dash__picker-empty">Every card is already on it.</p>
          ) : (
            <ul className="m-dash__picker-list">
              {available.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="m-dash__picker-row"
                    onClick={() => {
                      model.addCard(dashboard.id, c.id);
                      setAdding(false);
                      message.success(`${c.name} added`);
                    }}
                  >
                    <span className="m-truncate">{c.name}</span>
                    <span className="m-dash__picker-type">{CARD_TYPE_LABELS[c.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    >
      <Button type="primary" size="small" icon={<Plus size={14} />}>
        Add card
      </Button>
    </Popover>
  );

  return (
    <>
      <PageCard
        back={{ label: 'Dashboards', onClick: model.closeDashboard }}
        title={dashboard.name}
        meta={
          <Chip kind="tag">
            {dashboard.visibility === 'team' ? <Users size={11} /> : <Lock size={11} />}
            {dashboard.visibility === 'team' ? 'Team' : 'Private'}
          </Chip>
        }
        actions={
          <>
            {addCard}
            <DateRange field="Recorded" value={model.range} onChange={model.setRange} />
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
                  { key: 'access', icon: <Users size={13} />, label: 'Visibility & access' },
                  {
                    key: 'report',
                    icon: <Download size={13} />,
                    label: (
                      <Tooltip title="Available on Enterprise" placement="left">
                        <span>Download report</span>
                      </Tooltip>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'rename') setRenaming(true);
                  if (key === 'access') setAccess(true);
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
        {widgets.length === 0 ? (
          <div className="m-panel">
            <EmptyState
              title="Nothing on this dashboard yet"
              hint="Add a card from the library and it takes its place in the grid."
              action={addCard}
            />
          </div>
        ) : (
          <div className="m-dash__grid">
            {widgets.map((w) => {
              const card = cardOf(w.cardId);
              if (!card) return null;
              return (
                <section key={w.cardId} className="m-dash__widget" style={{ gridColumn: `span ${w.span}` }}>
                  <header className="m-dash__widget-head">
                    <button type="button" className="m-dash__widget-title m-truncate" onClick={() => onOpenCard(card.id)}>
                      {card.name}
                    </button>
                    <span className="m-dash__widget-type">{CARD_TYPE_LABELS[card.type]}</span>
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{
                        items: [
                          { key: 'edit', icon: <Pencil size={13} />, label: 'Edit' },
                          { key: 'remove', icon: <X size={13} />, label: 'Remove from dashboard', danger: true },
                        ],
                        onClick: ({ key }) => {
                          if (key === 'edit') onOpenCard(card.id);
                          if (key === 'remove') model.removeCard(dashboard.id, card.id);
                        },
                      }}
                    >
                      <span>
                        <IconButton icon={<MoreHorizontal size={14} />} label={`Actions for ${card.name}`} variant="ghost" />
                      </span>
                    </Dropdown>
                  </header>
                  {/* The chart is the drilldown: production routes to the
                      metric on click ("Cannot drill down system provided
                      metrics" only for predefined ones, which this library
                      has none of). */}
                  <button type="button" className="m-dash__widget-body" onClick={() => onOpenCard(card.id)} aria-label={`Open ${card.name}`}>
                    <CardChart card={card} height={w.span === 4 ? 180 : 140} />
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </PageCard>

      <RenameDialog
        open={renaming}
        title="Rename dashboard"
        value={dashboard.name}
        onCancel={() => setRenaming(false)}
        onOk={(name) => {
          model.rename(dashboard.id, name);
          setRenaming(false);
        }}
      />
      <Modal
        title="Visibility & access"
        open={access}
        onCancel={() => setAccess(false)}
        footer={null}
        width={440}
        destroyOnHidden
      >
        <Radio.Group
          value={dashboard.visibility}
          onChange={(e) => {
            model.setVisibility(dashboard.id, e.target.value);
            setAccess(false);
          }}
          options={[
            { value: 'team', label: 'Team' },
            { value: 'private', label: 'Personal' },
          ]}
        />
        <p className="m-dlg__lede" style={{ marginTop: 12 }}>
          Team can see and edit the dashboard.
        </p>
      </Modal>
      <ConfirmDialog
        open={deleting}
        title="Delete this dashboard?"
        okText="Yes, delete"
        onCancel={() => setDeleting(false)}
        onOk={() => {
          setDeleting(false);
          model.remove(dashboard.id);
        }}
      >
        <span className="m-dlg__subject">{dashboard.name}</span> is permanently deleted. The cards on it stay in the library.
      </ConfirmDialog>
    </>
  );
}
