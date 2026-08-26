import { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { screen, userEvent, within } from 'storybook/test';
import {
  DEFAULT_DISPLAY,
  displayChangeCount,
  toggleField,
  type Display,
  type FieldKey,
} from '@shared/issues-logic.ts';
import { DisplayMenu } from './DisplayMenu.tsx';

/**
 * The three selects and the six pills are all controlled, so a harness that
 * only passed a frozen `Display` would render a menu where nothing responds and
 * the reset row could never appear. This holds the real shape in state and
 * derives the badge from `displayChangeCount()`, the same function the page
 * uses, so the badge cannot say a number the menu does not show.
 */
function DisplayMenuHarness({
  initialDisplay,
  unsupportedFields,
}: {
  initialDisplay: Display;
  unsupportedFields?: readonly FieldKey[];
}) {
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
        unsupportedFields={unsupportedFields}
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

/** Opens the popover and waits for its contents, which are portalled out of the
 *  story root and so are found on the screen rather than on the canvas. */
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
          'Two icon buttons sit on this toolbar and they have to be told apart at a glance, so this one is sliders and the filter is a funnel. No badge here, because the display is at its default: a badge that appeared on an unchanged view would train people to ignore it.',
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
          'All three rows and the field pills, opened by the story. Two departures from the reference this is modelled on are visible here. There is no List / Board toggle, because there is no board, and shipping a control for a view that does not exist to look complete is worse than the gap it hides. Hidden issues is a three-way rather than a switch, because a boolean cannot say "show me only the ones I hid", which is the question you have when auditing what the agent was told to ignore.',
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
          'Grouped by impact and ordered by last seen, so the trigger carries a 2. The badge counts distance from this option\'s own baseline rather than from a shared default, because the two design options start from different places and measuring both against one constant would make one of them permanently look modified. The reset row only exists while that distance is non-zero, which is why it is absent from `Open` and present here.',
      },
    },
  },
};

export const WithUnsupportedField: Story = {
  args: { unsupportedFields: ['sessions'] },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
  },
  parameters: {
    docs: {
      description: {
        story:
          'Five pills, not six: `unsupportedFields={[\'sessions\']}` removes the Sessions pill instead of disabling it. A table has columns to toggle and a two-line row does not have all the same ones, so the menu offers only the fields this option can actually draw. Offering a pill that changes nothing is the same defect as a toggle for a board that does not exist, and a disabled pill would still be a promise that the field arrives later.',
      },
    },
  },
};
