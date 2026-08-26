import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import type { DataState } from '@shared/issues-logic.ts';
import { useIssues } from '../state/useIssues.ts';
import { IssueListColumn } from './IssueListColumn.tsx';

/**
 * The column takes its controller as a prop, so a story has to own one. Driving
 * the state through the REAL controller rather than through stubbed props is the
 * point: an empty list here is produced the same way the app produces it, and the
 * empty copy is chosen by the same shared `emptyReason` logic.
 *
 * Two frame overrides, both scoped to this story and neither touching the app.
 * The column is `height: 100%`, so a frame has to hand it a height or the scroll
 * region never engages. And the app narrows it below 1080px and drops it entirely
 * below 820px, which is correct for a two-pane layout and wrong inside a docs page
 * that can be any width, so the frame pins it to its full `list-width`.
 */
function ColumnHarness({ dataState }: { dataState: DataState }) {
  const model = useIssues();

  /* mount-and-arg only: the setter is rebuilt with the controller on every
     render, so listing it would loop. */
  useEffect(() => {
    model.setDataState(dataState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataState]);

  return (
    <div
      className="sb-column-frame"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 720,
        background: 'var(--m-surface-canvas)',
      }}
    >
      <style>
        {'.sb-column-frame .b-list { display: flex; width: var(--m-list-width); }'}
      </style>
      <IssueListColumn
        model={model}
        onOpenCritical={action('open the critical dialog')}
        onOpenSearch={action('open the command palette')}
      />
      <div
        style={{
          flex: 1,
          padding: 'var(--m-space-7)',
          background: 'var(--m-surface-default)',
          fontSize: 'var(--m-text-sm)',
          color: 'var(--m-content-muted)',
        }}
      >
        Where the detail pane goes. Selecting a row in the column does not move
        anything here, which is the one thing this story cannot show you.
      </div>
    </div>
  );
}

const meta = {
  title: 'Issues/IssueListColumn',
  component: ColumnHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The triage column: the queue, permanently on screen. Two structural decisions are worth checking here rather than component by component. GROUPED, NOT SORTED: the rows sit under a sticky header per impact band, because a sortable table asks the reader to choose an order and then read a flat list, whereas a grouped list has already made the only ordering decision that matters and tells you where you are in it while you scroll. It is also what lets the impact indicator shrink to a dot. NO PAGINATION: the column scrolls. Paging exists to stop a wide table running off a page, and there is no page here, so "back to page 3" would be exactly the cost this layout was built to remove. Everything in the head is live: the capture pill, the category row, the narrowing popover, and the active-filter chips that spell out why the list is short.',
      },
    },
  },
  args: { dataState: 'ready' },
  argTypes: { dataState: { control: 'inline-radio', options: ['ready', 'loading', 'empty'] } },
} satisfies Meta<typeof ColumnHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { dataState: 'ready' },
  render: (args) => <ColumnHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'The working column against the shared dataset. Scroll it and watch the band headers stick: that is the grouping doing the job a sort control would otherwise be asked to do. Then narrow the list from the sliders popover and watch the active-filter chips appear under the filter row, which is the answer to "why is this list short" without anyone having to reopen a popover to find out.',
      },
    },
  },
};

export const Loading: Story = {
  args: { dataState: 'loading' },
  render: (args) => <ColumnHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'Loading, and the head stays live while only the queue is replaced. That is the decision worth seeing: a spinner over the column would take the capture pill and the filters away from the reader for as long as the request takes, and those are exactly the controls somebody reaches for while waiting. The skeleton rows are drawn at the real `row-height`, so nothing shifts when the data lands.',
      },
    },
  },
};

export const Empty: Story = {
  args: { dataState: 'empty' },
  render: (args) => <ColumnHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'No data at all, which is a different sentence from "no results". Because nothing is filtered, the copy explains the mechanism instead of offering a Clear button that would do nothing: the agent is reading this project\'s sessions and the first finding usually lands within a day. Which of the three empty messages appears is decided by the shared `emptyReason` logic, so a filtered-to-nothing list and a genuinely empty project can never be given the same words. Switch the filters on in the Default story to see the other two.',
      },
    },
  },
};
