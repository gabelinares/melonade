import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleX, Gauge, MousePointerClick } from 'lucide-react';
import { FilterStrip } from './FilterStrip.tsx';

const meta = {
  title: 'Components/FilterStrip',
  component: FilterStrip,
  parameters: {
    docs: {
      description: {
        component:
          'One control, two meanings, which is the whole reason it exists. It draws pressed state and reports clicks; whether pressing one item releases the others is the page’s arithmetic, not the strip’s. Segmented cannot do that — it is single-select by construction — and keeping a lookalike beside it is how two neighbouring controls drift by a pixel and then by four.',
      },
    },
  },
} satisfies Meta<typeof FilterStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tests and Audits: five views of one list, so exactly one is ever on. */
export const Exclusive: Story = {
  args: { items: [], selected: [], onSelect: () => {}, label: 'Filter by status' },
  render: () => {
    const [on, setOn] = useState('all');
    return (
      <FilterStrip
        label="Filter by status"
        items={[
          { key: 'all', label: 'All', count: 31 },
          { key: 'draft', label: 'Drafts', count: 5 },
          { key: 'needs_review', label: 'Needs review', count: 2 },
          { key: 'approved', label: 'Approved', count: 2 },
          { key: 'active', label: 'Active', count: 18 },
          { key: 'paused', label: 'Paused', count: 4 },
        ]}
        selected={[on]}
        onSelect={setOn}
      />
    );
  },
};

/** The issue queue: category is a dimension like any other, so any number of
 *  items can be on and "All" is the empty selection rather than a fourth
 *  option. */
export const Multiple: Story = {
  args: { items: [], selected: [], onSelect: () => {}, label: 'Filter by category' },
  render: () => {
    const [cats, setCats] = useState<string[]>([]);
    return (
      <FilterStrip
        label="Filter by category"
        items={[
          { key: 'all', label: 'All', count: 134 },
          { key: 'Errors', label: 'Errors', count: 61, icon: <CircleX size={13} /> },
          { key: 'UI/UX', label: 'UI/UX', count: 44, icon: <MousePointerClick size={13} /> },
          { key: 'Slowness', label: 'Slowness', count: 29, icon: <Gauge size={13} /> },
        ]}
        selected={cats.length === 0 ? ['all'] : cats}
        onSelect={(key) =>
          setCats((prev) =>
            key === 'all' ? [] : prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
          )
        }
      />
    );
  },
};
