import { useState } from 'react';
import { SegmentedControl, Slider } from '@mantine/core';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { AGENTS } from '../nav/agents.ts';
import type { DataState } from '@shared/issues-logic.ts';
import './prototype-panel.css';

export interface PrototypePanelProps {
  agentCount: number;
  onAgentCount: (n: number) => void;
  dataState: DataState;
  onDataState: (s: DataState) => void;
}

/**
 * Reviewer controls, deliberately not dressed as product UI.
 *
 * The brief's real question is "how will the menu look once there is more in
 * it", and that is answered by looking rather than by reading a claim. So drag
 * the count to eleven and watch the rail. Same for the states a demo usually
 * hides: loading and empty are where list designs actually fail.
 *
 * It starts collapsed because it is fixed to a corner and would otherwise cover
 * the bottom of the pane it is meant to help you judge.
 */
export function PrototypePanel({
  agentCount,
  onAgentCount,
  dataState,
  onDataState,
}: PrototypePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={`b-proto${open ? ' is-open' : ''}`} aria-label="Prototype controls">
      <button
        type="button"
        className="b-proto__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <FlaskConical size={13} aria-hidden="true" />
        <span>Prototype controls</span>
        <ChevronDown size={13} className="b-proto__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className="b-proto__body">
          <div className="b-proto__field">
            <span className="b-proto__label">
              Agents in the rail
              <span className="b-proto__value">{agentCount}</span>
            </span>
            <Slider
              min={1}
              max={AGENTS.length}
              value={agentCount}
              onChange={onAgentCount}
              label={null}
              size="sm"
            />
            <p className="b-proto__hint">
              Three ship today. The rail is 56px wide at every one of these.
            </p>
          </div>

          <div className="b-proto__field">
            <span className="b-proto__label">Queue state</span>
            <SegmentedControl
              fullWidth
              size="xs"
              value={dataState}
              onChange={(v) => onDataState(v as DataState)}
              data={[
                { value: 'ready', label: 'Loaded' },
                { value: 'loading', label: 'Loading' },
                { value: 'empty', label: 'Empty' },
              ]}
            />
          </div>

          <p className="b-proto__hint">
            Cmd K opens the command palette. J and K walk the queue.
          </p>
        </div>
      )}
    </aside>
  );
}
