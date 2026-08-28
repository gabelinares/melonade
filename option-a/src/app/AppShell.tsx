import { useCallback, useState } from 'react';
import { App } from 'antd';
import type { Audit } from '@shared/audits-data.ts';
import { SideNav } from '../nav/SideNav.tsx';
import { SHIPPED_AGENT_COUNT } from '../nav/agents.ts';
import { AuditsPage } from '../audits/AuditsPage.tsx';
import { IssuesPage } from '../issues/IssuesPage.tsx';
import { TestsPage } from '../tests/TestsPage.tsx';
import { PrototypePanel } from './PrototypePanel.tsx';
import { Placeholder } from '../components/Placeholder.tsx';
import { useAudits } from '../state/useAudits.ts';
import { useRuns } from '../state/useRuns.ts';
import { useIssues } from '../state/useIssues.ts';
import { useTests } from '../state/useTests.ts';
import './app-shell.css';

/* One ground, one plane: the window is painted in the menu's colour, the menu
   sits on it with no surface of its own, and the content is a card with an
   equal margin on all four sides. See app-shell.css.

   The menu is one width at every window size - no collapse state, no resize
   listener, no stored preference - because those three things existed only to
   decide which of two navs to show. */
export function AppShell() {
  const { message } = App.useApp();
  const model = useIssues();
  const tests = useTests();
  const runs = useRuns();
  /* The three agents' state lives at the shell, not inside their pages, so
     leaving a page and coming back does not reset it - a running audit keeps
     running while you are reading issues, which is the entire claim these
     agents make about themselves. */
  const onAuditFinished = useCallback(
    (a: Audit) =>
      message.success(`Audit ready — ${a.name}${a.emailWhenDone ? '. We also emailed you a link.' : ''}`),
    [message],
  );
  const audits = useAudits(onAuditFinished);
  /* One string, and a section is `agent/section`. Both the menu's nested rows
     and a page's own tab strip write to THIS - a page never keeps a second copy
     of where it is, which is the only reason two controls can show the same
     thing without drifting apart. */
  const [active, setActive] = useState('issues');
  const [agentCount, setAgentCount] = useState(SHIPPED_AGENT_COUNT);

  return (
    <div className="m-shell">
      <SideNav active={active} onNavigate={setActive} agentCount={agentCount} />
      <main className="m-shell__main">
        {active === 'issues' ? (
          <IssuesPage model={model} />
        ) : active.startsWith('tests') ? (
          <TestsPage
            model={tests}
            runs={runs}
            section={active === 'tests/runs' ? 'runs' : active === 'tests/environments' ? 'environments' : 'list'}
            onSection={(s) => setActive(s === 'list' ? 'tests' : `tests/${s}`)}
            dataState={model.dataState}
          />
        ) : active === 'audits' ? (
          <AuditsPage model={audits} dataState={model.dataState} />
        ) : (
          <Placeholder page={active} />
        )}
      </main>
      <PrototypePanel
        agentCount={agentCount}
        onAgentCount={setAgentCount}
        dataState={model.dataState}
        onDataState={model.setDataState}
      />
    </div>
  );
}
