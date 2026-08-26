import { useState } from 'react';
import { AgentRail } from '../nav/AgentRail.tsx';
import { SHIPPED_AGENT_COUNT } from '../nav/agents.ts';
import { IssuesPage } from '../issues/IssuesPage.tsx';
import { PrototypePanel } from './PrototypePanel.tsx';
import { Placeholder } from './Placeholder.tsx';
import { useIssues } from '../state/useIssues.ts';
import './app-shell.css';

/* The menu is an icon rail at every width, so the shell has no breakpoint of
   its own any more and no collapsed/expanded state to hold. That deletion is
   the point of the swap: the labelled nav needed a RAIL_BREAKPOINT, a resize
   listener and a user preference, and all three existed only to decide which of
   two navs to show. */
export function AppShell() {
  const model = useIssues();
  const [active, setActive] = useState('issues');
  const [agentCount, setAgentCount] = useState(SHIPPED_AGENT_COUNT);

  return (
    <div className="m-shell">
      <AgentRail active={active} onNavigate={setActive} agentCount={agentCount} />
      <main className="m-shell__main">
        {active === 'issues' ? <IssuesPage model={model} /> : <Placeholder page={active} />}
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
