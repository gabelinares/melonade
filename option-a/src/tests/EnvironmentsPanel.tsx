import { useState } from 'react';
import { Button, Dropdown, Modal, Select, Tooltip } from 'antd';
import { Globe, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { RESOLUTIONS, REGIONS } from '@shared/runs-data.ts';
import type { Environment, Resolution } from '@shared/tests-data.ts';
import type { TestsController } from '../state/useTests.ts';
import { Chip } from '../components/Chip.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import '../dialogs/dialogs.css';
import './environments-panel.css';

export interface EnvironmentsPanelProps {
  model: TestsController;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE ENVIRONMENTS TAB: what the tests run against.
 *
 * The only tab that is not a list of work, and the reason it earns a place here
 * rather than in Preferences: an environment is not a setting about the agent's
 * behaviour, it is an INPUT the tests need in order to run at all. Behaviour
 * toggles and notifications live in Preferences → Agents; a URL a test opens
 * lives beside the tests.
 *
 * It therefore has no toolbar, no filters and no pagination - four rows and a
 * three-field form - and that absence is the design. A page whose sections all
 * carry the same chrome regardless of what they hold is a page that has stopped
 * reading what is in them.
 *
 * THE ONE PIECE OF REAL WORK HERE IS THE DELETE. An environment is referenced
 * by tests, so removing it stops some of them, and the dialog names them before
 * the click rather than reporting them after it.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function EnvironmentsPanel({ model }: EnvironmentsPanelProps) {
  const [target, setTarget] = useState<Environment | null>(null);
  const [editing, setEditing] = useState<Environment | 'new' | null>(null);

  const impact = target ? model.envImpact(target.name) : null;

  return (
    <div className="m-envs">
      <section className="m-envs__section">
        <header className="m-envs__head">
          <div>
            <h2 className="m-envs__title">Environments</h2>
            <p className="m-envs__sub">The URLs and credentials your tests run against.</p>
          </div>
          {/* Secondary on purpose. A primary button inside a section header
              competes with the page's own primary action two rows above it. */}
          <Button icon={<Plus size={14} />} onClick={() => setEditing('new')}>
            Add environment
          </Button>
        </header>

        {model.environments.length === 0 ? (
          <EmptyState
            title="No environments yet"
            hint="A test needs somewhere to run: add the URL of the app you want the agent to open."
          />
        ) : (
          <ul className="m-envs__list">
            {model.environments.map((env) => {
              const off = env.active === false;
              return (
                <li
                  key={env.id}
                  className={`m-envs__row${off ? ' is-off' : ''}`}
                  onClick={() => setEditing(env)}
                >
                  <div className="m-envs__cell">
                    <div className="m-envs__name-line">
                      <span className="m-envs__name m-truncate">{env.name}</span>
                      {off && (
                        <Tooltip title="Kept, but tests do not run against it.">
                          <span>
                            <Chip kind="status" tone="warning">Off</Chip>
                          </span>
                        </Tooltip>
                      )}
                      {env.hasCredentials ? <Chip kind="status">Signs in</Chip> : <Chip kind="status">No credentials</Chip>}
                      {!!env.headerCount && (
                        <Chip kind="status">
                          {env.headerCount} {env.headerCount === 1 ? 'header' : 'headers'}
                        </Chip>
                      )}
                      {env.ignoresSslErrors && <Chip kind="status">Ignores SSL errors</Chip>}
                    </div>
                    <span className="m-envs__url m-truncate">
                      <Globe size={12} aria-hidden="true" />
                      {env.url}
                    </span>
                  </div>
                  {/* The same kebab every row in this app carries, rather than
                      controls that appear on hover: an action nobody can see
                      until they are already over it is an action nobody finds. */}
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    menu={{
                      items: [
                        { key: 'edit', icon: <Pencil size={13} />, label: 'Edit' },
                        { type: 'divider' },
                        { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
                      ],
                      onClick: ({ key, domEvent }) => {
                        domEvent.stopPropagation();
                        if (key === 'edit') setEditing(env);
                        else setTarget(env);
                      },
                    }}
                  >
                    <Button
                      type="text"
                      size="small"
                      aria-label={`Actions for ${env.name}`}
                      icon={<MoreHorizontal size={15} />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="m-envs__section">
        <header className="m-envs__head">
          <div>
            <h2 className="m-envs__title">Default run configuration</h2>
            <p className="m-envs__sub">New tests start with these. You can override them per test.</p>
          </div>
        </header>
        {/* Single values, not the multi-select matrix a test carries: a default
            is where a new test STARTS, and a test that starts on three
            environments starts as an argument. */}
        <div className="m-envs__defaults">
          <label className="m-envs__field">
            <span className="m-envs__label">Environment</span>
            <Select
              allowClear
              value={model.defaults.envName}
              placeholder="Not set"
              onChange={(envName) => model.setDefaults({ envName })}
              options={model.environments.map((e) => ({ value: e.name, label: e.name }))}
            />
          </label>
          <label className="m-envs__field">
            <span className="m-envs__label">Viewport</span>
            <Select
              value={model.defaults.resolution}
              placeholder="Not set"
              onChange={(resolution: Resolution) => model.setDefaults({ resolution })}
              options={RESOLUTIONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </label>
          <label className="m-envs__field">
            <span className="m-envs__label">Region</span>
            <Select
              value={model.defaults.region}
              placeholder="Not set"
              onChange={(region) => model.setDefaults({ region })}
              options={REGIONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </label>
        </div>
      </section>

      {/* ── delete ───────────────────────────────────────────────────────────
          Never silent. Tests whose ONLY environment this is stop running and
          are named here; tests that run somewhere else too just lose this one
          and carry on, which is a different sentence and gets one. */}
      <Modal
        title="Delete this environment?"
        open={target != null}
        onCancel={() => setTarget(null)}
        okText={impact && impact.paused.length > 0 ? 'Pause those tests and delete' : 'Delete'}
        okButtonProps={{ danger: true }}
        onOk={() => {
          if (target) model.deleteEnvironment(target);
          setTarget(null);
        }}
        width={480}
        destroyOnHidden
      >
        {impact && impact.paused.length > 0 ? (
          <>
            <p className="m-dlg__lede">
              <span className="m-dlg__subject">{target?.name}</span> is the only environment these
              tests have. Deleting it pauses them until somebody gives them another one.
            </p>
            <ul className="m-envs__affected">
              {impact.paused.map((tc) => (
                <li key={tc.key}>{tc.title}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="m-dlg__lede">
            <span className="m-dlg__subject">{target?.name}</span> is not the only environment of
            any running test, so nothing stops. This cannot be undone.
          </p>
        )}
        {impact && impact.detached.length > 0 && (
          <p className="m-envs__aside">
            It also comes off {impact.detached.length}{' '}
            {impact.detached.length === 1 ? 'test that runs' : 'tests that run'} on other
            environments. Those keep running.
          </p>
        )}
      </Modal>

      <StubDrawer
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New environment' : (editing?.name ?? '')}
        meta={editing && editing !== 'new' ? <span>{editing.url}</span> : undefined}
        note="The environment form — the URL, the sign-in credentials, extra request headers, the SSL setting and the on/off switch — is the next piece. Deleting one is built, because that is the part that reaches into the tests."
      />
    </div>
  );
}
