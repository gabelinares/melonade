import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Dropdown, Input, Segmented } from 'antd';
import { BookOpen, MoreHorizontal, Settings2 } from 'lucide-react';
import { ISSUES } from '@shared/issues-data.ts';
import { CountSuffix } from './CountSuffix.tsx';
import { INITIAL_STATE, filterDimensions } from '@shared/issues-logic.ts';
import { FilterMenu } from './FilterMenu.tsx';
import { Chip } from './Chip.tsx';
import { ImpactMeter } from './ImpactMeter.tsx';
import { PageCard } from './PageCard.tsx';
import { RelativeTime } from './RelativeTime.tsx';

const INFO =
  "What the agent found while reading this project's session replays, ranked by how many people it reaches.";

/** A stand-in for the real table: enough rows to show that the body is the
 *  only part of the shell a page gets to fill. */
function Rows() {
  return (
    <div style={{ display: 'grid' }}>
      {ISSUES.slice(0, 4).map((issue) => (
        <div
          key={issue.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--m-space-5)',
            height: 'var(--m-row-height)',
            padding: '0 var(--m-space-5)',
            borderBottom: '1px solid var(--m-border-subtle)',
          }}
        >
          <span style={{ flex: 'none', width: 108 }}>
            <ImpactMeter value={issue.impact} />
          </span>
          <span className="m-truncate" style={{ flex: 1 }}>
            {issue.head}
          </span>
          <span style={{ flex: 'none' }}>
            <Chip>{issue.cat}</Chip>
          </span>
          <span style={{ flex: 'none', width: 72, textAlign: 'right' }}>
            <RelativeTime minutesAgo={issue.seenAgoMin} />
          </span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'Components/PageCard',
  component: PageCard,
  args: { title: 'Issues', children: <Rows /> },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  args: { title: 'Issues' },
  parameters: {
    docs: {
      description: {
        story:
          'The header with nothing in it but the title. It used to be a hard 44px row so that a title lined up across pages that each held different controls; now that the card is the whole content plane rather than one card among several, the header is real padding and the title is the first thing in the page rather than a label on a box.',
      },
    },
  },
};

export const WithSubtitle: Story = {
  args: { title: 'Issues', meta: ISSUES.length, subtitle: INFO },
  parameters: {
    docs: {
      description: {
        story:
          'A count beside the title, and the page\'s own description on the line under it. That sentence used to live behind an info icon, back when the header was a fixed 44px row and a second line would have made one page taller than the rest. Every page has the room now, and a page\'s own description is not a footnote.',
      },
    },
  },
};

export const WithActions: Story = {
  args: {
    title: 'Issues',
    meta: ISSUES.length,
    subtitle: INFO,
    actions: (
      <>
        <Input placeholder="Search issues" style={{ width: 200 }} aria-label="Search issues" />
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'settings', icon: <Settings2 size={13} />, label: 'Issues settings' },
              { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
            ],
          }}
        >
          <Button type="text" size="small" aria-label="More" icon={<MoreHorizontal size={15} />} />
        </Dropdown>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The right-hand cluster, and a demonstration of what belongs in it. Search acts on this page, so it stays visible; Settings and Documentation are destinations, so they collapse into one overflow. Two more full-width buttons here is how the search field ends up too narrow to read a query in.',
      },
    },
  },
};

export const WithToolbar: Story = {
  args: {
    title: 'Issues',
    meta: ISSUES.length,
    toolbar: (
      <>
        <Segmented
          defaultValue="All"
          options={[
            { value: 'All', label: <span>All<CountSuffix n={ISSUES.length} /></span> },
            { value: 'Errors', label: <span>Errors<CountSuffix n={5} /></span> },
            { value: 'UI/UX', label: <span>UI/UX<CountSuffix n={4} /></span> },
          ]}
        />
        {/* The toolbar's right cluster is now one filter control plus one
            display control, so the shell's `toolbar` slot is demonstrated with
            the real thing rather than a stand-in. */}
        <span style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <FilterMenu
            dimensions={filterDimensions(INITIAL_STATE)}
            isActive={() => false}
            onToggle={() => undefined}
            activeCount={2}
          />
        </span>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The second row, which exists so filters and tabs never have to fight the title for the 44px header. Everything in here narrows what the body shows and nothing in here changes state elsewhere, which is the line that decides whether a control belongs in the toolbar or in the header.',
      },
    },
  },
};

export const Full: Story = {
  args: {
    title: 'Issues',
    meta: ISSUES.length,
    subtitle: INFO,
    lede: <Chip tone="info">Capturing 2 segments</Chip>,
    actions: (
      <Input placeholder="Search issues" style={{ width: 200 }} aria-label="Search issues" />
    ),
    toolbar: (
      <Segmented
        defaultValue="All"
        options={[
          { value: 'All', label: <span>All<CountSuffix n={ISSUES.length} /></span> },
          { value: 'Errors', label: <span>Errors<CountSuffix n={5} /></span> },
          { value: 'UI/UX', label: <span>UI/UX<CountSuffix n={4} /></span> },
        ]}
      />
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Every slot filled at once, over a table-shaped body. Worth stating because the props table cannot: there is deliberately no `className` and no `style` on this shell. Handing pages an escape hatch is precisely how the live app ended up with four different header heights and three paddings, so when a page needs something the shell cannot say, the shell changes and every page gets it.',
      },
    },
  },
};
