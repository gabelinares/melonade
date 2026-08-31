import { useState } from 'react';
import { Button, Dropdown, Tabs } from 'antd';
import { BookOpen, MoreHorizontal, Plus, Settings2 } from 'lucide-react';
import type { DataState } from '@shared/issues-logic.ts';
import type { RunsController } from '../state/useRuns.ts';
import type { TestsController } from '../state/useTests.ts';
import { IconButton } from '../components/IconButton.tsx';
import { PageCard } from '../components/PageCard.tsx';
import { SearchField } from '../components/SearchField.tsx';
import { EnvironmentsPanel } from './EnvironmentsPanel.tsx';
import { RunsPanel } from './RunsPanel.tsx';
import { TestsList } from './TestsList.tsx';

export type TestsSection = 'list' | 'runs' | 'environments';

/** The strip under the title. Same three labels as the menu's nested rows, in
 *  the same order - they are one set of sections shown in two places, not two
 *  navigations that happen to agree. The first one is "Tests" now that the
 *  agent above it is Synthetics; while the agent was also called Tests it had
 *  to be "List", because a child repeating its parent reads as a mistake. */
const TABS: { key: TestsSection; label: string }[] = [
  { key: 'list', label: 'Tests' },
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
 * THE SYNTHETICS AGENT, which is three bodies under one name.
 *
 * The tests it maintains, the runs those tests produced, and the environments
 * they run against.
 *
 * ── 2026-08-28: THE TITLE NEVER CHANGES ────────────────────────────────────
 * For one day the sections lived only in the menu and the header renamed itself
 * to match - "Runs" where the agent's name had been. That is what a different PAGE looks
 * like. The menu can show you that Runs is nested under Tests, but only while
 * you are looking at the menu; the moment you are reading the page, a heading
 * that says "Runs" and a body full of runs is a screen of its own, and the
 * three sections stop being one agent.
 *
 * So the heading is fixed and the SECTIONS ARE A STRIP UNDER IT. The menu keeps
 * its nested rows - they jump straight into a section from anywhere in the app,
 * which the strip cannot do - and the strip says the thing the menu cannot:
 * you are inside Synthetics, there are three of these, and this is the one you
 * are on. The duplication is the point; it is a landmark, not a second navigation.
 *
 * Two rules from that day survive unchanged. **Each section owns its toolbar**
 * and renders it as the first thing in its body - a shell that assembled three
 * sections' filters would be a shell that knows what a run is. And **the header
 * actions follow the section**: search targets the list in front of you, and
 * "Add test" exists only where tests are.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function TestsPage({ model, runs, section, onSection, dataState }: TestsPageProps) {
  /* Creating is not a mode of this page: it makes a row and opens the drawer on
     it, and Discard takes the row away again. The page only has to know that
     the drawer about to open is a new one, so its footer says "Create test"
     instead of "Save". */
  const [creating, setCreating] = useState(false);
  const startCreating = () => {
    setCreating(true);
    model.createTest();
  };

  const search =
    section === 'list' ? (
      <SearchField placeholder="Search tests" value={model.state.query} onChange={model.setQuery} />
    ) : section === 'runs' ? (
      <SearchField placeholder="Search runs" value={runs.state.query} onChange={runs.setQuery} />
    ) : null;

  return (
    <PageCard
      title="Synthetics"
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
            <Button type="primary" size="small" icon={<Plus size={14} />} onClick={startCreating}>
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
        <TestsList
          model={model}
          dataState={dataState}
          creating={creating}
          onCreated={() => setCreating(false)}
          onCreate={startCreating}
          onViewRuns={(title) => {
            runs.setQuery(title);
            onSection('runs');
          }}
        />
      ) : section === 'runs' ? (
        <RunsPanel model={runs} dataState={dataState} />
      ) : (
        <EnvironmentsPanel model={model} />
      )}

    </PageCard>
  );
}
