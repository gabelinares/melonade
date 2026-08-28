import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchField } from './SearchField.tsx';

const meta = {
  title: 'Components/SearchField',
  component: SearchField,
  args: { placeholder: 'Search tests', value: '', onChange: () => {} },
  parameters: {
    docs: {
      description: {
        component:
          'The header’s search box, at one width on every page. It is a component rather than three copies of the same className because the width is a layout decision — it shrinks below 900px so the header’s action cluster never wraps — and a decision made in three places is a decision that drifts. The placeholder is also the accessible name: an unlabelled box in a header is a box that could be searching anything.',
      },
    },
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Typing: Story = {
  render: () => {
    const [v, setV] = useState('checkout');
    return <SearchField placeholder="Search tests" value={v} onChange={setV} />;
  },
};
