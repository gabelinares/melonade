import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { screen, userEvent, within } from 'storybook/test';
import {
  DEFAULT_DISPLAY,
  displayChangeCount,
  toggleField,
  type Display,
} from '@shared/issues-logic.ts';
import { DisplayMenu } from './DisplayMenu.tsx';

/**
 * The three selects and the six pills are all controlled, so a harness passing a
 * frozen `Display` would render a menu where nothing responds and the reset row
 * could never appear. This holds the real shape in state and derives the badge
 * from `displayChangeCount()`, the same function the column uses, so the badge
 * cannot report a number the menu does not show.
 */
function DisplayMenuHarness({ initialDisplay }: { initialDisplay: Display }) {
  const [display, setDisplay] = useState<Display>(initialDisplay);

  const set = useCallback(<K extends keyof Display>(key: K, value: Display[K]) => {
    action('set')(key, value);
    setDisplay((d) => ({ ...d, [key]: value }));
  }, []);

  return (
    <div style={{ width: 340, display: 'flex', justifyContent: 'flex-end', padding: 'var(--m-space-4)' }}>
      <DisplayMenu
        display={display}
        changeCount={displayChangeCount(display)}
        onSet={set}
        onToggleField={(f) => {
          action('toggleField')(f);
          setDisplay((d) => toggleField(d, f));
        }}
        onReset={() => {
          action('reset')();
          setDisplay(DEFAULT_DISPLAY);
        }}
      />
    </div>
  );
}

/** Opens the dropdown and waits for its contents, which Mantine portals out of
 *  the story root and so are found on the screen rather than on the canvas. */
const openMenu = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: /^Display/ }));
  await screen.findByText('Fields');
};

const meta = {
  title: 'Components/DisplayMenu',
  component: DisplayMenuHarness,
  args: { initialDisplay: DEFAULT_DISPLAY },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'How the list is drawn, as distinct from which rows are in it. It sits behind its own trigger rather than inside the filter menu because none of these narrow the result set, and folding them in would make the filter badge count something the filter menu cannot account for. As with the filter menu, the useful stories here are the open ones.',
      },
    },
  },
} satisfies Meta<typeof DisplayMenuHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Two icon buttons share this header and have to be told apart at a glance, so this one is sliders and the filter is a funnel. No badge, because the display is at its default: a badge that showed up on an unchanged view would teach people to ignore it.',
      },
    },
  },
};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
  },
  parameters: {
    docs: {
      description: {
        story:
          'All three rows and the field pills, opened by the story. Two departures from the reference this is modelled on are visible. There is no List / Board toggle, because there is no board, and shipping a control for a view that does not exist in order to look complete is worse than the gap it hides. Hidden issues is a three-way rather than a switch, because a boolean cannot say "show me only the ones I hid", which is the question you have when auditing what the agent was told to ignore.',
      },
    },
  },
};

export const Changed: Story = {
  args: {
    initialDisplay: { ...DEFAULT_DISPLAY, group: 'impact', sort: 'recent' },
  },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
  },
  parameters: {
    docs: {
      description: {
        story:
          'Grouped by impact and ordered by last seen, so the trigger carries a 2 and the selects show where the 2 came from. The reset row exists only while that distance is non-zero, which is why it is absent from `Open` and present here: a permanent reset control on an unmodified view is a button that does nothing, and this menu already refuses one of those in the missing board toggle.',
      },
    },
  },
};
