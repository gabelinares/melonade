import { Tabs } from 'antd';
import {
  AppWindow,
  CircleX,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
  Tags,
  User,
} from 'lucide-react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { SEGMENTS } from '@shared/issues-data.ts';
import { isMobile, sessionCount, sessionFacts, type SessionFactKind } from '@shared/issues-logic.ts';
import { Chip } from '../components/Chip.tsx';
import { ImpactMeter } from '../components/ImpactMeter.tsx';
import { OriginBadge } from '../components/OriginBadge.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import './issue-write-up.css';

/* The glyph per row. The shared layer names the KIND and never the icon, so the
   two options are free to disagree here. `device` is decided at the row rather
   than in the table because a phone and a laptop are the same kind of fact and
   not the same picture. */
const FACT_ICON: Record<Exclude<SessionFactKind, 'device'>, typeof User> = {
  category: CircleX,
  user: User,
  place: MapPin,
  browser: Globe,
  /* Not Monitor: that is the device row two lines below, and an OS row wearing
     the device row's glyph makes the two read as one fact drawn twice. */
  os: AppWindow,
  metadata: Tags,
};

export interface IssueWriteUpProps {
  issue: Issue;
  title: string;
  /** The session being watched, if one is. It is what the Details tab is
   *  about, so the tab exists exactly when this does. */
  session?: IssueSession;
  /** `peek` is the write-up pulled back over a running replay: it drops the
   *  title and the fact row, because you read those to get here. */
  variant?: 'full' | 'peek';
  /** Off when the pane header above is already carrying the title. Defaults on,
   *  so the article still stands on its own wherever it is read whole - a
   *  document without its title is not a smaller document, it is an orphan. */
  showTitle?: boolean;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE WRITE-UP.
 *
 * Option B's information architecture, in Graphite's system. Same header, same
 * fact row, same four tabs in the same order - what happened, why it happens,
 * what to do, and who it happened to - because that order is the argument the
 * agent is making and it does not change with the typeface.
 *
 * WHAT THE TRANSLATION CHANGED:
 *
 * · The tabs are antd's, not hand-rolled, for the same reason every other
 *   control on this page is antd's: this option exists to answer "what does the
 *   product look like built on the library we already ship".
 * · The fact row reuses the components this system already has for those facts
 *   - ImpactMeter, OriginBadge, RelativeTime - rather than restating them as
 *   plain text. B prints them because B has no such components; Graphite does,
 *   and a system with a meter in it should not print a number instead.
 * · The title is sans and 18px. Graphite has no display serif to resist.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function IssueWriteUp({ issue, title, session, variant = 'full', showTitle = true }: IssueWriteUpProps) {
  const full = variant === 'full';
  const segment = SEGMENTS.find((s) => s.id === issue.segmentId);
  const facts = session ? sessionFacts(issue, session) : null;

  const items = [
    { key: 'what', label: 'What happened', children: <p className="m-wu__prose">{issue.journey}</p> },
    { key: 'why', label: 'Why it happens', children: <p className="m-wu__prose">{issue.real}</p> },
    /* Third, because that is the order the three answers are read in. Nothing
       on it at all: the tab it sits behind is already telling the reader which
       answer they asked for, and anything the panel adds is the design saying
       it twice. */
    { key: 'fix', label: 'Suggested fix', children: <p className="m-wu__prose">{issue.fix}</p> },
    ...(facts
      ? [
          {
            key: 'details',
            label: 'Details',
            children: (
              /* WHO AND WHERE, the other half of a session and the half you
                 reach for once the write-up has convinced you. A definition
                 list rather than a table: there is one column of values, and a
                 table would draw rules for a second column that does not
                 exist. */
              <dl className="m-wu__details">
                {facts.map((fact) => {
                  const Icon =
                    fact.kind === 'device'
                      ? isMobile(session!)
                        ? Smartphone
                        : Monitor
                      : FACT_ICON[fact.kind];
                  return (
                    <div className="m-wu__detail" key={fact.kind}>
                      <dt>
                        <Icon size={13} aria-hidden="true" />
                        <span className="m-truncate">{fact.label}</span>
                      </dt>
                      <dd>
                        {fact.pairs ? (
                          <span className="m-wu__pairs">
                            {fact.pairs.map((pair) => (
                              <span className="m-wu__pair" key={`${pair.key}:${pair.value}`}>
                                <span className="m-wu__pair-k">{pair.key}</span>
                                <span className="m-wu__pair-v">{pair.value}</span>
                              </span>
                            ))}
                            {session!.tags.map((tag) => (
                              <Chip key={tag}>{tag}</Chip>
                            ))}
                          </span>
                        ) : (
                          <span className="m-truncate">{fact.value}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ),
          },
        ]
      : []),
  ];

  return (
    <article className={`m-wu m-wu--${variant}`}>
      {full && (
        <header className="m-wu__head">
          {showTitle && <h1 className="m-wu__title">{title}</h1>}

          {/* One ROW of labelled facts. Each one drawn by the component this
              system already owns for it, so the write-up and the table row it
              was opened from report impact, origin and recency the same way. */}
          <dl className="m-wu__facts">
            <div className="m-wu__fact">
              <dt>Impact</dt>
              <dd><ImpactMeter value={issue.impact} /></dd>
            </div>
            <div className="m-wu__fact">
              <dt>Found in</dt>
              {/* The badge AND the name. OriginBadge is icon-only because it
                  lives in a table cell where a name would not fit; here there
                  is a whole row for it, and a reader asking where an issue was
                  found wants the segment's name rather than a glyph they have
                  to hover. */}
              <dd className="m-wu__origin">
                <OriginBadge segmentName={segment?.name} />
                <span className="m-truncate">{segment ? segment.name : 'Full traffic'}</span>
              </dd>
            </div>
            <div className="m-wu__fact">
              <dt>Sessions</dt>
              <dd>{sessionCount(issue)}</dd>
            </div>
            <div className="m-wu__fact">
              <dt>Last seen</dt>
              <dd><RelativeTime minutesAgo={issue.seenAgoMin} /></dd>
            </div>
            {issue.tags.length > 0 && (
              <div className="m-wu__fact m-wu__fact--tags">
                <dt>Tags</dt>
                <dd className="m-wu__tags">
                  {issue.tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </header>
      )}

      <Tabs className="m-wu__tabs" defaultActiveKey="what" items={items} size="small" />
    </article>
  );
}
