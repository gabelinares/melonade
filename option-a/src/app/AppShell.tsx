import { useCallback, useState } from 'react';
import { App } from 'antd';
import type { Audit } from '@shared/audits-data.ts';
import { SideNav } from '../nav/SideNav.tsx';
import { useNavCollapse } from '../nav/useNavCollapse.ts';
import { SHIPPED_AGENT_COUNT } from '../nav/agents.ts';
import { AuditsPage } from '../audits/AuditsPage.tsx';
import { IssuesPage } from '../issues/IssuesPage.tsx';
import { SessionsPage } from '../sessions/SessionsPage.tsx';
import { TestsPage } from '../tests/TestsPage.tsx';
import { PrototypePanel } from './PrototypePanel.tsx';
import { Placeholder } from '../components/Placeholder.tsx';
import { useAudits } from '../state/useAudits.ts';
import { useRuns } from '../state/useRuns.ts';
import { useIssues } from '../state/useIssues.ts';
import { useSessions } from '../state/useSessions.ts';
import { useTests } from '../state/useTests.ts';
import './app-shell.css';

/* One ground, one plane: the window is painted in the menu's colour, the menu
   sits on it with no surface of its own, and the content is a card with an
   equal margin on all four sides. See app-shell.css.

   THE MENU HAS TWO WIDTHS since 2026-08-31, and only one of the three things
   that used to come with a collapse: there is a state, there is no resize
   listener (matchMedia fires on the crossing, which is the only moment the
   window is allowed an opinion) and there is no stored preference (a menu that
   comes back collapsed on a wide screen is a menu nobody asked to collapse).
   See useNavCollapse. */
export function AppShell() {
  const { message } = App.useApp();
  const model = useIssues();
  const tests = useTests();
  const runs = useRuns();
  /* Sessions holds its own search at the shell for the same reason the agents
     do: a search you built is worth more than a page you left, and coming back
     to an empty card would make the whole thing feel disposable. */
  const sessions = useSessions();
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
  /* ⚠ `agents/issues`, NOT `issues`. Every destination is two levels deep or
     one row deep since 09-04, and starting inside Agents also starts it OPEN -
     `SideNav` expands whatever you arrived inside, so the roster is visible on
     load rather than behind a caret nobody has been told about. */
  const [active, setActive] = useState('agents/issues');

  /* ── THE ROUTE IS WHERE THE RECORDINGS SECTION LIVES ────────────────────
     Sessions / Bookmarks / Segments stopped being a tab strip on 09-04 and
     became three menu rows, so the thing that says which one you are on has to
     be the route. It still writes `model.tab`, which stays the single source -
     `SessionsPage` reads nothing else, and neither does the highlight below.

     ⚠ THE HIGHLIGHT IS DERIVED FROM THE MODEL, not from what was last clicked.
     Applying a segment moves you to the session list (`applySegment` sets the
     tab to `all`), and a menu still lighting Segments after that would be the
     two-copies-of-one-fact problem the tab strip was removed to avoid. */
  const sectionRoute = sessions.tab === 'all' ? 'sessions' : sessions.tab;
  const here = active.startsWith('recordings') ? `recordings/${sectionRoute}` : active;
  const navigate = useCallback(
    (key: string) => {
      if (key === 'recordings' || key.startsWith('recordings/')) {
        const leaf = key.slice('recordings/'.length);
        /* The parent row is a destination too, and it lands on the first of its
           children rather than on a page that does not exist. */
        sessions.setTab(leaf === 'bookmarks' || leaf === 'segments' ? leaf : 'all');
      }
      setActive(key);
    },
    [sessions],
  );
  const [agentCount, setAgentCount] = useState(SHIPPED_AGENT_COUNT);
  const { collapsed, toggle: toggleNav } = useNavCollapse();

  return (
    <div className="m-shell">
      <SideNav
        active={here}
        onNavigate={navigate}
        agentCount={agentCount}
        collapsed={collapsed}
        onToggleCollapsed={toggleNav}
      />
      <main className="m-shell__main">
        {active.startsWith('recordings') ? (
          <SessionsPage model={sessions} />
        ) : active === 'agents/issues' ? (
          <IssuesPage model={model} />
        ) : active.startsWith('agents/tests') ? (
          <TestsPage
            model={tests}
            runs={runs}
            /* ⚠ THE SECTION IS STILL IN THE ROUTE even though the menu does not
               draw these three. They are TABS, they live in `TestsPage`'s own
               header, and the route is what the strip writes - which is what
               lets a link land on Runs. The menu simply does not read that
               third level. */
            section={
              active === 'agents/tests/runs'
                ? 'runs'
                : active === 'agents/tests/environments'
                  ? 'environments'
                  : 'list'
            }
            onSection={(s) => setActive(s === 'list' ? 'agents/tests' : `agents/tests/${s}`)}
            dataState={model.dataState}
          />
        ) : active === 'agents/audits' ? (
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
