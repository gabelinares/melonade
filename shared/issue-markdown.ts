/* ═══════════════════════════════════════════════════════════════════════════
   THE ISSUE, AS MARKDOWN.

   The most portable thing this product makes is the write-up. Somebody who has
   read it and agrees with it does not want to retype it into the tool where the
   fix actually gets written, and an agent on the other end wants the whole
   case - the symptom, the diagnosis, the proposed fix and the evidence - in one
   paste, not a link it cannot open.

   So this is the pane, in text. It follows the same order the tabs do, because
   that order is the argument: what happened, why it happens, what to do, and
   then who it happened to.

   Pure and in shared/, beside the data it reads, for the same reason everything
   else here is: what an issue IS should not depend on which of the two options
   is drawing it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { SEGMENTS, impactLevel, lastSeenExact, type Issue, type IssueSession } from './issues-data.ts';
import { sessionCount, sessionFacts } from './issues-logic.ts';
import { formatClock, journeySteps } from './replay.ts';

export interface IssueMarkdownOptions {
  /** The title as the reader sees it, which may be a rename. */
  title: string;
  /** The sessions on the shortlist AS DRAWN - the window the reader is looking
   *  at, already sliced. */
  shortlist?: readonly IssueSession[];
  /** How many hit the issue in total, so the shortlist can say what it is a
   *  shortlist OF. */
  total?: number;
  /** The recording open at the time, if there is one. Its journey is included
   *  as a step table, because that is the part an agent cannot infer. */
  session?: IssueSession;
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Markdown tables break on a raw pipe, and a journey clause can contain one
 *  once somebody quotes a UI string. */
const cell = (s: string) => clean(s).replace(/\|/g, '\\|');

function sessionLine(session: IssueSession): string {
  const bits = [
    session.email,
    session.plan,
    `${session.browser} on ${session.os}`,
    session.loc,
    session.dur,
  ];
  return bits.join(' · ');
}

export function issueMarkdown(issue: Issue, options: IssueMarkdownOptions): string {
  const { title, shortlist = [], total, session } = options;
  const segment = SEGMENTS.find((s) => s.id === issue.segmentId);
  const out: string[] = [];

  out.push(`# ${clean(title)}`, '');

  /* A definition list rather than a sentence: this block is for the machine on
     the other end as much as for the person, and key/value survives being
     pasted into anything. */
  out.push(
    `- **Impact:** ${impactLevel(issue.impact)} (${issue.impact})`,
    `- **Category:** ${issue.cat}`,
    `- **Found in:** ${segment ? segment.name : 'Full traffic'}`,
    `- **Sessions affected:** ${sessionCount(issue)}`,
    `- **Last seen:** ${lastSeenExact(issue.seenAgoMin)}`,
  );
  if (issue.tags.length > 0) out.push(`- **Tags:** ${issue.tags.join(', ')}`);
  out.push('');

  out.push('## What happened', '', clean(issue.journey), '');
  out.push('## Why it happens', '', clean(issue.real), '');
  out.push('## Suggested fix', '', clean(issue.fix), '');

  if (shortlist.length > 0) {
    /* Named as a shortlist and counted as one. An agent reading this needs to
       know it is looking at three of a hundred and thirty rather than at every
       session there is, or it will reason about the sample as if it were the
       population. */
    const of = total && total > shortlist.length ? ` (${shortlist.length} of ${total})` : '';
    out.push(`## Sessions on the shortlist${of}`, '');
    for (const s of shortlist) out.push(`- **${clean(s.variation)}** — ${sessionLine(s)}`);
    out.push('');
  }

  if (session) {
    out.push('## The recording', '', sessionLine(session), '');

    /* The facts the Details tab shows, minus the two the header above already
       said. Repeating the category and the user in a document this short is how
       a paste starts reading as generated rather than as written. */
    const facts = sessionFacts(issue, session).filter(
      (f) => f.kind !== 'category' && f.kind !== 'user',
    );
    for (const fact of facts) {
      const value = fact.pairs ? fact.pairs.map((p) => `${p.key}=${p.value}`).join(', ') : fact.value;
      if (value) out.push(`- **${fact.label}:** ${value}`);
    }
    out.push('');

    const steps = journeySteps(issue, session);
    if (steps.length > 0) {
      out.push('### Journey', '');
      out.push('| Time | Page | Step |', '| --- | --- | --- |');
      for (const step of steps) {
        const label = step.failure ? `**${cell(step.label)}** ← where it broke` : cell(step.label);
        out.push(`| ${formatClock(step.at)} | ${step.pathChanged ? cell(step.path) : ''} | ${label} |`);
      }
      out.push('');
    }
  }

  out.push('---', '', 'Written by the Issues agent. Pasted from Melonade.');
  return out.join('\n');
}
