import { useState } from 'react';
import { Segmented, Select, Slider, Tooltip } from 'antd';
import { ChevronDown, FlaskConical, RotateCcw } from 'lucide-react';
import { AGENTS } from '../nav/agents.ts';
import { FILTERS, useProtoTokens, type FiltersKey } from '../theme/ProtoTokens.tsx';
import {
  ACCENTS,
  CORNERS,
  FONTS,
  GREYS,
  type AccentKey,
  type CornersKey,
  type FontKey,
  type GreyKey,
  type ProtoFont,
} from '../tokens/proto-themes.ts';
import type { DataState } from '@shared/issues-logic.ts';
import './prototype-panel.css';
import { noNativeTooltip } from '../components/selectOptions.ts';

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
/**
 * One row of the type dropdown, set in the system it is offering.
 *
 * Three marks, because a system moves four things and the fourth - the body -
 * is the name itself, which is why the name is set in that system's own sans
 * rather than in the panel's:
 *
 *   Ag     the page title's face, at its weight and its tracking
 *   Tag    a tag, set exactly as that system sets tags (some shout, some do not)
 *   12.4k  a figure, which is the mark that catches Console
 *
 * Compact on purpose. This is a menu, not a type sample book: it has to say
 * "these two are different and here is how" in one line, at a glance, while the
 * cursor is already moving.
 */
function Specimen({ font }: { font: ProtoFont }) {
  return (
    <span className="m-proto__spec">
      <span className="m-proto__spec-name" style={{ fontFamily: font.sans }}>
        {font.label}
      </span>
      <span
        className="m-proto__spec-title"
        style={{
          fontFamily: font.display,
          fontWeight: font.displayWeight,
          letterSpacing: font.displayTracking,
        }}
      >
        Ag
      </span>
      <span
        className="m-proto__spec-tag"
        style={{
          fontFamily: font.tag,
          fontSize: font.tagSize,
          fontWeight: font.tagWeight,
          textTransform: font.tagCase as 'none' | 'uppercase',
          letterSpacing: font.tagTracking,
        }}
      >
        Tag
      </span>
      <span className="m-proto__spec-num" style={{ fontFamily: font.num }}>
        12.4k
      </span>
    </span>
  );
}

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
          </div>

          {/* ── the look ─────────────────────────────────────────────────────
              Type first, because it changes every line on the page and it is
              the note Mehdi opened with.

              These are PAIRINGS, not faces: each one sets a display face for
              the titles, a body face for everything else, a mono for numbers
              and a face for tags - which is where the three combinations
              actually differ from the shipped design, since Graphite sets its
              chips in the same sans as the page. */}
          <div className="m-proto__field">
            <span className="m-proto__label">Type</span>
            {/* A dropdown rather than a strip: five options do not fit across
                264px, and unlike the greys and the accents these are not a
                spectrum you scrub along - each one is a whole system.

                And each row SHOWS itself. The names are kept, because a system
                is easier to talk about than to point at, but a name is not a
                specimen: "Console" tells you nothing until you have already
                picked it once. Every row is set in its own faces - see
                <Specimen> for what the three marks are. */}
            <Select
              size="small"
              className="m-proto__select"
              value={tok.font}
              onChange={(v) => tok.setFont(v as FontKey)}
              options={noNativeTooltip(Object.entries(FONTS).map(([value, f]) => ({ value, label: f.label, font: f })))}
              optionRender={(opt) => <Specimen font={(opt.data as { font: ProtoFont }).font} />}
              /* The closed control stays a name: the specimen is for choosing,
                 and once chosen the page itself is the specimen. */
              labelRender={({ value }) => FONTS[value as FontKey]?.label ?? String(value)}
              popupMatchSelectWidth={288}
            />
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
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Accent</span>
            {/* A PALETTE, not a segmented control. Thirteen hues in thirteen
                labelled cells is thirteen words nobody reads; a swatch says the
                thing it is offering. Each one is that accent's own 600 step -
                the colour a selected row and a link would take - and the
                tooltip carries the name and how far it sits from the nearest
                alarm colour, which is the only fact that can rule one out. */}
            <div className="m-proto__swatches" role="group" aria-label="Accent">
              {Object.entries(ACCENTS).map(([key, a]) => (
                <Tooltip key={key} title={`${a.label} — ${a.note}`}>
                  <button
                    type="button"
                    className={`m-proto__swatch${tok.accent === key ? ' is-on' : ''}`}
                    style={{ background: a.palette['a-600'] }}
                    aria-label={a.label}
                    aria-pressed={tok.accent === key}
                    onClick={() => tok.setAccent(key as AccentKey)}
                  />
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Corners</span>
            <Segmented
              size="small"
              block
              value={tok.corners}
              onChange={(v) => tok.setCorners(v as CornersKey)}
              options={opts(CORNERS)}
            />
          </div>

          <div className="m-proto__field">
            <span className="m-proto__label">Filter pills</span>
            <Segmented
              size="small"
              block
              value={tok.filters}
              onChange={(v) => tok.setFilters(v as FiltersKey)}
              options={opts(FILTERS)}
            />
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
