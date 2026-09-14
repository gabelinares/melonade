import { useEffect, useState } from 'react';
import { Button, Input, Segmented } from 'antd';
import { Trash2 } from 'lucide-react';
import type { Feature } from '@shared/features-data.ts';
import { DrawerFooter, EntityDrawer, Field, Section } from '../components/EntityDrawer.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { StatTile } from '../components/StatTile.tsx';
import './data-management.css';

export interface FeatureDrawerProps {
  feature: Feature | null;
  onClose: () => void;
  onSave: (id: number, patch: Pick<Feature, 'name' | 'location'>) => void;
  onRemove: (id: number) => void;
}

type Scope = 'app' | 'page';

/**
 * EDIT ONE FEATURE - production's `TagForm`, a 428px right drawer titled
 * "Edit Feature". The selector is what was tagged from the recording and
 * cannot be retyped; the name and the scope can. Under the form, the two
 * figures the list already shows, restated for the last day, because a
 * feature is watched for adoption and "how is it doing right now" is the
 * question you opened it with.
 */
export function FeatureDrawer({ feature, onClose, onSave, onRemove }: FeatureDrawerProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<Scope>('app');
  const [location, setLocation] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!feature) return;
    setName(feature.name);
    setScope(feature.location ? 'page' : 'app');
    setLocation(feature.location ?? '');
  }, [feature]);

  if (!feature) return null;

  const nextLocation = scope === 'page' ? location.trim() || null : null;
  const dirty = name.trim() !== feature.name || nextLocation !== feature.location;
  const valid = name.trim().length > 0 && (scope === 'app' || location.trim().length > 0);

  /* Last 24h: a stable slice of the 30-day figures the row carries. */
  const dayUsers = Math.max(1, Math.round(feature.users * 0.06));
  const dayHits = Math.max(dayUsers, Math.round(feature.interactions * 0.055));

  return (
    <>
      <EntityDrawer
        open
        onClose={onClose}
        width={428}
        eyebrow="Feature"
        title={feature.name}
        footer={
          <DrawerFooter
            left={
              <IconButton
                icon={<Trash2 size={14} />}
                label="Remove feature"
                variant="ghost"
                onClick={() => setConfirm(true)}
              />
            }
            right={
              <>
                <Button size="small" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  disabled={!dirty || !valid}
                  onClick={() => {
                    onSave(feature.id, { name: name.trim(), location: nextLocation });
                    onClose();
                  }}
                >
                  Update
                </Button>
              </>
            }
          />
        }
      >
        <Section title="Tagged element">
          <div className="m-fdrawer__fields">
            <Field label="Name">
              <Input value={name} maxLength={50} autoFocus onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Selector">
              <Input value={feature.selector} disabled className="m-dmg__mono" />
            </Field>
            <Field label="Scope">
              <Segmented
                block
                size="small"
                value={scope}
                onChange={(v) => setScope(v as Scope)}
                options={[
                  { value: 'app', label: 'Entire app' },
                  { value: 'page', label: 'Specific page' },
                ]}
              />
            </Field>
            {scope === 'page' && (
              <Field label="Page">
                <Input value={location} placeholder="E.g. /checkout" onChange={(e) => setLocation(e.target.value)} />
              </Field>
            )}
          </div>
        </Section>
        <Section title="Metrics" hint="Last 24 hours">
          <div className="m-fdrawer__tiles">
            <StatTile value={dayUsers.toLocaleString()} label="Unique users" />
            <StatTile value={dayHits.toLocaleString()} label="Total interactions" tone="accent" />
          </div>
        </Section>
      </EntityDrawer>
      <ConfirmDialog
        open={confirm}
        title="Remove this feature?"
        okText="Remove"
        onCancel={() => setConfirm(false)}
        onOk={() => {
          setConfirm(false);
          onRemove(feature.id);
          onClose();
        }}
      >
        <span className="m-dlg__subject">{feature.name}</span> stops being watched. The element itself is untouched; you can
        tag it again from any recording.
      </ConfirmDialog>
    </>
  );
}
