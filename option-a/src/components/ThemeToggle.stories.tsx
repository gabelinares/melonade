import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggle } from './ThemeToggle.tsx';

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A three-way cycle, light to dark to system, and it reads its label from the provider rather than from local state. It only renders inside `<ThemeProvider>`, which the preview decorator supplies for every story in this Storybook: called outside it the hook throws, on purpose, because a theme control that silently no-ops is worse than one that fails loudly. Clicking it here moves the real theme, so it and the toolbar picker are driving the same mechanism, which is the thing this story is actually checking.',
      },
    },
  },
};
