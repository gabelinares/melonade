import { useState } from 'react';
import { Segmented, Slider } from 'antd';
import { ChevronDown, FlaskConical, RotateCcw } from 'lucide-react';
import { AGENTS } from '../nav/agents.ts';
import { useProtoTokens } from '../theme/ProtoTokens.tsx';
import { ACCENTS, FONTS, GREYS, type AccentKey, type FontKey, type GreyKey } from '../tokens/proto-themes.ts';
import type { DataState } from '@shared/issues-logic.ts';
import './prototype-panel.css';

export interface PrototypePanelProps {
  agentCount: number;
  onAgentCount: (n: number) => void;
  dataState: DataState;
  onDataState: (s: DataState) => void;
}

/**
 * Reviewer controls, and deliberately NOT dressed as product UI.
 *
 * The brief's real questions are "how will the menu look once there is more in
 * it" and, since 2026-08-26, "what does it look like in another face and another
 * grey" - both of which you answer by looking, not by reading a claim about it.
 * So each one is a control. Same for the states a demo normally hides: loading
 * and empty are where list designs actually fail.
 *
 * THE TOKEN SWITCHES ARE REAL TOKENS, not a second stylesheet. Every option is
 * generated from the shipped OKLCH intent with one parameter moved, so a grey
 * here keeps the exact lightness ladder and contrast steps the palette was
 * audited at. That is the difference between a choice and a mock-up: whatever is
 * picked is shippable.
 *
 * It looks like scaffolding on purpose. A reviewer must never wonder whether
 * this ships.
 */
export function PrototypePanel({
  agentCount,
  onAgentCount,
  dataState,
  onDataState,
}: PrototypePanelProps) {
  /* Collapsed by default: it is fixed to the corner, and an expanded panel
     covers the bottom of a long page. The page should present itself first. */
  const [open, setOpen] = useState(false);
  const tok = useProtoTokens();

  const opts = (m: Record<string, { label: string }>) =>
    Object.entries(m).map(([value, v]) => ({ value, label: v.label }));

  return (
    <aside className={`m-proto${open ? ' is-open' : ''}`} aria-label="Prototype controls">
      <button
        type="button"
        className="m-proto__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <FlaskConical size={13} aria-hidden="true" />
        <span>Prototype controls</span>
        <ChevronDown size={13} className="m-proto__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className="m-proto__body">
          <div className="m-proto__field">
            <label className="m-proto__label" htmlFor="proto-agents">
              Agents in the menu
              <span className="m-proto__value">{agentCount}</span>
            </label>
            <Slider
              id="proto-agents"
              min={1}
              max={AGENTS.length}
              value={agentCount}
              onChange={onAgentCount}
              tooltip={{ open: false }}
            />
            <p className="m-proto__hint">
              Three ship today. Drag it up to see whether the menu still holds.
            </p>
          </div>

          {/* ── the look ─────────────────────────────────────────────────────
              Type first, because it changes every line on the page and it is
              the note Mehdi opened with. */}
          <div className="m-proto__field">
            <span className="m-proto__label">Typeface</span>
            <Segmented
              size="small"
              block
              value={tok.font}
              onChange={(v) => tok.setFont(v as FontKey)}
              options={opts(FONTS)}
            />
            <p className="m-proto__hint">{FONTS[tok.font]?.note}.</p>
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Grey</span>
            <Segmented
              size="small"
              block
              value={tok.grey}
              onChange={(v) => tok.setGrey(v as GreyKey)}
              options={opts(GREYS)}
            />
            <p className="m-proto__hint">
              Same lightness ladder in all three, only the hue moves, so every
              contrast step survives the switch.
            </p>
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Accent</span>
            <Segmented
              size="small"
              block
              value={tok.accent}
              onChange={(v) => tok.setAccent(v as AccentKey)}
              options={opts(ACCENTS)}
            />
            <p className="m-proto__hint">
              Indigo is the suggestion: quiet at these chromas, and far enough
              from the alarm colours that a selected row can never read as one.
            </p>
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Density</span>
            <Segmented
              size="small"
              block
              value={tok.density}
              onChange={(v) => tok.setDensity(v as 'compact' | 'spaced')}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'spaced', label: 'Spaced' },
              ]}
            />
            <p className="m-proto__hint">
              Spacing and control heights move together. Gaps that grow while the
              rows stay put read as a bug, not as a roomier product.
            </p>
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">List state</span>
            <Segmented
              size="small"
              block
              value={dataState}
              onChange={(v) => onDataState(v as DataState)}
              options={[
                { value: 'ready', label: 'Loaded' },
                { value: 'loading', label: 'Loading' },
                { value: 'empty', label: 'Empty' },
              ]}
            />
          </div>

          <button type="button" className="m-proto__reset" onClick={tok.reset}>
            <RotateCcw size={12} aria-hidden="true" />
            Back to the shipped tokens
          </button>
        </div>
      )}
    </aside>
  );
}
