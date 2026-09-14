import { useEffect, useMemo, useState } from 'react';
import { App, Button, Dropdown, Popover, Switch, Tooltip } from 'antd';
import { Copy, Download, Maximize2, Minimize2, MoreHorizontal, RotateCcw, RotateCw, Settings2, Trash2 } from 'lucide-react';
import { clipDuration, type Spot } from '@shared/spot-data.ts';
import { minutesSince } from '@shared/tests-data.ts';
import type { ReplayMarker } from '@shared/replay.ts';
import { spotActivityOf, spotMetaOf, spotReplaySessionOf, type SpotActivity } from '@shared/media-logic.ts';
import type { SpotController } from '../state/useSpot.ts';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { RelativeTime } from '../components/RelativeTime.tsx';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { ReplayIdentity, ReplayScreen } from '../replay/ReplayScreen.tsx';
import { MarkersPanel } from '../replay/MarkersPanel.tsx';
import { CommentsPanel } from '../replay/CommentsPanel.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';

export interface SpotPlayerPageProps {
  spot: Spot;
  model: SpotController;
}

const KIND_OF: Record<SpotActivity['kind'], ReplayMarker['kind']> = { nav: 'nav', click: 'click', input: 'input', error: 'error' };

/**
 * A SPOT, OPENED FROM ITS CARD - production's SpotPlayer. ⚠ ON THE ONE
 * SCREEN (2026-09-14): the first cut drew its own header, its own stage and
 * its own right panel, and Gabriel caught it - "cobrowsing and spots are using
 * a completely different replay screen. This is a problem we can't afford."
 * So: `ReplayScreen` with the clip's lead (owner, title, the meta line
 * production prints), the clip's verbs (Copy, Manage access, the menu), and
 * the two tabs a clip has - Comments and Activity - in the shared panel. The
 * stage is the same `ReplayPlayer` a session uses, in its clip variant: the
 * activity drives the frame, the dev tools are the player's own, and skip /
 * settings / fullscreen ride the timeline's control slot.
 */
export function SpotPlayerPage({ spot, model }: SpotPlayerPageProps) {
  const { message } = App.useApp();
  const meta = useMemo(() => spotMetaOf(spot), [spot]);
  const activity = useMemo(() => spotActivityOf(spot), [spot]);
  const session = useMemo(() => spotReplaySessionOf(spot), [spot]);
  const markers: ReplayMarker[] = useMemo(() => activity.map((a) => ({ at: a.at, kind: KIND_OF[a.kind], label: a.label })), [activity]);
  const clock = useReplayClock(spot.durationSec);
  const [panel, setPanel] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const copy = async (text: string, said: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(said);
    } catch {
      message.error('Could not copy');
    }
  };
  const skip = (delta: number) => clock.seek(Math.max(0, Math.min(clock.duration, clock.at + delta)));

  return (
    <>
      <ReplayScreen
        className={`m-spotp${fullscreen ? ' is-fullscreen' : ''}`}
        back={{ label: 'All Spots', onClick: model.closeSpot }}
        lead={
          <ReplayIdentity
            seed={spot.ownerName}
            name={spot.title}
            title={spot.title}
            meta={
              <span className="m-truncate">
                {spot.ownerName} · <RelativeTime minutesAgo={minutesSince(spot.createdAt)} /> · {meta.browser} · {meta.resolution} · {meta.platform}
              </span>
            }
          />
        }
        actions={
          <>
            <Button size="small" icon={<Copy size={13} />} onClick={() => copy(meta.internalUrl, 'Internal sharing link copied to clipboard')}>
              Copy
            </Button>
            <Popover
              trigger="click"
              placement="bottomRight"
              content={
                <div className="m-rs__access">
                  <label className="m-rs__access-row">
                    <span>Anyone with the link can view</span>
                    <Switch size="small" checked={model.isPublic} onChange={model.setPublic} />
                  </label>
                  {model.isPublic ? (
                    <div className="m-rs__access-link">
                      <span className="m-mono m-truncate">{meta.publicUrl}</span>
                      <IconButton icon={<Copy size={12} />} label="Copy public link" variant="ghost" onClick={() => copy(meta.publicUrl, 'Public link copied to clipboard')} />
                    </div>
                  ) : (
                    <p className="m-rs__access-hint">Only members of this workspace can open the spot.</p>
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
          </>
        }
        panels={[
          { key: 'comments', label: 'Comments', count: model.comments.length, hint: 'The thread on this clip' },
          { key: 'activity', label: 'Activity', count: markers.length, hint: 'What happened in the clip, in order' },
        ]}
        panel={panel}
        onPanel={setPanel}
        renderPanel={(key) =>
          key === 'comments' ? (
            <CommentsPanel comments={model.comments} canPost={model.canComment} onPost={model.addComment} />
          ) : (
            <MarkersPanel markers={markers} clock={clock} startLabel="Clip start" />
          )
        }
      >
        <ReplayPlayer
          url={`app.acme.com${activity.find((a) => a.kind === 'nav')?.label.replace('Opened ', '') ?? ''}`}
          env={`${meta.browser} · ${meta.resolution}`}
          session={session}
          clock={clock}
          markers={markers}
          startLabel="Clip start"
          trailing={
            <span className="m-rs__controls">
              <Tooltip title="Back 10 seconds">
                <IconButton icon={<RotateCcw size={14} />} label="Back 10 seconds" variant="ghost" onClick={() => skip(-10)} />
              </Tooltip>
              <Tooltip title="Forward 10 seconds">
                <IconButton icon={<RotateCw size={14} />} label="Forward 10 seconds" variant="ghost" onClick={() => skip(10)} />
              </Tooltip>
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
      </ReplayScreen>
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
        <span className="m-dlg__subject">{spot.title}</span> ({clipDuration(spot.durationSec)}) is deleted for everyone, including anyone
        holding its public link.
      </ConfirmDialog>
    </>
  );
}
