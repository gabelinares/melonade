import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import { ArrowLeft, PanelRight, X } from 'lucide-react';
import { IconButton } from '../components/IconButton.tsx';
import { SessionAvatar } from '../components/SessionAvatar.tsx';
import '../issues/work-pane.css';
import '../issues/issue-header.css';
import './journey-panel.css';
import './replay-screen.css';

export interface ReplayPanelTab {
  key: string;
  label: string;
  count?: number;
  hint?: string;
}

export interface ReplayScreenProps {
  /** The list you came from, by name. One level, like PageCard.back. */
  back: { label: string; onClick: () => void };
  /** What the header says this is: `<ReplayIdentity/>` for a person's session,
   *  a spot, a live visitor; the write-up toggle for an issue. */
  lead: ReactNode;
  /** The verbs, right of the lead: bookmark and share, copy and access, the
   *  assist cluster, the Jira button. Whatever the starting point owns. */
  actions?: ReactNode;
  /** The side panel's tabs. Given, the header grows the one panel toggle and
   *  the panel opens to whichever tab `panel` names. Absent, there is no panel. */
  panels?: ReplayPanelTab[];
  panel?: string | null;
  onPanel?: (key: string | null) => void;
  renderPanel?: (key: string) => ReactNode;
  /** The expandable element above the stage - the issue's write-up peek. */
  peek?: ReactNode;
  /** A band between the peek and the stage - the issue's sessions strip. */
  strip?: ReactNode;
  /** Floating over the main column: a call window, annotation ink. */
  overlay?: ReactNode;
  className?: string;
  /** The stage: a ReplayPlayer in one of its variants, or at the issue's
   *  triage depth the document itself. */
  children: ReactNode;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE ONE REPLAY SCREEN.
 *
 * Gabriel, 2026-09-14, on finding that Spot and CoBrowse had each drawn their
 * own: *"there should be a single screen for replays and the components should
 * vary in a way that contain all the possible variations of it. I think the
 * most complete is in issues replay, where you have a side bar that includes
 * tabs multipurpose (you can allocate activity there for example). The dev
 * tools is also there, the tabs are there and the top element can be expanded
 * if needed. Don't create one replay page per each starting point of the flow,
 * it's all a single shared screen."*
 *
 * So this IS the Issues pane's frame, lifted out: a header (back, who or what,
 * the verbs, one toggle for the side panel), a body split into the main column
 * and the panel, the main column holding an expandable element, a band, and
 * the stage. Every starting point - a session row, an issue, a spot, a live
 * visitor, a person's timeline, a card's drill-down - renders this with its
 * own lead, its own verbs, its own tabs, and the player in the variant it
 * needs. Nothing about the frame is decided per starting point.
 *
 * The frame keeps the Issues pane's class names (m-work, m-ihdr, m-jrn), so the
 * pane that already existed did not move a pixel; the parts the other screens
 * brought with them are under `m-rs__`.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ReplayScreen({
  back,
  lead,
  actions,
  panels,
  panel = null,
  onPanel,
  renderPanel,
  peek,
  strip,
  overlay,
  className,
  children,
}: ReplayScreenProps) {
  const open = panels && panel ? panels.find((t) => t.key === panel) ?? null : null;
  return (
    <div className={`m-work${className ? ` ${className}` : ''}`}>
      <header className="m-ihdr">
        <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={back.onClick} className="m-rs__back">
          {back.label}
        </Button>
        <span className="m-rs__sep" aria-hidden="true" />
        <div className="m-rs__lead">{lead}</div>
        {actions && <div className="m-ihdr__actions">{actions}</div>}
        {/* ONE TOGGLE FOR THE PANEL, not one per tab: the tabs live in the panel,
            where you pick between them once it is open. Pressed while open. */}
        {panels && panels.length > 0 && onPanel && (
          <div className="m-ihdr__panels" role="group" aria-label="Side panel">
            <Tooltip title={open ? 'Hide the side panel (F)' : 'Show the side panel (F)'}>
              <span>
                <IconButton
                  icon={<PanelRight size={15} />}
                  label={open ? 'Hide the side panel' : 'Show the side panel'}
                  variant="ghost"
                  pressed={open != null}
                  onClick={() => onPanel(open ? null : panels[0]!.key)}
                />
              </span>
            </Tooltip>
          </div>
        )}
      </header>
      <div className="m-work__body">
        <div className="m-work__main">
          {peek && <div className="m-work__peek">{peek}</div>}
          {strip}
          {children}
          {overlay}
        </div>
        {open && panels && renderPanel && onPanel && (
          <aside className="m-jrn" aria-label={open.label}>
            <div className="m-rs__aside-head">
              <header className="m-jrn__head" role="tablist" aria-label="Panel">
                {panels.map((t) => (
                  <Tooltip key={t.key} title={t.hint} mouseEnterDelay={0.5}>
                    <button
                      type="button"
                      role="tab"
                      className={`m-jrn__tab${t.key === open.key ? ' is-on' : ''}`}
                      aria-selected={t.key === open.key}
                      onClick={() => onPanel(t.key)}
                    >
                      {t.label}
                      {t.count != null && <span className="m-rs__badge">{t.count}</span>}
                    </button>
                  </Tooltip>
                ))}
              </header>
              <span className="m-rs__aside-close">
                <IconButton icon={<X size={14} />} label="Close the side panel" variant="ghost" onClick={() => onPanel(null)} />
              </span>
            </div>
            <div className="m-jrn__scroll">{renderPanel(open.key)}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** The header's lead for anything that is a person or a clip: the list's own
 *  avatar on the same seed, a name, one line of meta. */
export function ReplayIdentity({ seed, name, meta, title }: { seed: string; name: ReactNode; meta?: ReactNode; title?: string }) {
  return (
    <div className="m-rs__who">
      <SessionAvatar seed={seed} size={28} />
      <div className="m-rs__names">
        <Tooltip title={title} mouseEnterDelay={0.5}>
          <span className="m-rs__name m-truncate">{name}</span>
        </Tooltip>
        {meta && <span className="m-rs__meta m-truncate">{meta}</span>}
      </div>
    </div>
  );
}
