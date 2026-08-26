import type { ReactNode } from 'react';
import {
  AppWindow, BarChart3, Chrome, Clock, Film, MapPin, Monitor, Smartphone, Split, Tag, Tags, User,
} from 'lucide-react';
import { SEGMENTS, type Issue, type IssueSession } from '@shared/issues-data.ts';
import { isMobile, sessionCount, sessionFacts } from '@shared/issues-logic.ts';
import { Chip } from '../components/Chip.tsx';
import { ImpactMeter } from '../components/ImpactMeter.tsx';
import { OriginBadge } from '../components/OriginBadge.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import './issue-details.css';

const FACT_ICON = {
  category: Tag,
  user: User,
  place: MapPin,
  browser: Chrome,
  /* Not Monitor: that is the device row, and an OS row wearing the device row's
     glyph makes the two read as one fact drawn twice. */
  os: AppWindow,
  device: Monitor,
  metadata: Tags,
} as const;

export interface IssueDetailsProps {
  issue: Issue;
  /** The open recording, if there is one. Its facts are appended to the issue's;
   *  at triage depth there is no recording yet and the band is the issue alone. */
  session?: IssueSession;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * WHAT THIS SESSION WAS, behind the title.
 *
 * It used to be the fourth tab of the write-up, sitting beside what happened,
 * why it happens and the suggested fix. That put two different kinds of thing in
 * one control: three ANSWERS the agent wrote, and a set of FACTS about one
 * recording. Reading the answers and checking the facts are different jobs, so
 * they are now in different places - the answers in the side panel, these behind
 * the title, which is where a reader reaches for "what was this exactly".
 *
 * THREE COLUMNS, not one list. The single column was 38rem of half-empty rows
 * that pushed everything below it down by 300px; the same seven facts across
 * three columns are one glance instead of a scroll, and they fit in the band the
 * title opens without moving the page under the reader.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function IssueDetails({ issue, session }: IssueDetailsProps) {
  const segment = SEGMENTS.find((s) => s.id === issue.segmentId);

  /* One list, built in two halves: what the ISSUE is, then what the open
     RECORDING was. Both halves are drawn by the components this system already
     owns for those facts - ImpactMeter, OriginBadge, RelativeTime, Chip - rather
     than restated as text, so the band and the table row it was opened from
     report the same fact the same way. */
  const rows: { key: string; icon: typeof Tag; label: string; value: ReactNode }[] = [
    { key: 'impact', icon: BarChart3, label: 'Impact', value: <ImpactMeter value={issue.impact} /> },
    {
      key: 'origin',
      icon: Split,
      label: 'Found in',
      value: (
        <span className="m-idet__origin">
          <OriginBadge segmentName={segment?.name} />
          <span className="m-truncate">{segment ? segment.name : 'Full traffic'}</span>
        </span>
      ),
    },
    { key: 'sessions', icon: Film, label: 'Sessions', value: sessionCount(issue) },
    {
      key: 'seen',
      icon: Clock,
      label: 'Last seen',
      value: <RelativeTime minutesAgo={issue.seenAgoMin} />,
    },
    ...(issue.tags.length > 0
      ? [{
          key: 'tags',
          icon: Tags,
          label: 'Tags',
          value: (
            <span className="m-idet__pairs">
              {issue.tags.map((t) => <Chip key={t}>{t}</Chip>)}
            </span>
          ),
        }]
      : []),
    ...(session
      ? sessionFacts(issue, session).map((fact) => ({
          key: fact.kind,
          icon:
            fact.kind === 'device'
              ? ((isMobile(session) ? Smartphone : Monitor) as typeof Tag)
              : FACT_ICON[fact.kind],
          label: fact.label,
          value: fact.pairs ? (
            <span className="m-idet__pairs">
              {fact.pairs.map((pair) => (
                <span className="m-idet__pair" key={`${pair.key}:${pair.value}`}>
                  <span className="m-idet__pair-k">{pair.key}</span>
                  <span className="m-idet__pair-v">{pair.value}</span>
                </span>
              ))}
              {session.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
            </span>
          ) : (
            <span className="m-truncate">{fact.value}</span>
          ),
        }))
      : []),
  ];

  return (
    <dl className="m-idet">
      {rows.map(({ key, icon: Icon, label, value }) => (
        <div className="m-idet__row" key={key}>
          <dt>
            <Icon size={13} aria-hidden="true" />
            <span className="m-truncate">{label}</span>
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
