import { useEffect, useMemo, useState } from 'react';
import { App, Button, Tooltip } from 'antd';
import {
  ArrowLeft,
  ExternalLink,
  Headset,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Pencil,
  PencilOff,
  PhoneOff,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import type { LiveSession } from '@shared/cobrowse-data.ts';
import { formatDuration } from '@shared/sessions-logic.ts';
import { sessionLogs, sessionRequests } from '@shared/replay.ts';
import { liveIdentityOf, liveMetaOf, liveReplaySessionOf } from '@shared/media-logic.ts';
import type { CobrowseController } from '../state/useCobrowse.ts';
import { Chip } from '../components/Chip.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { IconButton } from '../components/IconButton.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import { ReplayFrame } from '../replay/ReplayFrame.tsx';
import { useReplayClock } from '../replay/useReplayClock.ts';
import { ConsolePanel } from '../replay/devtools/ConsolePanel.tsx';
import { NetworkPanel } from '../replay/devtools/NetworkPanel.tsx';
import '../replay/replay-player.css';
import './cobrowse-page.css';

export interface LiveSessionPageProps {
  session: LiveSession;
  model: CobrowseController;
}

type Tool = 'console' | 'network' | null;

/**
 * ONE VISITOR, LIVE - production's assist `LivePlayer`, the page a live row
 * opens.
 *
 * The header says who you are watching and what you can do to help them, in
 * the order production keeps: Annotate (only once you are on a call or in
 * control - drawing on a screen nobody is talking to you about is noise),
 * Remote control (only on a call: "Call user to initiate remote control"),
 * and Call, which becomes End while the call is on. Starting a call asks
 * first, because it rings on the visitor's side.
 *
 * ⚠ THE SCREEN IS THE REPLAY'S FRAME IN ITS LIVE VARIANT, driven by a clock
 * that is always playing - there is no scrubbing a live session, so there is
 * no timeline under it, only the LIVE tag and how long they have been on. The
 * Console and Network blocks are the replay's own panels, fed the session
 * through `liveReplaySessionOf`, the same way the spot player and the session
 * replay feed theirs.
 */
export function LiveSessionPage({ session, model }: LiveSessionPageProps) {
  const { message } = App.useApp();
  const meta = useMemo(() => liveMetaOf(session), [session]);
  const replay = useMemo(() => liveReplaySessionOf(session), [session]);
  const logs = useMemo(() => sessionLogs(replay), [replay]);
  const requests = useMemo(() => sessionRequests(replay), [replay]);
  const hasError = logs.some((l) => l.level === 'error');

  /* Live means playing. The clock loops so the cursor never freezes. */
  const clock = useReplayClock(Math.max(60, session.durationSec), {});
  useEffect(() => {
    if (!clock.playing) clock.play();
  }, [clock]);
  const markerIndex = Math.floor(clock.at / 6);

  /* Elapsed since the visitor arrived, ticking once a second. */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.round((now - session.startedAt) / 1000));

  const [tool, setTool] = useState<Tool>(null);
  const [openErrors, setOpenErrors] = useState(false);
  const [confirmCall, setConfirmCall] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);

  const onCall = model.call === 'onCall';
  const identity = liveIdentityOf(session);
  const toggleTool = (t: Exclude<Tool, null>) => setTool((cur) => (cur === t ? null : t));

  const endCall = () => {
    model.endCall();
    message.info('Live session was closed.');
  };

  return (
    <div className="m-live">
      {/* ── the header ── */}
      <header className="m-live__head">
        <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={model.closeLiveSession} className="m-live__back">
          CoBrowse
        </Button>
        <span className="m-live__sep" aria-hidden="true" />
        {/* production's UserCard */}
        <SessionAvatar seed={identity} size={28} />
        <div className="m-live__who">
          <span className="m-live__name m-truncate">{identity}</span>
          <span className="m-live__meta m-truncate">
            {meta.browser} on {meta.os} · {meta.viewport}
          </span>
        </div>
        <span className="m-live__spacer" />
        <Chip kind="tag">
          {session.city}, {session.country}
        </Chip>
        <Chip kind="tag">{meta.plan}</Chip>
        <span className="m-live__sep" aria-hidden="true" />

        {/* ── the assist cluster ──
            ⚠ AN ACTIVE TOOL IS PRESSED, NOT RED. Production paints Annotate and
            Remote control danger while active, which puts three red buttons on
            one row beside End. Here the one red thing on the row is the one
            that ends the call; an active tool is a filled default
            (`.m-live__assist.is-on`). */}
        {(onCall || model.remoteControl) && (
          <Tooltip title={model.annotating ? 'Stop annotating' : 'Draw on the visitor\'s screen'}>
            <Button
              size="small"
              className={`m-live__assist${model.annotating ? ' is-on' : ''}`}
              icon={model.annotating ? <PencilOff size={13} /> : <Pencil size={13} />}
              onClick={model.toggleAnnotating}
            >
              Annotate
            </Button>
          </Tooltip>
        )}
        <Tooltip title={onCall ? (model.remoteControl ? 'Give control back' : 'Take control of the visitor\'s screen') : 'Call user to initiate remote control'}>
          <span>
            <Button
              size="small"
              disabled={!onCall}
              className={`m-live__assist${model.remoteControl ? ' is-on' : ''}`}
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
      </header>

      {/* ── the sub-header ── */}
      <div className="m-live__sub">
        <span className="m-live__sub-text m-truncate">
          Watching {identity}&apos;s screen, live
        </span>
        <Tooltip title="Open in new tab">
          <IconButton icon={<ExternalLink size={14} />} label="Open in new tab" variant="ghost" onClick={() => message.info('The live view opens in its own tab in the real app.')} />
        </Tooltip>
      </div>

      {/* ── the screen ── */}
      <section className="m-player m-live__player" aria-label="Live screen">
        <div className="m-player__stage">
          <ReplayFrame className="m-player__viewport" markerIndex={markerIndex} variant="live" />
          {model.annotating && <div className="m-live__ink" aria-hidden="true" />}
          {onCall && (
            <div className="m-live__chat" role="dialog" aria-label="Call">
              <div className="m-live__chat-video">
                <SessionAvatar seed={identity} size={40} />
                <span className="m-live__chat-name m-truncate">{identity}</span>
              </div>
              <div className="m-live__chat-controls">
                <Tooltip title={mic ? 'Mute' : 'Unmute'}>
                  <IconButton icon={mic ? <Mic size={14} /> : <MicOff size={14} />} label={mic ? 'Mute' : 'Unmute'} variant="outline" pressed={!mic} onClick={() => setMic((v) => !v)} />
                </Tooltip>
                <Tooltip title={cam ? 'Stop camera' : 'Start camera'}>
                  <IconButton icon={cam ? <Video size={14} /> : <VideoOff size={14} />} label={cam ? 'Stop camera' : 'Start camera'} variant="outline" pressed={!cam} onClick={() => setCam((v) => !v)} />
                </Tooltip>
                <Button size="small" danger type="primary" icon={<PhoneOff size={13} />} onClick={endCall}>
                  End
                </Button>
              </div>
            </div>
          )}
        </div>

        {tool && (
          <div className="m-live__tool">
            <div className="m-live__tool-head">
              <span className="m-live__tool-title">{tool === 'console' ? 'Console' : 'Network'}</span>
              <IconButton icon={<X size={13} />} label="Close panel" variant="ghost" onClick={() => setTool(null)} />
            </div>
            <div className="m-live__tool-body">
              {tool === 'console' ? (
                <ConsolePanel logs={logs} clock={clock} openErrors={openErrors} onOpenErrors={setOpenErrors} />
              ) : (
                <NetworkPanel requests={requests} clock={clock} />
              )}
            </div>
          </div>
        )}

        {/* ── the footer controls ── */}
        <div className="m-live__foot">
          <Chip kind="status" tone="success">
            LIVE
          </Chip>
          <span className="m-live__elapsed m-mono">{formatDuration(elapsed)}</span>
          <span className="m-live__spacer" />
          <button
            type="button"
            className={`m-live__toolbtn${tool === 'console' ? ' is-on' : ''}${hasError ? ' has-error' : ''}`}
            aria-pressed={tool === 'console'}
            onClick={() => toggleTool('console')}
          >
            Console
          </button>
          <button
            type="button"
            className={`m-live__toolbtn${tool === 'network' ? ' is-on' : ''}`}
            aria-pressed={tool === 'network'}
            onClick={() => toggleTool('network')}
          >
            Network
          </button>
        </div>
      </section>

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
    </div>
  );
}
