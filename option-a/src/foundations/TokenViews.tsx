/* ══════════════════════════════════════════════════════════════════════════
   The rendering helpers the foundations docs are built from.

   Every one of these reads the token modules at runtime. Nothing here holds a
   hex value, a px number or a duration of its own: a doc that restates its
   values is a doc that goes out of date silently, and this system's whole claim
   is that there is one source of truth. If a table below looks wrong, the
   tokens are wrong.
   ══════════════════════════════════════════════════════════════════════════ */

import { useState, type CSSProperties, type ReactNode } from 'react';
import { palette } from '../tokens/palette.ts';
import {
  border,
  darkColors,
  elevation,
  lightColors,
  motion,
  radius,
  space,
  typography,
} from '../tokens/tokens.ts';

/* ── shared bits ─────────────────────────────────────────────────────────── */

/** `shadow-color` is stored as a bare RGB triplet so it can be composed inside
 *  `rgb(... / alpha)`. A swatch has to put it back together. */
const toCss = (value: string): string =>
  /^\d+\s+\d+\s+\d+$/.test(value) ? `rgb(${value})` : value;

const PRIMITIVE_BY_VALUE = new Map<string, string>();
for (const [name, value] of Object.entries(palette)) {
  if (!PRIMITIVE_BY_VALUE.has(value)) PRIMITIVE_BY_VALUE.set(value, name);
}

const mono: CSSProperties = {
  fontFamily: 'var(--m-font-mono)',
  fontSize: 'var(--m-text-2xs)',
  letterSpacing: 0,
};

const cell: CSSProperties = {
  padding: '6px 12px 6px 0',
  borderBottom: '1px solid var(--m-border-subtle)',
  verticalAlign: 'middle',
  textAlign: 'left',
  fontWeight: 'inherit',
};

const headCell: CSSProperties = {
  ...cell,
  borderBottom: '1px solid var(--m-border-default)',
  fontSize: 'var(--m-text-2xs)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--m-tracking-wide)',
  color: 'var(--m-content-muted)',
  fontWeight: 'var(--m-weight-medium)',
};

function Table({ head, children }: { head: readonly string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: 'var(--m-text-sm)',
          color: 'var(--m-content-primary)',
        }}
      >
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={headCell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ── colour ──────────────────────────────────────────────────────────────── */

export function Swatch({ value, size = 20 }: { value: string; size?: number }) {
  return (
    <span
      title={value}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 'var(--m-radius-xs)',
        background: toCss(value),
        border: '1px solid var(--m-border-default)',
        verticalAlign: 'middle',
      }}
    />
  );
}

const RAMPS: readonly { prefix: string; title: string; note: string }[] = [
  { prefix: 'n', title: 'n-*  neutral', note: 'the spine of the system: every surface, every rule, every line of text' },
  { prefix: 'a', title: 'a-*  accent', note: 'one restrained teal, rationed to selection, links and focus' },
  { prefix: 'danger', title: 'danger-*', note: 'high impact, failed payments, the critical flag' },
  { prefix: 'warning', title: 'warning-*', note: 'degraded rather than broken' },
  { prefix: 'success', title: 'success-*', note: 'present for completeness, almost never right in a triage view' },
  { prefix: 'dark', title: 'dark-*', note: 'the dark surface ladder and its text steps, computed for a dark ground rather than inverted' },
];

export function PrimitiveRamps() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-7)' }}>
      {RAMPS.map((ramp) => {
        const entries = Object.entries(palette).filter(([name]) => {
          const [head] = name.split('-');
          return (head ?? name) === ramp.prefix;
        });
        return (
          <section key={ramp.prefix}>
            <h3 style={{ fontSize: 'var(--m-text-md)', marginBottom: 4 }}>{ramp.title}</h3>
            <p
              style={{
                fontSize: 'var(--m-text-xs)',
                color: 'var(--m-content-muted)',
                marginBottom: 'var(--m-space-5)',
              }}
            >
              {ramp.note}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                gap: 'var(--m-space-4)',
              }}
            >
              {entries.map(([name, value]) => (
                <div key={name} style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{
                      height: 44,
                      borderRadius: 'var(--m-radius-sm)',
                      background: toCss(value),
                      border: '1px solid var(--m-border-subtle)',
                    }}
                  />
                  <span style={{ ...mono, color: 'var(--m-content-secondary)' }}>{name}</span>
                  <span style={{ ...mono, color: 'var(--m-content-muted)' }}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const DARK_BY_ROLE = new Map(Object.entries(darkColors));

export function RoleTable({ filter }: { filter?: string }) {
  const rows = Object.entries(lightColors).filter(([role]) =>
    filter ? role.startsWith(filter) : true,
  );

  return (
    <Table head={['Role', 'Light', 'Dark', 'Primitive (light / dark)']}>
      {rows.map(([role, light]) => {
        const dark = DARK_BY_ROLE.get(role) ?? light;
        return (
          <tr key={role}>
            <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{role}</td>
            <td style={cell}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Swatch value={light} />
                <span style={mono}>{light}</span>
              </span>
            </td>
            <td style={cell}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Swatch value={dark} />
                <span style={mono}>{dark}</span>
              </span>
            </td>
            <td style={{ ...cell, ...mono, color: 'var(--m-content-muted)' }}>
              {PRIMITIVE_BY_VALUE.get(light) ?? 'none'} / {PRIMITIVE_BY_VALUE.get(dark) ?? 'none'}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

/* ── type ────────────────────────────────────────────────────────────────── */

const remToPx = (value: string): string => {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? value : `${Math.round(n * 16 * 100) / 100}px`;
};

const TYPE_USE: Record<string, string> = {
  'text-2xs': 'micro labels, counts, the collapsed-rail dot legend',
  'text-xs': 'table meta, captions, chips, tooltips',
  'text-sm': 'THE base size. Body text, table cells, nav rows, controls',
  'text-md': 'emphasis inside a row, empty-state titles, larger controls',
  'text-lg': 'section titles, modal titles',
  'text-xl': 'page title, and nothing else',
  'text-2xl': 'the only display step. Unused so far, which is the point',
};

export function TypeScale() {
  const steps = Object.entries(typography).filter(([name]) => name.startsWith('text-'));
  return (
    <Table head={['Token', 'Value', 'px', 'Specimen', 'Use']}>
      {steps.map(([name, value]) => (
        <tr key={name}>
          <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{name}</td>
          <td style={{ ...cell, ...mono }}>{value}</td>
          <td style={{ ...cell, ...mono }}>{remToPx(value)}</td>
          <td style={{ ...cell, fontSize: value, whiteSpace: 'nowrap' }}>
            Card declined at checkout
          </td>
          <td style={{ ...cell, fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)' }}>
            {TYPE_USE[name] ?? ''}
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function Weights() {
  const weights = Object.entries(typography).filter(([name]) => name.startsWith('weight-'));
  return (
    <Table head={['Token', 'Value', 'Specimen']}>
      {weights.map(([name, value]) => (
        <tr key={name}>
          <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{name}</td>
          <td style={{ ...cell, ...mono }}>{value}</td>
          <td style={{ ...cell, fontWeight: value, fontSize: 'var(--m-text-md)' }}>
            Card declined at checkout
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function LineHeights() {
  const leads = Object.entries(typography).filter(([name]) => name.startsWith('leading-'));
  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-6)' }}>
      {leads.map(([name, value]) => (
        <div key={name}>
          <p style={{ ...mono, color: 'var(--m-content-muted)', marginBottom: 4 }}>
            {name} · {value}
          </p>
          <p style={{ lineHeight: value, maxWidth: '52ch', fontSize: 'var(--m-text-sm)' }}>
            When the payment processor returns a declined status, the checkout UI swallows the error
            entirely: no message, no toast, no inline validation. Most people retry the same card
            two or three times before giving up.
          </p>
        </div>
      ))}
    </div>
  );
}

export function Tracking() {
  const tracks = Object.entries(typography).filter(([name]) => name.startsWith('tracking-'));
  return (
    <Table head={['Token', 'Value', 'Specimen']}>
      {tracks.map(([name, value]) => (
        <tr key={name}>
          <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{name}</td>
          <td style={{ ...cell, ...mono }}>{value}</td>
          <td style={{ ...cell, letterSpacing: value, fontSize: 'var(--m-text-md)' }}>
            Card declined at checkout
          </td>
        </tr>
      ))}
    </Table>
  );
}

export function Families() {
  const families = Object.entries(typography).filter(([name]) => name.startsWith('font-'));
  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-6)' }}>
      {families.map(([name, value]) => (
        <div key={name}>
          <p style={{ ...mono, color: 'var(--m-content-muted)', marginBottom: 4 }}>{name}</p>
          <p style={{ fontFamily: value, fontSize: 'var(--m-text-xl)' }}>
            Card declined at checkout · 0123456789
          </p>
          <p
            style={{
              fontSize: 'var(--m-text-2xs)',
              color: 'var(--m-content-muted)',
              marginTop: 4,
              wordBreak: 'break-word',
            }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── space and shape ─────────────────────────────────────────────────────── */

export function SpaceBars() {
  const steps = Object.entries(space);
  return (
    <Table head={['Token', 'Value', 'px', 'Width']}>
      {steps.map(([name, value]) => (
        <tr key={name}>
          <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{name}</td>
          <td style={{ ...cell, ...mono }}>{value}</td>
          <td style={{ ...cell, ...mono, color: 'var(--m-content-muted)' }}>
            {value.endsWith('rem') ? remToPx(value) : value}
          </td>
          <td style={{ ...cell, width: '100%' }}>
            <span
              style={{
                display: 'block',
                width: value,
                minWidth: 1,
                height: 12,
                borderRadius: 2,
                background: 'var(--m-content-accent)',
              }}
            />
          </td>
        </tr>
      ))}
    </Table>
  );
}

const RADIUS_USE: Record<string, string> = {
  'radius-xs': 'chips, checkboxes, the filter count badge',
  'radius-sm': 'controls: buttons, inputs, nav rows, filter buttons',
  'radius-md': 'cards, popovers, modals',
  'radius-lg': 'reserved. Nothing in the app is this round yet',
  'radius-full': 'the capture pill and the presence dot only',
};

export function RadiusBoxes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--m-space-6)' }}>
      {Object.entries(radius).map(([name, value]) => (
        <div key={name} style={{ display: 'grid', gap: 6, width: 168 }}>
          <span
            style={{
              height: 56,
              borderRadius: value,
              background: 'var(--m-surface-sunken)',
              border: '1px solid var(--m-border-default)',
            }}
          />
          <span style={{ ...mono, color: 'var(--m-content-secondary)' }}>
            {name} · {value}
          </span>
          <span style={{ fontSize: 'var(--m-text-2xs)', color: 'var(--m-content-muted)' }}>
            {RADIUS_USE[name] ?? ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BorderWidths() {
  return (
    <Table head={['Token', 'Value', 'Rule']}>
      {Object.entries(border).map(([name, value]) => (
        <tr key={name}>
          <td style={{ ...cell, ...mono, whiteSpace: 'nowrap' }}>{name}</td>
          <td style={{ ...cell, ...mono }}>{value}</td>
          <td style={{ ...cell, width: '100%' }}>
            <span
              style={{
                display: 'block',
                width: '100%',
                height: 0,
                borderTop: `${value} solid var(--m-border-strong)`,
              }}
            />
          </td>
        </tr>
      ))}
    </Table>
  );
}

/* ── elevation ───────────────────────────────────────────────────────────── */

const SHADOW_USE: Record<string, string> = {
  'shadow-none': 'cards, the page shell, the table, the nav. Everything that sits IN the page.',
  'shadow-popover': 'popovers, dropdowns, tooltips: layers that float over content and must be read as detached.',
  'shadow-modal': 'modals only, where the shadow pairs with a scrim.',
};

export function ElevationCards() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-8)', maxWidth: 460 }}>
      {Object.entries(elevation).map(([name, value]) => (
        <div key={name}>
          <div
            style={{
              padding: 'var(--m-space-6)',
              borderRadius: 'var(--m-radius-md)',
              background: 'var(--m-surface-raised)',
              border: '1px solid var(--m-border-default)',
              boxShadow: value,
            }}
          >
            <p style={{ fontSize: 'var(--m-text-md)', fontWeight: 'var(--m-weight-medium)' }}>
              {name}
            </p>
            <p
              style={{
                fontSize: 'var(--m-text-xs)',
                color: 'var(--m-content-muted)',
                marginTop: 4,
              }}
            >
              {SHADOW_USE[name] ?? ''}
            </p>
          </div>
          <p style={{ ...mono, color: 'var(--m-content-muted)', marginTop: 6 }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── motion ──────────────────────────────────────────────────────────────── */

function Track({
  label,
  duration,
  easing,
  moved,
}: {
  label: string;
  duration: string;
  easing: string;
  moved: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ ...mono, color: 'var(--m-content-secondary)' }}>{label}</span>
      <span
        style={{
          position: 'relative',
          display: 'block',
          width: 260,
          height: 16,
          borderRadius: 'var(--m-radius-full)',
          background: 'var(--m-surface-sunken)',
          border: '1px solid var(--m-border-subtle)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 1,
            left: 1,
            width: 12,
            height: 12,
            borderRadius: 'var(--m-radius-full)',
            background: 'var(--m-content-accent)',
            transform: `translateX(${moved ? 244 : 0}px)`,
            transition: `transform ${duration} ${easing}`,
          }}
        />
      </span>
    </div>
  );
}

/** Hover the row: every duration token runs the same 244px at once, which is
 *  the only way the 50ms between two of them is perceptible. */
export function DurationLadder() {
  const [moved, setMoved] = useState(false);
  const durations = Object.entries(motion).filter(([name]) => name.startsWith('duration-'));

  return (
    <div
      onMouseEnter={() => setMoved(true)}
      onMouseLeave={() => setMoved(false)}
      style={{
        display: 'grid',
        gap: 'var(--m-space-5)',
        padding: 'var(--m-space-6)',
        borderRadius: 'var(--m-radius-md)',
        border: '1px dashed var(--m-border-default)',
        width: 'fit-content',
      }}
    >
      <p style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-content-muted)' }}>
        Hover anywhere in this box.
      </p>
      {durations.map(([name, value]) => (
        <Track
          key={name}
          label={`${name} · ${value}`}
          duration={value}
          easing={motion['ease-out']}
          moved={moved}
        />
      ))}
    </div>
  );
}

/** Press the button: both easings run at `duration-slow`, because at 180ms the
 *  difference between them is real but only just. */
export function EasingCompare() {
  const [moved, setMoved] = useState(false);
  const easings = Object.entries(motion).filter(([name]) => name.startsWith('ease-'));

  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-5)', width: 'fit-content' }}>
      <button
        type="button"
        onClick={() => setMoved((m) => !m)}
        style={{
          justifySelf: 'start',
          height: 'var(--m-control-height-md)',
          padding: '0 12px',
          borderRadius: 'var(--m-radius-sm)',
          background: 'var(--m-action-primary-bg)',
          color: 'var(--m-action-primary-fg)',
          fontSize: 'var(--m-text-sm)',
          fontWeight: 'var(--m-weight-medium)',
        }}
      >
        {moved ? 'Send them back' : 'Run both'}
      </button>
      {easings.map(([name, value]) => (
        <Track
          key={name}
          label={`${name} · ${value}`}
          duration={motion['duration-slow']}
          easing={value}
          moved={moved}
        />
      ))}
    </div>
  );
}
