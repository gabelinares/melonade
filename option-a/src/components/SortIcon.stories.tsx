import type { Meta, StoryObj } from '@storybook/react-vite';
import { SortIcon } from './SortIcon.tsx';

const meta = {
  title: 'Components/SortIcon',
  component: SortIcon,
  parameters: {
    docs: {
      description: {
        component:
          'What a sortable column header shows instead of antd’s pair of filled triangles. Idle is the double chevron — nothing is sorted, both directions are on offer — and a sorted column shows the one direction it is in, rather than two arrows with one of them lit. It is the same lucide chevron the project switcher in the menu uses: “this can move up or down” is one gesture and it should look the same everywhere. Spread `sortable` into a column instead of writing `sorter: true`, so no table can go back to the triangles by forgetting the icon.',
      },
    },
  },
  args: { sortOrder: null },
  argTypes: { sortOrder: { control: 'inline-radio', options: [null, 'ascend', 'descend'] } },
} satisfies Meta<typeof SortIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unsorted: Story = {};
export const Ascending: Story = { args: { sortOrder: 'ascend' } };
export const Descending: Story = { args: { sortOrder: 'descend' } };
