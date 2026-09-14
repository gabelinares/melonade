import { useEffect, useMemo, useState } from 'react';
import { App, Button, Dropdown, Input, Popover, Switch, Tooltip } from 'antd';
import {
  Activity as ActivityIcon,
  ArrowLeft,
  Copy,
  Download,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreHorizontal,
  RotateCcw,
  RotateCw,
  SendHorizontal,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { Spot } from '@shared/spot-data.ts';
import { clipDuration } from '@shared/spot-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import { formatClock, sessionLogs, sessionRequests, type ReplayMarker } from '@shared/replay.ts';
import { spotActivityOf, spotMetaOf, spotReplaySessionOf, type SpotActivity, type SpotComment } from '@shared/media-logic.ts';
import type { SpotController } from '../state/useSpot.ts';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { ReplayFrame } from '../replay/ReplayFrame.tsx';
import { ReplayTimeline } from '../replay/ReplayTimeline.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';
import { ConsolePanel } from '../replay/devtools/ConsolePanel.tsx';
import { NetworkPanel } from '../replay/devtools/NetworkPanel.tsx';
import '../replay/replay-player.css';
import './spot-page.css';

export interface SpotPlayerPageProps {
  spot: Spot;
  model: SpotController;
}

type Panel = 'activity' | 'comments' | null;
type Tool = 'console' | 'network' | null;

const KIND_OF: Record<SpotActivity['kind'], ReplayMarker['kind']> = {
  nav: 'nav',
  click: 'click',
  input: 'input',
  error: 'error',
};

/**
 * ONE SPOT, PLAYING - production's `SpotPlayer`, the page a card opens.
 *
 * Top to bottom as production has it: a header that says whose clip this is
 * and gives you the three things you do with a clip (copy the link, decide who
 * can open it, delete it) plus the two panels you can hang on its right; then
 * the clip itself under a browser bar, its timeline with the play controls,
 * and the Console / Network blocks that open under the stage the way they do
 * on a session replay.
 *
 * ⚠ THE PLAYER PIECES ARE THE REPLAY'S OWN. The frame, the timeline (which
 * already carries play/pause, the clock and the speed strip), the console and
 * the network table are the components the session replay uses, fed through
 * `spotReplaySessionOf`. Production draws a separate 36px control row under
 * its own timeline; here the skip and fullscreen controls ride the timeline's
 * trailing slot instead, because a second set of play controls is the exact
 * kind of lookalike the componentization rule exists to stop.
 *
 * ⚠ ONE PANEL AT A TIME, and the active tab closes it (production: "Clicking
 * the active tab closes the panel"). The video gives up 320px while a panel
 * is open, so the two never overlap.
 */
export function SpotPlayerPage({ spot, model }: SpotPlayerPageProps) {
  const { message } = App.useApp();
  const meta = useMemo(() => spotMetaOf(spot), [spot]);
  const activity = useMemo(() => spotActivityOf(spot), [spot]);
  const session = useMemo(() => spotReplaySessionOf(spot), [spot]);
  const logs = useMemo(() => sessionLogs(session), [session]);
  const requests = useMemo(() => sessionRequests(session), [session]);
  const markers: ReplayMarker[] = useMemo(
    () => activity.map((a) => ({ at: a.at, kind: KIND_OF[a.kind], label: a.label })),
    [activity],
  );
  const failure = markers.find((m) => m.kind === 'error') ?? null;
  const clock = useReplayClock(spot.durationSec);

  const [panel, setPanel] = useState<Panel>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [openErrors, setOpenErrors] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* Escape leaves fullscreen, the way it does in a browser. */
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const activeIndex = useMemo(() => {
    let i = -1;
    markers.forEach((m, n) => {
      if (clock.at >= m.at) i = n;
    });
    return i;
  }, [markers, clock.at]);

  const copy = async (text: string, said: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(said);
    } catch {
      message.error('Could not copy');
    }
  };

  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const toggleTool = (t: Exclude<Tool, null>) => setTool((cur) => (cur === t ? null : t));
  const skip = (delta: number) => clock.seek(Math.max(0, Math.min(clock.duration, clock.at + delta)));

  return (
    <div className={`m-spotp${fullscreen ? ' is-fullscreen' : ''}${panel ? ' has-panel' : ''}`}>
      {/* ── the header ── */}
      <header className="m-spotp__head">
        <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={model.closeSpot} className="m-spotp__back">
          All Spots
        </Button>
        <span className="m-spotp__sep" aria-hidden="true" />
        <SessionAvatar seed={spot.ownerName} size={28} />
        <div className="m-spotp__who">
          <Tooltip title={spot.title} mouseEnterDelay={0.5}>
            <span className="m-spotp__title m-truncate">{spot.title}</span>
          </Tooltip>
          <span className="m-spotp__meta m-truncate">
            {spot.ownerName} · <RelativeTime minutesAgo={minutesSince(spot.createdAt)} /> · {meta.browser} · {meta.resolution} ·{' '}
            {meta.platform}
          </span>
        </div>
        <span className="m-spotp__spacer" />
        <Button size="small" icon={<Copy size={13} />} onClick={() => copy(meta.internalUrl, 'Internal sharing link copied to clipboard')}>
          Copy
        </Button>
        <Popover
          trigger="click"
          placement="bottomRight"
          content={
            <div className="m-spotp__access">
              <label className="m-spotp__access-row">
                <span>Anyone with the link can view</span>
                <Switch size="small" checked={model.isPublic} onChange={model.setPublic} />
              </label>
              {model.isPublic ? (
                <div className="m-spotp__access-link">
                  <span className="m-mono m-truncate">{meta.publicUrl}</span>
                  <IconButton icon={<Copy size={12} />} label="Copy public link" variant="ghost" onClick={() => copy(meta.publicUrl, 'Public link copied to clipboard')} />
                </div>
              ) : (
                <p className="m-spotp__access-hint">Only members of this workspace can open the spot.</p>
              )}
            </div>
          }
        >
          <Button size="small" icon={<Settings2 size={13} />}>
            Manage access
          </Button>
        </Popover>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              { key: 'download', icon: <Download size={13} />, label: 'Download video' },
              { key: 'delete', icon: <Trash2 size={13} />, label: 'Delete', danger: true },
            ],
            onClick: ({ key }) => {
              if (key === 'delete') setConfirmDelete(true);
              else message.info('Preparing the download…');
            },
          }}
        >
          <span>
            <IconButton icon={<MoreHorizontal size={15} />} label="More" variant="ghost" />
          </span>
        </Dropdown>
        <span className="m-spotp__sep" aria-hidden="true" />
        <div className="m-spotp__tabs" role="tablist" aria-label="Side panel">
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'activity'}
            className={`m-spotp__tab${panel === 'activity' ? ' is-on' : ''}`}
            onClick={() => togglePanel('activity')}
          >
            <Users size={14} aria-hidden="true" />
            Activity
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panel === 'comments'}
            className={`m-spotp__tab${panel === 'comments' ? ' is-on' : ''}`}
            onClick={() => togglePanel('comments')}
          >
            <MessageSquare size={14} aria-hidden="true" />
            Comments
            <span className="m-spotp__badge">{model.comments.length}</span>
          </button>
        </div>
      </header>

      <div className="m-spotp__body">
        {/* ── the clip ── */}
        <section className="m-player m-spotp__player" aria-label="Spot recording">
          <div className="m-player__chrome">
            <span className="m-player__lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="m-player__url m-mono m-truncate">app.acme.com{activity[activeIndex]?.kind === 'nav' ? activity[activeIndex]!.label.replace('Opened ', '') : ''}</span>
            <span className="m-player__env">
              {meta.browser} · {meta.resolution}
            </span>
          </div>
          <div className="m-player__stage">
            <ReplayFrame className="m-player__viewport" markerIndex={activeIndex} clicking={activeIndex >= 0 && clock.at - markers[activeIndex]!.at < 1} variant="still" />
            <p className="m-player__caption" aria-live="polite">
              {activeIndex >= 0 ? markers[activeIndex]!.label : 'Clip start'}
            </p>
          </div>

          {/* The Console / Network block, under the stage like the replay's. */}
          {tool && (
            <div className="m-spotp__tool">
              <div className="m-spotp__tool-head">
                <span className="m-spotp__tool-title">{tool === 'console' ? 'Console' : 'Network'}</span>
                <IconButton icon={<X size={13} />} label="Close panel" variant="ghost" onClick={() => setTool(null)} />
              </div>
              <div className="m-spotp__tool-body">
                {tool === 'console' ? (
                  <ConsolePanel logs={logs} clock={clock} openErrors={openErrors} onOpenErrors={setOpenErrors} />
                ) : (
                  <NetworkPanel requests={requests} clock={clock} />
                )}
              </div>
            </div>
          )}

          <ReplayTimeline
            clock={clock}
            markers={markers}
            failure={failure}
            trailing={
              <span className="m-spotp__controls">
                <Tooltip title="Back 10 seconds">
                  <IconButton icon={<RotateCcw size={14} />} label="Back 10 seconds" variant="ghost" onClick={() => skip(-10)} />
                </Tooltip>
                <Tooltip title="Forward 10 seconds">
                  <IconButton icon={<RotateCw size={14} />} label="Forward 10 seconds" variant="ghost" onClick={() => skip(10)} />
                </Tooltip>
                <span className="m-spotp__sep" aria-hidden="true" />
                <button
                  type="button"
                  className={`m-spotp__toolbtn${tool === 'console' ? ' is-on' : ''}${logs.some((l) => l.level === 'error') ? ' has-error' : ''}`}
                  onClick={() => toggleTool('console')}
                  aria-pressed={tool === 'console'}
                >
                  Console
                </button>
                <button
                  type="button"
                  className={`m-spotp__toolbtn${tool === 'network' ? ' is-on' : ''}`}
                  onClick={() => toggleTool('network')}
                  aria-pressed={tool === 'network'}
                >
                  Network
                </button>
                <span className="m-spotp__sep" aria-hidden="true" />
                <Tooltip title="Playback settings">
                  <IconButton icon={<Settings2 size={14} />} label="Playback settings" variant="ghost" onClick={() => message.info('Quality and captions come with the real player.')} />
                </Tooltip>
                <Tooltip title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
                  <IconButton
                    icon={fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    variant="ghost"
                    onClick={() => setFullscreen((v) => !v)}
                  />
                </Tooltip>
              </span>
            }
          />
        </section>

        {/* ── the right panel ── */}
        {panel === 'comments' && (
          <CommentsPanel
            comments={model.comments}
            canPost={model.canComment}
            onPost={model.addComment}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === 'activity' && (
          <ActivityPanel
            activity={activity}
            at={clock.at}
            onSeek={(s) => clock.seek(s)}
            onClose={() => setPanel(null)}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this spot?"
        okText="Delete"
        onCancel={() => setConfirmDelete(false)}
        onOk={() => {
          setConfirmDelete(false);
          model.remove(spot.id);
          message.success('Spot successfully deleted');
        }}
      >
        <span className="m-dlg__subject">{spot.title}</span> ({clipDuration(spot.durationSec)}) is deleted for everyone,
        including anyone holding its public link.
      </ConfirmDialog>
    </div>
  );
}

/* ── COMMENTS: production's CommentsSection, 320px on the right ─────────────
   A list and a composer. No illustration when the list is empty - production
   renders nothing above the composer, and an empty thread on a fresh clip is
   the normal state, not a failure to show. */
function CommentsPanel({
  comments,
  canPost,
  onPost,
  onClose,
}: {
  comments: SpotComment[];
  canPost: boolean;
  onPost: (body: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const send = () => {
    const body = draft.trim();
    if (!body || !canPost) return;
    onPost(body);
    setDraft('');
  };
  return (
    <aside className="m-spotp__panel" aria-label="Comments">
      <div className="m-spotp__panel-head">
        <span className="m-spotp__panel-title">Comments</span>
        <IconButton icon={<X size={14} />} label="Close comments" variant="ghost" onClick={onClose} />
      </div>
      <ul className="m-spotp__comments">
        {comments.map((c) => (
          <li key={c.id} className="m-spotp__comment">
            <span className="m-spotp__initial" aria-hidden="true">
              {c.author.charAt(0)}
            </span>
            <div className="m-spotp__comment-body">
              <span className="m-spotp__comment-meta">
                <span className="m-spotp__comment-author">{c.author}</span>
                <RelativeTime minutesAgo={c.minutesAgo} />
              </span>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="m-spotp__composer">
        <Input
          value={draft}
          placeholder="Add a comment..."
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={send}
          disabled={!canPost}
        />
        <Tooltip title={canPost ? 'Send' : 'Limited to 25 messages.'}>
          <span>
            <button
              type="button"
              className="m-spotp__send"
              aria-label="Send comment"
              disabled={!canPost || !draft.trim()}
              onClick={send}
            >
              <SendHorizontal size={14} aria-hidden="true" />
            </button>
          </span>
        </Tooltip>
      </div>
    </aside>
  );
}

/* ── ACTIVITY: production's SpotActivity - a time-stamped list that seeks ── */
function ActivityPanel({
  activity,
  at,
  onSeek,
  onClose,
}: {
  activity: SpotActivity[];
  at: number;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}) {
  let current = -1;
  activity.forEach((a, i) => {
    if (at >= a.at) current = i;
  });
  return (
    <aside className="m-spotp__panel" aria-label="Activity">
      <div className="m-spotp__panel-head">
        <span className="m-spotp__panel-title">
          <ActivityIcon size={14} aria-hidden="true" /> Activity
        </span>
        <IconButton icon={<X size={14} />} label="Close activity" variant="ghost" onClick={onClose} />
      </div>
      <ul className="m-spotp__activity">
        {activity.map((a, i) => (
          <li key={`${a.at}-${i}`}>
            <button
              type="button"
              className={`m-spotp__act${i === current ? ' is-now' : ''}${a.kind === 'error' ? ' is-error' : ''}`}
              onClick={() => onSeek(a.at)}
            >
              <span className="m-spotp__act-time m-mono">{formatClock(a.at)}</span>
              <span className="m-spotp__act-label m-truncate">{a.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
