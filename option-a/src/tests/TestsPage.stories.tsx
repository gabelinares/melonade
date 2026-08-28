import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DataState } from '@shared/issues-logic.ts';
import { useRuns } from '../state/useRuns.ts';
import { useTests } from '../state/useTests.ts';
import { TestsPage } from './TestsPage.tsx';

/** The page takes its controller as a prop, so a story owns one. Driving the
 *  real controller rather than a stubbed prop is the point: the filtered and
 *  sorted states here are produced exactly the way the app produces them. */
function PageHarness({ dataState, section }: { dataState: DataState; section: 'list' | 'runs' | 'environments' }) {
  const model = useTests();
  const runs = useRuns();
  return (
    <div style={{ padding: 'var(--m-space-6)', background: 'var(--m-surface-canvas)' }}>
      <TestsPage model={model} runs={runs} section={section} dataState={dataState} />
    </div>
  );
}

const meta = {
  title: 'Tests/TestsPage',
  component: PageHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The whole Tests agent: three sections under one name. In the app the SIDEBAR switches between them — the page has no tab strip, because two navigations to the same three places ten pixels apart is one too many — so here the control does it instead. The toolbar under the header belongs to the section, and Environments has none at all, which is the point. The tests list itself is assembled from the same components the issue queue uses and nothing else — same shell, same table rhythm, same toolbar split between what is shown and how it is filtered. Two things are worth checking here rather than component by component. First, the default order is a queue and not a sort: drafts, then anything waiting on a review, then the rest, and a column header replaces that ordering wholesale rather than sorting inside it. Second, selecting rows swaps the toolbar’s right-hand cluster for the actions that apply to them, in the same slot, so the table never moves down the page to make room for a banner.',
      },
    },
  },
  args: { dataState: 'ready', section: 'list' },
  argTypes: {
    dataState: { control: 'inline-radio', options: ['ready', 'loading', 'empty'] },
    section: { control: 'inline-radio', options: ['list', 'runs', 'environments'] },
  },
} satisfies Meta<typeof PageHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Runs: Story = { args: { section: 'runs' } };
export const Environments: Story = { args: { section: 'environments' } };
export const Loading: Story = { args: { dataState: 'loading' } };
/** Nothing to set up and nothing to import: the agent is already watching, and
 *  what this state has to teach is that drafts arrive on their own. */
export const FirstRun: Story = { args: { dataState: 'empty' } };
