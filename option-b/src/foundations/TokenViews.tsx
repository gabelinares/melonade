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
  layout,
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
  padding: '7px 14px 7px 0',
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

const caption: CSSProperties = {
  fontSize: 'var(--m-text-2xs)',
  color: 'var(--m-content-muted)',
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
  {
    prefix: 'n',
    title: 'n-*  neutral',
    note: 'Not grey. Every step carries a trace of the accent hue, which is what lets a plum-tinted chrome sit beside a white reading pane without either looking dirty.',
  },
  {
    prefix: 'a',
    title: 'a-*  accent',
    note: 'The plum, and this option owns it: selection, the primary action, the brand mark and focus all come from this one ramp.',
  },
  {
    prefix: 'danger',
    title: 'danger-*',
    note: 'High impact, failed payments, the critical flag. Warm enough to sit in the same family as the accent rather than fighting it.',
  },
  { prefix: 'warning', title: 'warning-*', note: 'Degraded rather than broken.' },
  {
    prefix: 'success',
    title: 'success-*',
    note: 'Present for completeness, almost never right in a triage view.',
  },
  {
    prefix: 'dark',
    title: 'dark-*',
    note: 'The dark surface ladder and its text steps, computed for a dark ground at the same chroma as the light ramp rather than inverted from it.',
  },
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
                maxWidth: '68ch',
              }}
            >
              {ramp.note}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                gap: 'var(--m-space-4)',
              }}
            >
              {entries.map(([name, value]) => (
                <div key={name} style={{ display: 'grid', gap: 4 }}>
                  <span
                    style={{
                      height: 46,
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

/** The inversion, drawn rather than described: three surfaces side by side in
 *  the order the layout puts them, so "depth runs toward the content" is
 *  something a reader can check by looking. */
export function SurfaceLadder() {
  const panes: readonly { role: keyof typeof lightColors; name: string; note: string }[] = [
    { role: 'surface-nav', name: 'The rail', note: 'the darkest chrome' },
    { role: 'surface-sunken', name: 'The list column', note: 'tinted, the queue' },
    { role: 'surface-default', name: 'The detail pane', note: 'the brightest plane' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid var(--m-border-default)',
        borderRadius: 'var(--m-radius-md)',
        overflow: 'hidden',
        background: 'var(--m-surface-canvas)',
      }}
    >
      {panes.map((pane, i) => (
        <div
          key={pane.role}
          style={{
            flex: i === panes.length - 1 ? 2 : 1,
            padding: 'var(--m-space-6)',
            minHeight: 132,
            background: `var(--m-${pane.role})`,
            borderRight:
              i === panes.length - 1 ? 'none' : '1px solid var(--m-border-subtle)',
          }}
        >
          <p style={{ fontSize: 'var(--m-text-sm)', fontWeight: 'var(--m-weight-medium)' }}>
            {pane.name}
          </p>
          <p style={{ ...caption, marginTop: 4 }}>{pane.note}</p>
          <p style={{ ...mono, color: 'var(--m-content-muted)', marginTop: 10 }}>{pane.role}</p>
        </div>
      ))}
    </div>
  );
}

/* ── type ────────────────────────────────────────────────────────────────── */

const remToPx = (value: string): string => {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? value : `${Math.round(n * 16 * 100) / 100}px`;
};

const TYPE_USE: Record<string, string> = {
  'text-2xs': 'the uppercase section label, counts, the rail badge',
  'text-xs': 'row meta, captions, chips, tooltips',
  'text-sm': 'secondary prose, the empty-state hint, compact controls',
  'text-md': 'THE base size. Body text, row titles, menu items, controls',
  'text-lg': 'the lede of a write-up, and nothing smaller than a section',
  'text-xl': 'a pane heading in the sans',
  'text-2xl': 'the list column title, which is the only sans heading at size',
  'text-3xl': 'the serif issue title in the detail pane',
  'text-4xl': 'the serif empty-state headline, the largest thing in the product',
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
          <p style={{ lineHeight: value, maxWidth: '56ch', fontSize: 'var(--m-text-md)' }}>
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
          <td
            style={{
              ...cell,
              letterSpacing: value,
              fontSize: name === 'tracking-serif' ? 'var(--m-text-2xl)' : 'var(--m-text-md)',
              fontFamily:
                name === 'tracking-serif' ? 'var(--m-font-serif)' : 'var(--m-font-sans)',
              textTransform: name === 'tracking-wide' ? 'uppercase' : 'none',
            }}
          >
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
          <p style={{ fontFamily: value, fontSize: 'var(--m-text-2xl)' }}>
            Card declined at checkout · 0123456789
          </p>
          <p
            style={{
              ...caption,
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

/** The contrast axis, at one size. Two grotesks that are nearly the same is the
 *  pairing mistake; this is the check that the pair is actually a pair. */
export function SerifVsSans() {
  const line = 'Card declined at checkout on mobile Safari';
  const rows: readonly { label: string; family: string; tracking: string }[] = [
    {
      label: 'font-sans, the interface',
      family: typography['font-sans'],
      tracking: typography['tracking-tight'],
    },
    {
      label: 'font-serif, display only',
      family: typography['font-serif'],
      tracking: typography['tracking-serif'],
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-7)' }}>
      {rows.map((row) => (
        <div key={row.label}>
          <p style={{ ...mono, color: 'var(--m-content-muted)', marginBottom: 6 }}>{row.label}</p>
          <p
            style={{
              fontFamily: row.family,
              fontSize: typography['text-3xl'],
              lineHeight: typography['leading-tight'],
              letterSpacing: row.tracking,
              fontWeight: 400,
            }}
          >
            {line}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Where the serif is allowed, and what it looks like when it is not. The wrong
 *  column is the useful half: a display face on a label is the failure this
 *  rule exists to prevent. */
export function SerifPlacement() {
  const wrong: CSSProperties = {
    fontFamily: 'var(--m-font-serif)',
    letterSpacing: 'var(--m-tracking-serif)',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 'var(--m-space-7)',
      }}
    >
      <section>
        <p style={{ ...caption, marginBottom: 'var(--m-space-4)' }}>
          Allowed, and these two places only
        </p>
        <div
          style={{
            display: 'grid',
            gap: 'var(--m-space-6)',
            padding: 'var(--m-space-6)',
            borderRadius: 'var(--m-radius-md)',
            background: 'var(--m-surface-default)',
            border: '1px solid var(--m-border-default)',
          }}
        >
          <p
            className="m-display"
            style={{ fontSize: 'var(--m-text-3xl)', color: 'var(--m-content-primary)' }}
          >
            Card declined at checkout
          </p>
          <p
            className="m-display"
            style={{ fontSize: 'var(--m-text-4xl)', color: 'var(--m-content-primary)' }}
          >
            Nothing selected
          </p>
        </div>
      </section>

      <section>
        <p style={{ ...caption, marginBottom: 'var(--m-space-4)' }}>
          Never, and this is why the rule is a class rather than a heading rule
        </p>
        <div
          style={{
            display: 'grid',
            gap: 'var(--m-space-5)',
            padding: 'var(--m-space-6)',
            borderRadius: 'var(--m-radius-md)',
            background: 'var(--m-surface-sunken)',
            border: '1px dashed var(--m-border-strong)',
          }}
        >
          <span className="m-label" style={wrong}>
            Sessions that hit it
          </span>
          <span
            style={{
              ...wrong,
              justifySelf: 'start',
              height: 'var(--m-control-height-md)',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 14px',
              borderRadius: 'var(--m-radius-sm)',
              background: 'var(--m-action-primary-bg)',
              color: 'var(--m-action-primary-fg)',
              fontSize: 'var(--m-text-md)',
            }}
          >
            Hide issue
          </span>
          <span style={{ ...wrong, fontSize: 'var(--m-text-md)' }}>
            42 sessions · 18h ago · Billing &amp; checkout
          </span>
        </div>
      </section>
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
  'radius-xs': 'chips, the checkbox in a menu row, the segmented control',
  'radius-sm': 'controls: buttons, inputs, rail slots, menu rows, popovers',
  'radius-md': 'modals and the prototype panel',
  'radius-lg': 'reserved for a full card, which this layout does not have yet',
  'radius-full': 'the capture pill, the impact dot, the avatar',
};

export function RadiusBoxes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--m-space-6)' }}>
      {Object.entries(radius).map(([name, value]) => (
        <div key={name} style={{ display: 'grid', gap: 6, width: 172 }}>
          <span
            style={{
              height: 58,
              borderRadius: value,
              background: 'var(--m-surface-sunken)',
              border: '1px solid var(--m-border-default)',
            }}
          />
          <span style={{ ...mono, color: 'var(--m-content-secondary)' }}>
            {name} · {value}
          </span>
          <span style={caption}>{RADIUS_USE[name] ?? ''}</span>
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

const LAYOUT_USE: Record<string, string> = {
  'rail-width': 'the agent rail, at every window size and every agent count',
  'list-width': 'the triage column, which is a reading measure and not a fraction',
  'list-width-wide': 'the same column above 1600px, where there is width to spare',
  'control-height-sm': 'compact buttons inside a row',
  'control-height-md': 'the default control height',
  'control-height-lg': 'a control that stands alone, such as a dialog action',
  'row-height': 'a two-line list row, which the loading skeleton matches exactly',
  'header-height': 'the detail pane header, the one horizontal rule in it',
};

/** The layout constants at their real width, because these four numbers are
 *  what make this layout this layout: change `list-width` and you have a
 *  different product. */
export function LayoutBars() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gap: 'var(--m-space-5)', minWidth: 480 }}>
        {Object.entries(layout).map(([name, value]) => (
          <div key={name} style={{ display: 'grid', gap: 5 }}>
            <span style={{ ...mono, color: 'var(--m-content-secondary)' }}>
              {name} · {value} · {remToPx(value)}
            </span>
            <span
              style={{
                display: 'block',
                width: value,
                height: name.startsWith('control-height') || name === 'row-height' ? value : 14,
                borderRadius: 'var(--m-radius-xs)',
                background: 'var(--m-surface-selected)',
                border: '1px solid var(--m-border-accent)',
              }}
            />
            <span style={caption}>{LAYOUT_USE[name] ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── elevation ───────────────────────────────────────────────────────────── */

const SHADOW_USE: Record<string, string> = {
  'shadow-none':
    'the rail, the list column, the detail pane, every row. Everything that sits IN the layout.',
  'shadow-card': 'the one hairline lift, and it is almost invisible on purpose.',
  'shadow-popover':
    'popovers, menus, the capture panel: layers that float over content and must read as detached.',
  'shadow-modal': 'modals only, where the shadow pairs with a scrim.',
};

export function ElevationCards() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-8)', maxWidth: 480 }}>
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
            <p style={{ ...caption, marginTop: 4 }}>{SHADOW_USE[name] ?? ''}</p>
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
            background: 'var(--m-action-primary-bg)',
            transform: `translateX(${moved ? 244 : 0}px)`,
            transition: `transform ${duration} ${easing}`,
          }}
        />
      </span>
    </div>
  );
}

/** Hover the row: every duration token runs the same 244px at once, which is
 *  the only way the 60ms between two of them is perceptible. */
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

/** Press the button: both easings run at `duration-slow`, because the tail is
 *  the whole difference between them and a short duration hides it. */
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
          padding: '0 14px',
          borderRadius: 'var(--m-radius-sm)',
          background: 'var(--m-action-primary-bg)',
          color: 'var(--m-action-primary-fg)',
          fontSize: 'var(--m-text-md)',
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

/** Press and hold: the two things in the product that actually animate are a
 *  surface swap on a row and a control reacting to a press, so the durations
 *  are shown on those rather than on an abstract box. */
export function HoverPressDemo() {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 'var(--m-space-6)', maxWidth: 420 }}>
      <div>
        <p style={{ ...mono, color: 'var(--m-content-muted)', marginBottom: 6 }}>
          duration-instant · a row taking its hover surface
        </p>
        <div
          style={{
            padding: 'var(--m-space-4) var(--m-space-5)',
            borderRadius: 'var(--m-radius-sm)',
            border: '1px solid var(--m-border-subtle)',
            fontSize: 'var(--m-text-md)',
            transition: `background-color ${motion['duration-instant']} ${motion['ease-out']}`,
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--m-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Card declined at checkout
        </div>
      </div>

      <div>
        <p style={{ ...mono, color: 'var(--m-content-muted)', marginBottom: 6 }}>
          duration-fast · a control answering a press
        </p>
        <button
          type="button"
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            height: 'var(--m-control-height-md)',
            padding: '0 14px',
            borderRadius: 'var(--m-radius-sm)',
            background: 'var(--m-action-primary-bg)',
            color: 'var(--m-action-primary-fg)',
            fontSize: 'var(--m-text-md)',
            fontWeight: 'var(--m-weight-medium)',
            transform: pressed ? 'scale(0.97)' : 'scale(1)',
            transition: `transform ${motion['duration-fast']} ${motion['ease-out']}`,
          }}
        >
          Hide issue
        </button>
      </div>
    </div>
  );
}
