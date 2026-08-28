import { useState } from 'react';
import { Button, Dropdown, Tabs } from 'antd';
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

/** The strip under the title. The first section is called List, not Tests: a
 *  child repeating its parent reads as a mistake, and the title above it is
 *  already the subject. Same three labels as the menu's nested rows, in the
 *  same order, from the same argument - they are one set of sections shown in
 *  two places, not two navigations that happen to agree. */
const TABS: { key: TestsSection; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'runs', label: 'Runs' },
  { key: 'environments', label: 'Environments' },
];

/** The title never changes. The sentence does, because it is the one line that
 *  says what you are looking at now that the heading says where you are. */
const SUBTITLE: Record<TestsSection, string> = {
  list: 'End-to-end tests the agent writes and maintains from your real user journeys.',
  runs: 'Every execution of those tests, newest first.',
  environments: 'Where the tests run, and what a new test starts from.',
};

export interface TestsPageProps {
  model: TestsController;
  runs: RunsController;
  /** Which of the agent's three bodies to show. Owned by the shell, because the
   *  menu can set it too - the page reads it and never keeps a second copy. */
  section: TestsSection;
  onSection: (section: TestsSection) => void;
  dataState: DataState;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE TESTS AGENT, which is three bodies under one name.
 *
 * The tests it maintains, the runs those tests produced, and the environments
 * they run against.
 *
 * ── 2026-08-28: THE TITLE IS "TESTS", ALWAYS ───────────────────────────────
 * For one day the sections lived only in the menu and the header renamed itself
 * to match - "Runs" where "Tests" had been. That is what a different PAGE looks
 * like. The menu can show you that Runs is nested under Tests, but only while
 * you are looking at the menu; the moment you are reading the page, a heading
 * that says "Runs" and a body full of runs is a screen of its own, and the
 * three sections stop being one agent.
 *
 * So the heading is fixed and the SECTIONS ARE A STRIP UNDER IT. The menu keeps
 * its nested rows - they jump straight into a section from anywhere in the app,
 * which the strip cannot do - and the strip says the thing the menu cannot:
 * you are inside Tests, there are three of these, and this is the one you are
 * on. The duplication is the point; it is a landmark, not a second navigation.
 *
 * Two rules from that day survive unchanged. **Each section owns its toolbar**
 * and renders it as the first thing in its body - a shell that assembled three
 * sections' filters would be a shell that knows what a run is. And **the header
 * actions follow the section**: search targets the list in front of you, and
 * "Add test" exists only where tests are.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function TestsPage({ model, runs, section, onSection, dataState }: TestsPageProps) {
  /* Writing a test by hand opens the panel it would be written in rather than
     seeding an empty row: a test with no steps is not a test, and a row called
     "Untitled" that cannot be finished is worse than a button that says what is
     missing. */
  const [creating, setCreating] = useState(false);

  const search =
    section === 'list' ? (
      <SearchField placeholder="Search tests" value={model.state.query} onChange={model.setQuery} />
    ) : section === 'runs' ? (
      <SearchField placeholder="Search runs" value={runs.state.query} onChange={runs.setQuery} />
    ) : null;

  return (
    <PageCard
      title="Tests"
      subtitle={SUBTITLE[section]}
      tabs={
        <Tabs
          activeKey={section}
          onChange={(key) => onSection(key as TestsSection)}
          items={TABS.map((t) => ({ key: t.key, label: t.label }))}
        />
      }
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
