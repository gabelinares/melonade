import { Button } from 'antd';
import { ExternalLink, Play } from 'lucide-react';
import type { Issue } from '@shared/issues-data.ts';
import { Chip } from '../components/Chip.tsx';
import './issue-detail-panel.css';

export interface IssueDetailPanelProps {
  issue: Issue;
}

/**
 * The agent's write-up, opened in place.
 *
 * The reason this is inline rather than a separate page: the write-up IS the
 * product. Everything else on this screen is a way of deciding which write-up
 * to read, so making the reader leave the list to read one, then come back to
 * pick the next, is the wrong shape for the job. Expanding keeps the queue.
 */
export function IssueDetailPanel({ issue }: IssueDetailPanelProps) {
  return (
    <div className="m-detail">
      {/* Three self-contained columns. No grid rows and no row spanning: a
          spanning item taller than its rows forces those rows to grow, which is
          what put a 250px hole between the diagnosis and the journey on the
          previous attempt. A column that owns its whole stack cannot do that. */}
      <div className="m-detail__col">
        <section>
          <h2 className="m-detail__h">What is happening</h2>
          <p>{issue.real}</p>
        </section>
        <section>
          <h2 className="m-detail__h">The journey</h2>
          <p className="m-detail__journey">{issue.journey}</p>
        </section>
      </div>

      <div className="m-detail__col m-detail__col--fix">
        <section>
          <h2 className="m-detail__h">Suggested fix</h2>
          <p>{issue.fix}</p>
        </section>
      </div>

      <div className="m-detail__sessions">
        <h2 className="m-detail__h">
          Sessions that hit it
          <span className="m-detail__count">{issue.sessions.length}</span>
        </h2>
        <ul className="m-detail__list">
          {issue.sessions.map((s) => (
            <li className="m-detail__session" key={s.email}>
              <div className="m-detail__session-head">
                <span className="m-detail__email m-truncate">{s.email}</span>
                {/* the plan is metadata, not a status. A green chip here would
                    read as "this session succeeded", which is the opposite of
                    what the row is reporting. */}
                <Chip tone="neutral">{s.plan}</Chip>
              </div>
              <p className="m-detail__variation" title={s.variation}>
                {s.variation}
              </p>
              <div className="m-detail__meta">
                <span>{s.browser}</span>
                <span>{s.os}</span>
                <span>{s.loc}</span>
                <span className="m-mono">{s.dur}</span>
              </div>
              <Button size="small" icon={<Play size={11} />}>
                Watch from here
              </Button>
            </li>
          ))}
        </ul>
        <Button type="text" size="small" icon={<ExternalLink size={12} />}>
          All sessions with this issue
        </Button>
      </div>
    </div>
  );
}
