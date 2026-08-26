import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { ISSUES } from '@shared/issues-data.ts';
import {
  NO_SESSION_FILTERS,
  sessionPool,
  shortlistSessions,
  toggleSessionFilter,
  type SessionFilters,
} from '@shared/issues-logic.ts';
import type { SidePanel } from '../state/useIssues.ts';
import { WorkPane, type Depth } from './WorkPane.tsx';

const ISSUE = ISSUES[0]!;
const POOL = sessionPool(ISSUE);

type Start = 'triage' | 'watch' | 'wide';

/** The real state machine, in miniature: depth is DERIVED from whether a
 *  session is open, exactly as `useIssues` derives it in the app. */
function Harness({ start }: { start: Start }) {
  const [openIndex, setOpenIndex] = useState<number | null>(start === 'triage' ? null : 0);
  const [sidePanel, setSidePanel] = useState<SidePanel | null>(start === 'wide' ? null : 'journey');
  const [peek, setPeek] = useState(false);
  const [filters, setFilters] = useState<SessionFilters>(NO_SESSION_FILTERS);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(3);
  const [autoplay, setAutoplay] = useState(false);
  const [queueOpen, setQueueOpen] = useState(true);
  const depth: Depth = openIndex == null ? 'triage' : 'watch';

  const shortlist = shortlistSessions(POOL, filters, query);
  const step = (delta: number) => {
    const reachable = shortlist.slice(0, visible);
    const current = openIndex != null ? POOL[openIndex] : undefined;
    const i = current ? reachable.indexOf(current) : -1;
    const next = reachable[Math.min(reachable.length - 1, Math.max(0, i + delta))];
    if (next) setOpenIndex(POOL.indexOf(next));
  };

  return (
    <div style={{ display: 'flex', height: 780, background: 'var(--m-surface-canvas)' }}>
      <WorkPane
        issue={ISSUE}
        title={ISSUE.head}
        depth={depth}
        peek={peek}
        openIndex={openIndex}
        shortlist={shortlist}
        sessions={POOL}
        visibleSessions={visible}
        onShowMoreSessions={() => setVisible((v) => v + 3)}
        autoplay={autoplay}
        onToggleAutoplay={() => setAutoplay((a) => !a)}
        queueOpen={queueOpen}
        onToggleQueue={() => setQueueOpen((o) => !o)}
        sessionFilters={filters}
        sessionQuery={query}
        onSessionQuery={setQuery}
        onToggleSessionFilter={(key, value) => setFilters((f) => toggleSessionFilter(f, key, value))}
        onClearSessionFilters={() => { setFilters(NO_SESSION_FILTERS); setQuery(''); }}
        onStepSession={step}
        sidePanel={sidePanel}
        onToggleSidePanel={(p) => setSidePanel((open) => (open === p ? null : p))}
        criticalState="team"
        hidden={false}
        onOpenSession={(i) => { setOpenIndex(i); setPeek(false); }}
        onCloseSession={() => { setOpenIndex(null); setPeek(false); }}
        onTogglePeek={() => setPeek((p) => !p)}
        onCreateTask={action('create a Jira task')}
        onOpenCritical={action('open the critical dialog')}
        onOpenRename={action('open rename')}
        onOpenHide={action('open hide')}
        onUnhide={action('unhide')}
        onDropCritical={action('drop critical')}
        onRestoreCritical={action('restore critical')}
      />
    </div>
  );
}

const meta = {
  title: 'Issues/WorkPane',
  component: Harness,
  args: { start: 'triage' as const },
  argTypes: { start: { control: 'inline-radio', options: ['triage', 'watch', 'wide'] } },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A header, and a body under it split into two columns.\n\n' +
          '**The header spans everything**, and that is what makes the right-hand column a ' +
          'region rather than one special case: both columns begin under the same top edge, so ' +
          'the control that opens each panel sits in the header and a second panel is a second ' +
          'glyph rather than a second layout.\n\n' +
          'The left column is the flow, and its whole "collapsing panels" behaviour is the fact ' +
          'that **exactly one of its children carries `flex: 1` at any moment.** Nothing animates ' +
          'height by hand, nothing is measured, nothing is absolutely positioned.\n\n' +
          '| row | triage | watching | panel collapsed |\n| --- | --- | --- | --- |\n' +
          '| the write-up | full | gone (half while peeked) | same |\n' +
          '| the sessions | cards | strip | strip |\n' +
          '| the replay | absent | flex: 1 | flex: 1 |\n' +
          '| the side panel | absent | 320px | 0 |\n\n' +
          'At triage the write-up grows and the session cards sit under it as a fixed band. Open ' +
          'a session and the write-up goes, the cards shrink to a strip, and the replay takes ' +
          'everything they gave up. The strip does not travel: it rides up because the thing ' +
          'above it got shorter, which is why nothing on this screen appears to jump.\n\n' +
          'This story is live. Click a card to go down a depth, the title in the header to peek ' +
          'the write-up back over the player, the chevron beside it to come back out, and the ' +
          'panel glyph at the far right to collapse the journey.',
      },
    },
  },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Triage: Story = { args: { start: 'triage' } };
export const Watching: Story = { args: { start: 'watch' } };
export const PanelCollapsed: Story = { args: { start: 'wide' } };
