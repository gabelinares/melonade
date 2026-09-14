import { useState } from 'react';
import { Input, Tooltip } from 'antd';
import { SendHorizontal } from 'lucide-react';
import { RelativeTime } from '../components/RelativeTime.tsx';

export interface ReplayComment {
  id: number | string;
  author: string;
  minutesAgo: number;
  body: string;
}

/**
 * A THREAD ON A RECORDING - production's Spot comments, as the side panel's
 * "Comments" tab. A list and a composer. No illustration when the list is
 * empty: production renders nothing above the composer, and an empty thread
 * on a fresh clip is the normal state, not a failure to show. Any recording
 * that grows comments later (a session, an issue) renders this same tab.
 */
export function CommentsPanel({
  comments,
  canPost,
  limitNote = 'Limited to 25 messages.',
  onPost,
}: {
  comments: ReplayComment[];
  canPost: boolean;
  limitNote?: string;
  onPost: (body: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const send = () => {
    const body = draft.trim();
    if (!body || !canPost) return;
    onPost(body);
    setDraft('');
  };
  return (
    <>
      <ul className="m-rs__comments">
        {comments.map((c) => (
          <li key={c.id} className="m-rs__comment">
            <span className="m-rs__initial" aria-hidden="true">
              {c.author.charAt(0)}
            </span>
            <div className="m-rs__comment-body">
              <span className="m-rs__comment-meta">
                <span className="m-rs__comment-author">{c.author}</span>
                <RelativeTime minutesAgo={c.minutesAgo} />
              </span>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="m-rs__composer">
        <Input value={draft} placeholder="Add a comment..." onChange={(e) => setDraft(e.target.value)} onPressEnter={send} disabled={!canPost} />
        <Tooltip title={canPost ? 'Send' : limitNote}>
          <span>
            <button type="button" className="m-rs__send" aria-label="Send comment" disabled={!canPost || !draft.trim()} onClick={send}>
              <SendHorizontal size={14} aria-hidden="true" />
            </button>
          </span>
        </Tooltip>
      </div>
    </>
  );
}
