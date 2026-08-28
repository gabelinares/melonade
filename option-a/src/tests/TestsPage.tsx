import { useState } from 'react';
import { Button, Dropdown } from 'antd';
import { BookOpen, MoreHorizontal, Plus, Settings2 } from 'lucide-react';
import type { DataState } from '@shared/issues-logic.ts';
import type { RunsController } from '../state/useRuns.ts';
import type { TestsController } from '../state/useTests.ts';
import { IconButton } from '../components/IconButton.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { StubDrawer } from '../components/StubDrawer.tsx';
import { EnvironmentsPanel } from './EnvironmentsPanel.tsx';
import { RunsPanel } from './RunsPanel.tsx';
import { TestsList } from './TestsList.tsx';

export type TestsSection = 'list' | 'runs' | 'environments';

const HEAD: Record<TestsSection, { title: string; subtitle: string }> = {
  list: {
    title: 'Tests',
    subtitle: 'End-to-end tests the agent writes and maintains from your real user journeys.',
  },
  runs: {
    title: 'Runs',
    subtitle: 'Every execution of those tests, newest first.',
  },
  environments: {
    title: 'Environments',
    subtitle: 'Where the tests run, and what a new test starts from.',
  },
};

export interface TestsPageProps {
  model: TestsController;
  runs: RunsController;
  /** Which of the agent's three bodies to show. THE MENU decides this, not the
   *  page: the sections are nav rows, so the page has no tab strip of its own
   *  and no state to keep in step with the sidebar. */
  section: TestsSection;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE TESTS AGENT, which is three bodies under one name.
 *
 * The tests it maintains, the runs those tests produced, and the environments
 * they run against.
 *
 * ── 2026-08-28: the sections moved into the menu ───────────────────────────
 * They were tabs in this page's header for one day. The sidebar now expands to
 * hold them, and two navigations to the same three destinations - one in the
 * menu, one in the header, ten pixels apart - is one too many. The menu won
 * because it is where you already are when you decide to go somewhere, and
 * because it says what is inside Tests without opening Tests.
 *
 * What the page keeps from that day is the rule underneath it: **each section
 * owns its own toolbar** and renders it as the first thing in its body. A shell
 * that assembled three sections' filters would be a shell that knows what a run
 * is. And the HEADER FOLLOWS THE SECTION - the title, the sentence under it and
 * the actions all belong to what you are looking at, so search targets the list
 * in front of you and "Add test" exists only where tests are.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function TestsPage({ model, runs, section, dataState }: TestsPageProps) {
  /* Writing a test by hand opens the panel it would be written in rather than
     seeding an empty row: a test with no steps is not a test, and a row called
     "Untitled" that cannot be finished is worse than a button that says what is
     missing. */
  const [creating, setCreating] = useState(false);
  const head = HEAD[section];

  const search =
    section === 'list' ? (
      <SearchField placeholder="Search tests" value={model.state.query} onChange={model.setQuery} />
    ) : section === 'runs' ? (
      <SearchField placeholder="Search runs" value={runs.state.query} onChange={runs.setQuery} />
    ) : null;

  return (
    <PageCard
      title={head.title}
      subtitle={head.subtitle}
      actions={
        <>
          {search}
          {section === 'list' && (
            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              Add test
            </Button>
          )}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              items: [
                { key: 'settings', icon: <Settings2 size={13} />, label: 'Tests settings' },
                { key: 'docs', icon: <BookOpen size={13} />, label: 'Documentation' },
              ],
            }}
          >
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </Dropdown>
        </>
      }
    >
      {section === 'list' ? (
        <TestsList model={model} dataState={dataState} onCreate={() => setCreating(true)} />
      ) : section === 'runs' ? (
        <RunsPanel model={runs} dataState={dataState} />
      ) : (
        <EnvironmentsPanel model={model} />
      )}

      <StubDrawer
        open={creating}
        onClose={() => setCreating(false)}
        title="New test"
        meta={<span>Written by hand — it skips the draft, and starts ready to run</span>}
        note="The test panel — the steps, the run settings, the schedule, the versions and the review of a proposed change — is the next piece. This round is the list: the queue order, the status tabs, the filters and every action that lives on a row."
      />
    </PageCard>
  );
}
