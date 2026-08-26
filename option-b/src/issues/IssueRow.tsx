import { Globe, Split } from 'lucide-react';
import type { Issue } from '@shared/issues-data.ts';
import { SEGMENTS, lastSeenLabel } from '@shared/issues-data.ts';
import { sessionCount, type CriticalState, type FieldKey } from '@shared/issues-logic.ts';
import { Chip } from '../components/Chip.tsx';
import { CriticalFlag } from '../components/CriticalFlag.tsx';
import { ImpactDot } from '../components/ImpactDot.tsx';
import './issue-row.css';

export interface IssueRowProps {
  issue: Issue;
  title: string;
  selected: boolean;
  hidden: boolean;
  criticalState: CriticalState;
  matchedBy?: string;
  /** Which optional fields the display menu has switched on. */
  fields: readonly FieldKey[];
  onSelect: () => void;
  onOpenCritical: () => void;
}

/**
 * One row in the triage column: two lines, not a table row.
 *
 * A table row puts every field in a fixed column, which is right when you are
 * comparing rows and wrong when you are choosing which one to read. So the title
 * gets two full lines at reading size and everything else drops to a single quiet
 * meta line beneath it. Nothing is truncated to fit a column boundary, because
 * there are no column boundaries.
 *
 * Which meta items appear is a display CHOICE. That is the payoff of a two-line
 * row over a table: turning a field off closes a gap in a sentence rather than
 * leaving an empty column, so the row still reads at any combination.
 *
 * The row is a DIV, not a button. It used to be a button, which nested the
 * critical flag's button inside it: invalid HTML, and the inner control is not
 * reliably reachable by keyboard or screen reader. One stretched button carries
 * the selection, rendered last so it catches every click, and the flag is lifted
 * above it with z-index.
 */
export function IssueRow({
  issue,
  title,
  selected,
  hidden,
  criticalState,
  matchedBy,
  fields,
  onSelect,
  onOpenCritical,
}: IssueRowProps) {
  const segment = SEGMENTS.find((s) => s.id === issue.segmentId);
  const has = (f: FieldKey) => fields.includes(f);

  /* Built as a list so the separators can be interleaved, which is what keeps a
     wrapped line from ending on an orphaned dot. */
  const meta: React.ReactNode[] = [];
  if (has('category')) meta.push(<Chip quiet key="cat">{issue.cat}</Chip>);
  if (has('origin')) {
    meta.push(
      <span
        className="b-row__origin"
        key="origin"
        title={segment ? `Found in segment: ${segment.name}` : 'Found in full traffic'}
      >
        {segment ? <Split size={11} /> : <Globe size={11} />}
        <span className="m-truncate">{segment ? segment.name : 'Full traffic'}</span>
      </span>,
    );
  }
  if (has('tags') && issue.tags.length > 0) {
    meta.push(
      <span className="b-row__tags" key="tags">
        {issue.tags.slice(0, 2).join(', ')}
        {issue.tags.length > 2 && <span className="b-row__more">+{issue.tags.length - 2}</span>}
      </span>,
    );
  }
  if (has('sessions')) {
    meta.push(
      <span key="sessions">
        {sessionCount(issue)} session{sessionCount(issue) === 1 ? '' : 's'}
      </span>,
    );
  }
  if (has('lastSeen')) {
    meta.push(
      <span className="b-row__time" key="time">
        {lastSeenLabel(issue.seenAgoMin)}
      </span>,
    );
  }
  if (hidden) meta.push(<span className="b-row__hidden" key="hidden">Hidden</span>);

  return (
    <div
      className={`b-row${selected ? ' is-selected' : ''}${hidden ? ' is-hidden' : ''}`}
      aria-current={selected ? 'true' : undefined}
    >
      {has('impact') && (
        <span className="b-row__gutter">
          <ImpactDot value={issue.impact} />
        </span>
      )}

      <span className="b-row__body">
        <span className="b-row__head">
          <span className="b-row__title">{title}</span>
          <span className="b-row__flag">
            <CriticalFlag state={criticalState} matchedBy={matchedBy} onClick={onOpenCritical} />
          </span>
        </span>

        {meta.length > 0 && (
          <span className="b-row__meta">
            {meta.map((node, i) => (
              <span className="b-row__meta-item" key={i}>
                {node}
              </span>
            ))}
          </span>
        )}
      </span>

      {/* last in the DOM so it paints over the content and catches every click */}
      <button
        type="button"
        className="b-row__select"
        onClick={onSelect}
        aria-label={`Open: ${title}`}
      />
    </div>
  );
}
