import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DataState } from '@shared/issues-logic.ts';
import { useAudits } from '../state/useAudits.ts';
import { AuditsPage } from './AuditsPage.tsx';

function PageHarness({ dataState }: { dataState: DataState }) {
  const model = useAudits();
  return (
    <div style={{ padding: 'var(--m-space-6)', background: 'var(--m-surface-canvas)' }}>
      <AuditsPage model={model} dataState={dataState} />
    </div>
  );
}

const meta = {
  title: 'Audits/AuditsPage',
  component: PageHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The audits list — the shortest page in the app, deliberately. An audit is a job whose product is a report, so this page tells you which audits exist, which are still reading and how each one came out, and stops there. The running row advances while the story is open, which is the only way to see a job become a finished one; note that it never prints a percentage, because the duration is unknowable and a number would be a promise.',
      },
    },
  },
  args: { dataState: 'ready' },
  argTypes: { dataState: { control: 'inline-radio', options: ['ready', 'loading', 'empty'] } },
} satisfies Meta<typeof PageHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { dataState: 'loading' } };
export const FirstRun: Story = { args: { dataState: 'empty' } };
