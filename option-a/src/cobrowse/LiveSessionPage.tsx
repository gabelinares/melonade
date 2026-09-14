import { useEffect, useMemo, useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import { ExternalLink, Headset, Mic, MicOff, MonitorUp, MonitorX, Pencil, PencilOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import type { LiveSession } from '@shared/cobrowse-data.ts';
import { formatDuration } from '@shared/sessions-logic.ts';
import { replayMarkers } from '@shared/replay.ts';
import { liveIdentityOf, liveMetaOf, liveReplaySessionOf } from '@shared/media-logic.ts';
import type { CobrowseController } from '../state/useCobrowse.ts';
import { Chip } from '../components/Chip.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { ReplayPlayer } from '../replay/ReplayPlayer.tsx';
import { ReplayIdentity, ReplayScreen } from '../replay/ReplayScreen.tsx';
import { MarkersPanel } from '../replay/MarkersPanel.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';

export interface LiveSessionPageProps {
  session: LiveSession;
  model: CobrowseController;
}

/**
 * A VISITOR'S SCREEN, LIVE - production's LivePlayer. ⚠ ON THE ONE SCREEN
 * (2026-09-14), see SpotPlayerPage for Gabriel's words. `ReplayScreen` with
 * the visitor as the lead, the assist cluster as the verbs, the call window
 * floating over the stage, and the same `ReplayPlayer` a recording uses in
 * its live variant: the frame draws live, there is no timeline to scrub, and
 * LIVE plus the elapsed time sit where the timeline would. The dev tools are
 * the player's own - production's live view had only Console and Network,
 * but one player means one strip. The panel holds the activity so far.
 *
 * One red button, not three: production paints Annotate and Remote control
 * danger while active. Here an active tool is pressed, and End is the one
 * thing on the row that is red.
 */
export function LiveSessionPage({ session, model }: LiveSessionPageProps) {
  const { message } = App.useApp();
  const meta = useMemo(() => liveMetaOf(session), [session]);
  const replay = useMemo(() => liveReplaySessionOf(session), [session]);
  const markers = useMemo(() => replayMarkers(replay), [replay]);
  const clock = useReplayClock(Math.max(60, session.durationSec), {});
  useEffect(() => {
    if (!clock.playing) clock.play();
  }, [clock]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.round((now - session.startedAt) / 1000));
  const [panel, setPanel] = useState<string | null>(null);
  const [confirmCall, setConfirmCall] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const onCall = model.call === 'onCall';
  const identity = liveIdentityOf(session);
  const endCall = () => {
    model.endCall();
    message.info('Live session was closed.');
  };

  return (
    <>
      <ReplayScreen
        className="m-live"
        back={{ label: 'CoBrowse', onClick: model.closeLiveSession }}
        lead={
          <ReplayIdentity
            seed={identity}
            name={identity}
            meta={
              <span className="m-truncate">
                {meta.browser} on {meta.os} · {meta.viewport} · {session.city}, {session.country} · {meta.plan}
              </span>
            }
          />
        }
        actions={
          <>
            <Tooltip title="Open in new tab">
              <span>
                <IconButton icon={<ExternalLink size={14} />} label="Open in new tab" variant="ghost" onClick={() => message.info('The live view opens in its own tab in the real app.')} />
              </span>
            </Tooltip>
            <span className="m-rs__sep" aria-hidden="true" />
            {(onCall || model.remoteControl) && (
              <Tooltip title={model.annotating ? 'Stop annotating' : "Draw on the visitor's screen"}>
                <Button
                  size="small"
                  className={`m-rs__assist${model.annotating ? ' is-on' : ''}`}
                  icon={model.annotating ? <PencilOff size={13} /> : <Pencil size={13} />}
                  onClick={model.toggleAnnotating}
                >
                  Annotate
                </Button>
              </Tooltip>
            )}
            <Tooltip title={onCall ? (model.remoteControl ? 'Give control back' : "Take control of the visitor's screen") : 'Call user to initiate remote control'}>
              <span>
                <Button
                  size="small"
                  disabled={!onCall}
                  className={`m-rs__assist${model.remoteControl ? ' is-on' : ''}`}
                  icon={model.remoteControl ? <MonitorX size={13} /> : <MonitorUp size={13} />}
                  onClick={model.toggleRemoteControl}
                >
                  {model.remoteControl ? 'Stop control' : 'Remote control'}
                </Button>
              </span>
            </Tooltip>
            {onCall ? (
              <Button size="small" danger type="primary" icon={<PhoneOff size={13} />} onClick={endCall}>
                End
              </Button>
            ) : (
              <Tooltip title={`Call ${identity}`}>
                <Button size="small" type="primary" icon={<Headset size={13} />} onClick={() => setConfirmCall(true)}>
                  Call
                </Button>
              </Tooltip>
            )}
          </>
        }
        panels={[{ key: 'activity', label: 'Activity', count: markers.length, hint: 'What the visitor has done so far' }]}
        panel={panel}
        onPanel={setPanel}
        renderPanel={() => <MarkersPanel markers={markers} clock={clock} startLabel="Joined" />}
        overlay={
          <>
            {model.annotating && <div className="m-rs__ink" aria-hidden="true" />}
            {onCall && (
              <div className="m-rs__chat" role="dialog" aria-label="Call">
                <div className="m-rs__chat-video">
                  <SessionAvatar seed={identity} size={40} />
                  <span className="m-rs__chat-name m-truncate">{identity}</span>
                </div>
                <div className="m-rs__chat-controls">
                  <Tooltip title={mic ? 'Mute' : 'Unmute'}>
                    <span>
                      <IconButton icon={mic ? <Mic size={14} /> : <MicOff size={14} />} label={mic ? 'Mute' : 'Unmute'} variant="outline" pressed={!mic} onClick={() => setMic((v) => !v)} />
                    </span>
                  </Tooltip>
                  <Tooltip title={cam ? 'Stop camera' : 'Start camera'}>
                    <span>
                      <IconButton icon={cam ? <Video size={14} /> : <VideoOff size={14} />} label={cam ? 'Stop camera' : 'Start camera'} variant="outline" pressed={!cam} onClick={() => setCam((v) => !v)} />
                    </span>
                  </Tooltip>
                  <Button size="small" danger type="primary" icon={<PhoneOff size={13} />} onClick={endCall}>
                    End
                  </Button>
                </div>
              </div>
            )}
          </>
        }
      >
        <ReplayPlayer
          live
          url={`app.acme.com/${identity ? '' : ''}`}
          env={`${meta.browser} on ${meta.os} · ${meta.viewport}`}
          session={replay}
          clock={clock}
          markers={markers}
          footer={
            <div className="m-player__live">
              <Chip kind="status" tone="success">
                LIVE
              </Chip>
              <span className="m-player__elapsed m-mono">{formatDuration(elapsed)}</span>
              <span className="m-player__live-spacer" />
              <span className="m-rs__meta">Watching {identity}&apos;s screen, live</span>
            </div>
          }
        />
      </ReplayScreen>
      <ConfirmDialog
        open={confirmCall}
        title="Start call?"
        okText="Call"
        danger={false}
        onCancel={() => setConfirmCall(false)}
        onOk={() => {
          setConfirmCall(false);
          model.startCall();
        }}
      >
        Call <span className="m-dlg__subject">{identity}</span>? Their browser rings, and they choose whether to pick up.
      </ConfirmDialog>
    </>
  );
}
