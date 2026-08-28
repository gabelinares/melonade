import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DataState } from '@shared/issues-logic.ts';
import { useRuns } from '../state/useRuns.ts';
import { useTests } from '../state/useTests.ts';
import { TestsPage, type TestsSection } from './TestsPage.tsx';

/** The page takes its controller as a prop, so a story owns one. Driving the
 *  real controller rather than a stubbed prop is the point: the filtered and
 *  sorted states here are produced exactly the way the app produces them. */
function PageHarness({ dataState, section }: { dataState: DataState; section: TestsSection }) {
  const model = useTests();
  const runs = useRuns();
  /* The app keeps the section in the shell, because the menu writes it too.
     Here the story's control seeds it and the page's own tab strip moves it, so
     the strip is live rather than a picture of one. */
  const [current, setCurrent] = useState<TestsSection>(section);
  useEffect(() => setCurrent(section), [section]);
  return (
    <div style={{ padding: 'var(--m-space-6)', background: 'var(--m-surface-canvas)' }}>
      <TestsPage model={model} runs={runs} section={current} onSection={setCurrent} dataState={dataState} />
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
          'The whole Tests agent: three sections under one name. The TITLE STAYS “Tests” in all three, and the strip under it moves between them — a heading that renamed itself to “Runs” was indistinguishable from a page you had left Tests for. The menu carries the same three as nested rows, which is how you jump into one from elsewhere in the app; the strip is how you know there are three at all once you are reading the page. The toolbar under the header belongs to the section, and Environments has none at all, which is the point. The tests list itself is assembled from the same components the issue queue uses and nothing else — same shell, same table rhythm, same toolbar split between what is shown and how it is filtered. Two things are worth checking here rather than component by component. First, the default order is a queue and not a sort: drafts, then anything waiting on a review, then the rest, and a column header replaces that ordering wholesale rather than sorting inside it. Second, selecting rows swaps the toolbar’s right-hand cluster for the actions that apply to them, in the same slot, so the table never moves down the page to make room for a banner.',
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
