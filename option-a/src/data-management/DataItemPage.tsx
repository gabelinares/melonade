import type { ReactNode } from 'react';
import { Switch, Tooltip } from 'antd';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { EditableRow } from '../components/EditableRow.tsx';
import './data-management.css';

export interface DataItemRow {
  label: ReactNode;
  value: string;
  onSave?: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  display?: ReactNode;
  hint?: ReactNode;
}

export interface DataItemPageProps {
  back: { label: string; onClick: () => void };
  /** The human name, as the page title. */
  title: string;
  /** The raw name, in the mono pill production draws in its card header. */
  name: string;
  subtitle?: string;
  actions?: ReactNode;
  rows: DataItemRow[];
  /** Production renders the Status row whenever the item carries one. */
  status?: { hidden: boolean; onChange: (hidden: boolean) => void };
  /** The card under the rows - "Event properties", "Users with this
   *  property" - a head and a table, in its own panel. */
  footer?: { head: ReactNode; children: ReactNode };
}

/**
 * ONE DATA ITEM - production's `DataItemPage`, which Events and Properties
 * both render in place of their list. A back link to the list, the name, a
 * stack of editable rows, a visibility switch, and one card of related rows
 * underneath. Two pages, one component, so the event page and the property
 * page cannot disagree about what "editing a display name" looks like.
 */
export function DataItemPage({ back, title, name, subtitle, actions, rows, status, footer }: DataItemPageProps) {
  return (
    <PageCard
      back={back}
      title={title}
      subtitle={subtitle}
      meta={<span className="m-ditem__pill m-dmg__mono">{name}</span>}
      actions={actions}
      split
    >
      <PagePanel>
        <div className="m-ditem__rows">
          {rows.map((r, i) => (
            <EditableRow
              key={i}
              label={r.label}
              value={r.value}
              onSave={r.onSave}
              multiline={r.multiline}
              placeholder={r.placeholder}
              display={r.display}
              hint={r.hint}
            />
          ))}
          {status && (
            <div className="m-erow">
              <div className="m-erow__label">
                <Tooltip title={`This ${title ? 'item' : 'item'} is ${status.hidden ? 'hidden from' : 'visible in'} search and analytics.`}>
                  <span className="m-ditem__dotted">Status</span>
                </Tooltip>
              </div>
              <div className="m-erow__value">
                <Switch
                  checked={!status.hidden}
                  onChange={(on) => status.onChange(!on)}
                  checkedChildren="Visible"
                  unCheckedChildren="Hidden"
                  aria-label="Visible in search and analytics"
                />
              </div>
            </div>
          )}
        </div>
      </PagePanel>
      {footer && <PagePanel head={footer.head}>{footer.children}</PagePanel>}
    </PageCard>
  );
}
