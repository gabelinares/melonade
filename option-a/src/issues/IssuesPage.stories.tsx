import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DataState } from '@shared/issues-logic.ts';
import { useIssues } from '../state/useIssues.ts';
import { IssuesPage } from './IssuesPage.tsx';

/** The page takes its controller as a prop, so a story has to own one. Driving
 *  the state through the real controller rather than through a stubbed prop is
 *  the point: an empty list here is produced the same way the app produces it. */
function PageHarness({ dataState }: { dataState: DataState }) {
  const model = useIssues();

  /* mount-only: the setter is rebuilt with the controller on every render. */
  useEffect(() => {
    model.setDataState(dataState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataState]);

  return (
    <div style={{ padding: 'var(--m-space-6)', background: 'var(--m-surface-canvas)' }}>
      <IssuesPage model={model} />
    </div>
  );
}

const meta = {
  title: 'Issues/IssuesPage',
  component: PageHarness,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The whole page, assembled from the components in this library and nothing else. Two things are worth checking here rather than component by component. First, the header holds page-level state and the toolbar holds filters, and the split is what keeps the capture pill from being mistaken for something you can safely clear. Second, the three data states are one page and not three layouts: the shell, the header and the toolbar stay put while only the body changes, so the reader never loses their place when the data does.',
      },
    },
  },
  args: { dataState: 'ready' },
  argTypes: { dataState: { control: 'inline-radio', options: ['ready', 'loading', 'empty'] } },
} satisfies Meta<typeof PageHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { dataState: 'ready' },
  render: (args) => <PageHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'The working page against the shared dataset, sorted by impact. Everything on it is live: the category tabs and their counts, the filter and display controls, the capture pill, the row menu, the dialogs, and the caret that expands in place. Open a row and then a filter, and note that the expanded region is the only thing on the page that moves.\n\nThe write-up inside that region is currently held back by `DETAIL_IS_WIP` in `shared/flags.ts` while it is reworked, so the caret opens a note rather than the detail. The expand itself is deliberately still there: reading in place is this option\'s structural answer to "where does the detail live", and a dead caret would hide that answer along with the unfinished content. The real panel is intact and reviewable under Issues/IssueDetailPanel.',
      },
    },
  },
};

export const Loading: Story = {
  args: { dataState: 'loading' },
  render: (args) => <PageHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'Loading, and the header and toolbar stay live while the body fills with a skeleton at the table\'s own column widths. That is the decision worth seeing: a spinner over the whole card would take the filters away from the reader for as long as the request takes, and the row height matching the real row is what stops the page jumping when the data lands.',
      },
    },
  },
};

export const Empty: Story = {
  args: { dataState: 'empty' },
  render: (args) => <PageHarness key={args.dataState} dataState={args.dataState} />,
  parameters: {
    docs: {
      description: {
        story:
          'No data at all, which is a different sentence from "no results". Because the emptiness has no filter behind it, the copy explains the mechanism instead of offering a Clear button that would do nothing: the agent is watching, and the first finding usually lands within a day. The page decides which of the three empty messages to show from the shared `emptyReason` logic, so a filtered-to-nothing list and a genuinely empty project can never be given the same words.',
      },
    },
  },
};
