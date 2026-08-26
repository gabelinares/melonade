import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandLoader } from './BrandLoader.tsx';

const meta = {
  title: 'Components/BrandLoader',
  component: BrandLoader,
  args: { label: 'Finding the best sessions' },
  parameters: {
    docs: {
      description: {
        component:
          'The loader, and it is the Melonade mark rather than a spinner. The mark already ' +
          'has one honest piece of motion in it - the disc and the small square trading ' +
          'places - and it is the only watermelon thing in this app, so it is the one element ' +
          'that can move without competing with anything.\n\n' +
          '**It does not cover anything.** A loader laid over the content it is replacing has ' +
          'to be positioned, has to have a backdrop, and hides the skeletons that are doing ' +
          "the more useful half of the job. This one sits on the section's own header line, in " +
          'the slot the hint text occupies the rest of the time, so nothing moves when it ' +
          'appears and nothing moves when it goes. See `Issues/SessionStrip`.',
      },
    },
  },
} satisfies Meta<typeof BrandLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Larger: Story = { args: { size: 22, label: 'Re-scoring the shortlist' } };
