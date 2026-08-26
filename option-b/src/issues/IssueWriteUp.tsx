import { Tabs } from '@mantine/core';
import {
  AppWindow,
  CircleX,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
  Split,
  Tags,
  User,
} from 'lucide-react';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { SEGMENTS, impactLevel, lastSeenExact, lastSeenLabel } from '@shared/issues-data.ts';
import { isMobile, sessionCount, sessionFacts, type SessionFactKind } from '@shared/issues-logic.ts';
import { Chip } from '../components/Chip.tsx';
import { ImpactDot } from '../components/ImpactDot.tsx';
import './issue-write-up.css';

/* The glyph per row. The shared layer names the KIND and never the icon, the
   same way the filter options do, so the two options are free to disagree here.
   `device` is decided at the row rather than in the table because a phone and a
   laptop are the same kind of fact and not the same picture. */
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
  /** The session being watched, if one is. It is what the Details tab is about,
   *  so the tab exists exactly when this does. */
  session?: IssueSession;
  /** `peek` is the write-up pulled back over a running replay. It drops the
   *  title, because the bar it grew out of is already carrying it. */
  variant?: 'full' | 'peek';
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * The agent's write-up. THIRD structure, and the first one that is calm.
 *
 * The verdict on the second was "everything is so cluttered", and it was right
 * for a reason worth writing down: the previous round asked for the whole
 * article to fit on one screen without scrolling, and the way I got there was
 * to pack it into two columns. Fitting and breathing are opposites when the
 * amount of content is fixed. The only way to have both is to put LESS on
 * screen at once, which is what tabs are for.
 *
 * So the pane is now three parts, and only the middle one changes:
 *
 *   HEADER   the title and one row of facts. Always there, because "which issue
 *            is this and is it worth my time" is the question you re-ask every
 *            time your eye comes back to the pane.
 *   TABS     What happened  /  Why it happens. One block each, with room.
 *            "What happened" is one small paragraph: the journey, in the
 *            person's own order. It was a numbered horizontal track and that
 *            was too much furniture for a sentence.
 *   FIX      pinned under this article by IssueContext, outside the scroll, so
 *            it is always on screen. NOT a third tab: the suggested fix is the
 *            thing this product sells, and a deliverable behind a tab is a
 *            deliverable someone might not find. See SuggestedFix.tsx.
 *
 * Everything also steps down one size - title 26 to 20, prose 17 to 15, steps
 * 15 to 14 - which is worth about a fifth of the vertical space on its own and
 * is most of why the tabs now have room to be generous rather than merely
 * shorter.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function IssueWriteUp({ issue, title, session, variant = 'full' }: IssueWriteUpProps) {
  const full = variant === 'full';
  const segment = SEGMENTS.find((s) => s.id === issue.segmentId);
  const facts = session ? sessionFacts(issue, session) : null;

  return (
    <article className={`b-wu b-wu--${variant}`}>
      {full && (
        <header className="b-wu__head">
          <h1 className="b-wu__title">{title}</h1>

          {/* One ROW of labelled facts, not the 2x2 grid the two-column layout
              forced. The grid existed because the facts lived in a 360px
              column; with the column gone they can spread, and five stacked
              pairs across a full pane is one band tall instead of five rows. */}
          <dl className="b-wu__facts">
            <div className="b-wu__fact">
              <dt>Impact</dt>
              {/* The footnote that used to close the article hangs off the
                  figure it is about, rather than sitting 200px below it. */}
              <dd
                title={`Ranked ${impactLevel(issue.impact).toLowerCase()} impact because of how many people reached it, not how loudly it failed.`}
              >
                <ImpactDot value={issue.impact} withLabel />
              </dd>
            </div>
            <div className="b-wu__fact">
              <dt>Found in</dt>
              <dd className="b-wu__origin">
                {segment ? <Split size={11} /> : <Globe size={11} />}
                <span className="m-truncate">{segment ? segment.name : 'Full traffic'}</span>
              </dd>
            </div>
            <div className="b-wu__fact">
              <dt>Sessions</dt>
              <dd>{sessionCount(issue)}</dd>
            </div>
            <div className="b-wu__fact">
              <dt>Last seen</dt>
              <dd title={lastSeenExact(issue.seenAgoMin)}>{lastSeenLabel(issue.seenAgoMin)}</dd>
            </div>
            {issue.tags.length > 0 && (
              <div className="b-wu__fact b-wu__fact--tags">
                <dt>Tags</dt>
                <dd className="b-wu__tags">
                  {issue.tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </header>
      )}

      <Tabs defaultValue="what" className="b-wu__tabs" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="what">What happened</Tabs.Tab>
          <Tabs.Tab value="why">Why it happens</Tabs.Tab>
          {/* Third, because that is the order the three answers are read in:
              what, why, what to do. It used to be a tinted full-bleed band
              pinned under the article, which was the right call when it also
              carried the only Jira button in the pane - the answer could not be
              the thing that scrolled off. The action now lives in the pane
              header at every depth, so the band was a highlight around a
              sentence whose button had moved out, and it was costing the peek
              125px of a video's height to say so. */}
          <Tabs.Tab value="fix">Suggested fix</Tabs.Tab>
          {/* Only while a recording is open, because that is the only time
              there is a session to be detailed. At triage the fact grid at the
              top of the article is already saying the issue-level version of
              this, and a third tab repeating it would be a tab that answers a
              question the header answered two inches above. */}
          {facts && <Tabs.Tab value="details">Details</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="what">
          {/* One small paragraph, in the person's own order.
              This was a horizontal numbered track with circled stops and rules
              between them, echoing the replay timeline. It was handsome and it
              was too much furniture for a sentence: five short clauses do not
              need five circles, four rules and a row of their own to be read in
              order. The sentence already reads in order. What the track was
              really doing was announcing itself in a pane whose entire brief is
              to stop announcing things. */}
          <p className="b-wu__prose">{issue.journey}</p>
        </Tabs.Panel>

        <Tabs.Panel value="fix">
          {/* Nothing on it at all: same prose as its neighbours, and that IS the
              statement. It arrived here from a tinted full-bleed band, went to a
              plain paragraph with an accent rule down its left, and lost the
              rule too - each step the same realisation, that the tab it sits
              behind is already telling the reader which of the three answers
              they asked for. Anything the panel adds on top of that is the
              design saying it twice. */}
          <p className="b-wu__prose">{issue.fix}</p>
        </Tabs.Panel>

        {facts && (
          <Tabs.Panel value="details">
            {/* WHO AND WHERE, which is the other half of a session and the half
                you reach for once the write-up has convinced you. A definition
                list rather than a table: there is one column of values and a
                table would be drawing rules for a second column that does not
                exist.
                The row's NAME is the value doing the naming wherever that is
                natural - "Germany", "Chrome", "Mac OS X" - because "Country:
                Germany" is the same word twice. */}
            <dl className="b-wu__details">
              {facts.map((fact) => {
                const Icon =
                  fact.kind === 'device'
                    ? isMobile(session!)
                      ? Smartphone
                      : Monitor
                    : FACT_ICON[fact.kind];
                return (
                  <div className="b-wu__detail" key={fact.kind}>
                    <dt>
                      <Icon size={14} aria-hidden="true" />
                      <span className="m-truncate">{fact.label}</span>
                    </dt>
                    <dd>
                      {fact.pairs ? (
                        <span className="b-wu__pairs">
                          {fact.pairs.map((pair) => (
                            <span className="b-wu__pair" key={`${pair.key}:${pair.value}`}>
                              <span className="b-wu__pair-k">{pair.key}</span>
                              <span className="b-wu__pair-v">{pair.value}</span>
                            </span>
                          ))}
                          {/* Tags are values without keys, so they are chips
                              rather than pairs. Printing "tag" four times down
                              the row would be labelling the label. */}
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
          </Tabs.Panel>
        )}

        <Tabs.Panel value="why">
          {/* Same class as the journey above it, deliberately. The two tabs are
              two answers to two questions and there is no reason for them to be
              set differently: one small paragraph each, same size, same colour,
              same measure. This used to be a medium-weight lead sentence
              followed by lighter body text in two columns, which gave the tab
              three typographic voices where the other tab has one. */}
          <p className="b-wu__prose">{issue.real}</p>
        </Tabs.Panel>
      </Tabs>

    </article>
  );
}
