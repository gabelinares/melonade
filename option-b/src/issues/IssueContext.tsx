import { ScrollArea } from '@mantine/core';
import type { Issue, IssueSession } from '@shared/issues-data.ts';
import { IssueWriteUp } from './IssueWriteUp.tsx';
import './issue-context.css';

/** The two sizes the write-up is ever open at. Closed is not a size: the work
 *  pane simply does not render this. */
export type ContextSize = 'full' | 'half';

export interface IssueContextProps {
  issue: Issue;
  title: string;
  size: ContextSize;
  /** the recording playing underneath, which is what the Details tab is about */
  session?: IssueSession;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE WRITE-UP, AT TWO SIZES. This is where the flow's one rule lives.
 *
 * THE RULE: every step takes its space from the step you just finished. You
 * read the write-up in order to pick a session; the moment you pick one, the
 * write-up has done its job, so it gives its height to the player.
 *
 *   full   triage. The whole article, scrolling, with the fix pinned under it.
 *   half   peeked while a replay runs. Same article, half the height, and the
 *          player keeps playing underneath. This is the answer to "I need to
 *          re-read the fix without losing my place".
 *
 * It does not carry a header of its own any more. The header belongs to the
 * PANE - see IssueHeader - because the journey panel on the right has to begin
 * under the same top edge this does. So collapsing the write-up is now literally
 * this component not rendering, and there is no second smaller copy of a header
 * to keep in agreement with the real one.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function IssueContext({ issue, title, size, session }: IssueContextProps) {
  const article = <IssueWriteUp issue={issue} title={title} session={session} variant={size === 'half' ? 'peek' : 'full'} />;

  /* AT TRIAGE THIS DOES NOT SCROLL. It is one section of the pane's single
     scroll, so the article is exactly as tall as the article and the fix sits
     directly under it - see the note in WorkPane. It used to be a pane-height
     box with its own scrollbar, which meant a short write-up left 200px of
     nothing between the prose and the fix, and the reader had two scrollbars to
     choose from with no way to tell which one they were in.

     THE PEEK STILL DOES. That one is a fixed half of the pane laid over a
     running replay, so it has a height that is not its content's, and something
     has to scroll. `auto`, not the `hover` this app uses elsewhere: with a
     hover-only scrollbar the article simply ends mid-sentence, and a clip with
     no affordance reads as a rendering fault rather than as "there is more". */
  return (
    <section className={`b-ctx b-ctx--${size}`} aria-label="Issue detail">
      {size === 'half' ? (
        <ScrollArea className="b-ctx__scroll" type="auto">
          {article}
        </ScrollArea>
      ) : (
        article
      )}
    </section>
  );
}
