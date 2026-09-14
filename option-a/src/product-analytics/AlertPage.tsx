import { useState } from 'react';
import { App, Button, Dropdown } from 'antd';
import { Bell, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ruleSentence, type Alert } from '@shared/alerts-data.ts';
import { alertFromDraft, draftIsValid, draftOf, sameDraft, type AlertDraft } from '@shared/analytics-logic.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { AlertsController } from '../state/useAlerts.ts';
import { PageCard, PagePanel } from '../components/PageCard.tsx';
import { Chip } from '../components/Chip.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { RenameDialog } from '../components/RenameDialog.tsx';
import { AlertForm } from './AlertForm.tsx';
import './product-analytics.css';

export interface AlertPageProps {
  alert: Alert;
  model: AlertsController;
}

/**
 * ONE ALERT - production's `NewAlert` page an Alerts row opens: the form in
 * three steps, Update disabled until the draft is valid and differs, Delete
 * behind a confirm, and under it the alert as the list will show it - the
 * same row, so what you are about to save is exactly what you will read.
 */
export function AlertPage({ alert, model }: AlertPageProps) {
  const { message } = App.useApp();
  const [savedDraft, setSavedDraft] = useState<AlertDraft>(() => draftOf(alert));
  const [draft, setDraft] = useState<AlertDraft>(savedDraft);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = !sameDraft(draft, savedDraft);
  const valid = draftIsValid(draft);
  const preview = alertFromDraft({ ...draft, name: draft.name || alert.name }, alert);

  const save = () => {
    const next = alertFromDraft(draft, alert);
    model.updateAlert(alert.id, next);
    setSavedDraft(draft);
    message.success('Alert updated');
  };

  return (
    <>
      <PageCard
        back={{ label: 'Alerts', onClick: model.closeAlert }}
        title={alert.name}
        actions={
          <>
            {/* No Update up here: production keeps the one submit in the form's
                footer, under the last step you filled in, and two of them on
                one page is two places to wonder which one you pressed. */}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  { key: 'rename', icon: <Pencil size={13} />, label: 'Rename' },
                  { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === 'rename') setRenaming(true);
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
        <PagePanel>
          <div className="m-alertf__page">
            <AlertForm draft={draft} onChange={setDraft} />
            <footer className="m-alertf__foot">
              <Button type="primary" size="small" disabled={!dirty || !valid} onClick={save}>
                Update
              </Button>
              <Button type="text" size="small" danger icon={<Trash2 size={13} />} onClick={() => setDeleting(true)}>
                Delete
              </Button>
            </footer>
          </div>
        </PagePanel>
        <PagePanel head={<span className="m-pa__head-title">As it will appear in the list</span>}>
          <div className="m-alertf__preview">
            <span className="m-alertf__bell">
              <Bell size={14} aria-hidden="true" />
            </span>
            <div className="m-pa__name-cell">
              <span className="m-truncate">{preview.name}</span>
              <span className="m-pa__rule">{ruleSentence(preview)}</span>
            </div>
            <Chip kind="tag">{preview.detectionMethod === 'threshold' ? 'Threshold' : 'Change'}</Chip>
            <RelativeTime minutesAgo={minutesSince(alert.updatedAt)} />
          </div>
        </PagePanel>
      </PageCard>

      <RenameDialog
        open={renaming}
        title="Rename alert"
        value={alert.name}
        onCancel={() => setRenaming(false)}
        onOk={(name) => {
          model.rename(alert.id, name);
          setDraft((d) => ({ ...d, name }));
          setSavedDraft((d) => ({ ...d, name }));
          setRenaming(false);
        }}
      />
      <ConfirmDialog
        open={deleting}
        title="Delete this alert?"
        okText="Yes, delete"
        onCancel={() => setDeleting(false)}
        onOk={() => {
          setDeleting(false);
          model.remove(alert.id);
          message.success('Alert deleted');
        }}
      >
        <span className="m-dlg__subject">{alert.name}</span> stops watching {alert.metricName} and is permanently deleted.
      </ConfirmDialog>
    </>
  );
}
