import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import type { DataState } from '@shared/issues-logic.ts';
import { SHIPPED_AGENT_COUNT } from '../nav/agents.ts';
import { PrototypePanel } from './PrototypePanel.tsx';

/**
 * The panel is `position: fixed` to the bottom-right of the window, because in
 * the app it floats over a console that owns the whole viewport. In a story that
 * would pin it to the corner of the preview iframe and, on a docs page, to the
 * corner of the scroll container. The frame below gives it a positioning context
 * and reparents it with a scoped override, so the component itself is untouched.
 *
 * It also owns none of its state, so the harness holds both controls: dragging
 * the slider has to actually move the number or the panel is a screenshot.
 */
function PanelFrame() {
  const [agentCount, setAgentCount] = useState(SHIPPED_AGENT_COUNT);
  const [dataState, setDataState] = useState<DataState>('ready');

  return (
    <div
      className="sb-proto-frame"
      style={{
        position: 'relative',
        height: 400,
        padding: 'var(--m-space-7)',
        background: 'var(--m-surface-default)',
        overflow: 'hidden',
      }}
    >
      <style>{'.sb-proto-frame .b-proto { position: absolute; }'}</style>
      <p style={{ fontSize: 'var(--m-text-sm)', color: 'var(--m-content-muted)', maxWidth: '52ch' }}>
        Stand-in for the console the panel floats over. It reports {agentCount} agents in the
        rail and a queue state of "{dataState}".
      </p>
      <PrototypePanel
        agentCount={agentCount}
        onAgentCount={(n) => {
          action('agent count')(n);
          setAgentCount(n);
        }}
        dataState={dataState}
        onDataState={(s) => {
          action('queue state')(s);
          setDataState(s);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'App/PrototypePanel',
  component: PanelFrame,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Reviewer controls, and they are deliberately styled as scaffolding: a dashed border, a lab-flask glyph, monospace-adjacent labels and no product colour anywhere on it. That is not laziness, it is the whole reason it can exist. A control panel dressed like product UI makes a reviewer stop and wonder whether it ships, and then spend their attention auditing the panel instead of the design it is there to help them judge. Dashed means temporary, and everybody already knows that. It starts collapsed because it is anchored to a corner and would otherwise cover the bottom of the pane it is meant to help you look at. Open it: the slider is the brief\'s real question, which is what the rail looks like once there is more in it, and the queue-state control exposes the two states a demo usually hides, which are the two where list designs actually fail.',
      },
    },
  },
} satisfies Meta<typeof PanelFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <PanelFrame />,
  parameters: {
    docs: {
      description: {
        story:
          'Both controls live, wired to local state so the numbers move. In the app the same two handlers reach the rail and the shared issues controller, which is why the panel is a component with props rather than a hook reaching into a store: the thing it drives is real state, and a debug panel that drives its own private copy of state would let a reviewer see a queue nobody else can reproduce.',
      },
    },
  },
};
