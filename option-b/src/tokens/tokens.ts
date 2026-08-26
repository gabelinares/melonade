/* ═══════════════════════════════════════════════════════════════════════════
   OPTION B: "ATRIUM"

   The semantic token layer. Same two-layer architecture as option A, and
   deliberately the same token NAMES, because that is what makes the two options
   comparable: identical roles, different decisions behind them. tokens.css is
   GENERATED from this file; the Mantine theme is DERIVED from it.

   The identity, in one line: a committed plum accent on cool grey neutrals,
   where the CHROME sits darker than the content and the reading surface is the
   brightest thing on screen. Airier than option A, structurally a triage
   console rather than a page.

   Three decisions worth naming, because they are what make this not-option-A:

   1. INVERTED ELEVATION. In option A (and in the app it replaces) the page is
      grey and the card is white. Here the rail and the list column are the
      tinted surfaces and the detail pane is white, so the eye is pulled to the
      thing you are actually reading. Depth runs toward the content, not toward
      the frame.
   2. A COMMITTED ACCENT ON GREY NEUTRALS. Option A rations colour to almost
      nothing and makes the primary action ink. This one owns a hue: plum
      carries selection and the primary action. But the neutrals are grey, not
      plum-tinted - that is the 08-21 correction. The first pass tinted the
      surfaces at the same chroma as the accent, and the result read as a purple
      room rather than as a grey room with a plum accent in it. The hue now
      lives in the ACCENT ONLY, and only at full strength where the accent is a
      small shape: a-50 and a-900 are large tinted planes (the selected row, the
      suggested-fix panel) and they are held near-graphite on purpose.
      The brand mark is not part of this. It is watermelon, it has its own
      `brand-mark` role, and it is the only element allowed to read it - see the
      note beside that role and the `brand` ramp in tools/gen-palette.mjs.
   3. TYPE ON A CONTRAST AXIS. A grotesk for the interface and a high-contrast
      serif for the one thing the product is actually selling: the agent's
      write-up. The serif NEVER appears on a label, a button, or a data cell.
   ═══════════════════════════════════════════════════════════════════════════ */

import { palette as p } from './palette.ts';

/* ── colour roles ────────────────────────────────────────────────────────── */

export const lightColors = {
  /* surfaces. Note the inversion: `nav` and `sunken` are the tinted chrome and
     `default` is the bright reading plane. */
  'surface-canvas': p['n-150'],    // the gap between panes
  'surface-default': p['n-0'],     // the detail pane: the brightest surface
  'surface-sunken': p['n-50'],     // the list column
  'surface-raised': p['n-0'],      // menus, popovers, modals
  'surface-nav': p['n-100'],       // the agent rail: the darkest chrome
  'surface-hover': p['n-100'],
  'surface-active': p['n-150'],
  'surface-selected': p['a-50'],   // the selected issue in the list
  'surface-disabled': p['n-100'],
  'surface-inverse': p['n-900'],

  'content-primary': p['n-900'],
  'content-secondary': p['n-700'],
  'content-muted': p['n-600'],
  'content-placeholder': p['n-550'],
  'content-disabled': p['n-400'],
  'content-decorative': p['n-500'],
  'content-inverse': p['n-0'],
  'content-accent': p['a-600'],
  'content-danger': p['danger-600'],
  'content-warning': p['warning-700'],
  'content-success': p['success-600'],

  /* Borders. Fewer of them than option A uses, and softer: this option leans on
     surface changes and space to separate things, which is the other half of
     what makes it read as airy. */
  'border-subtle': p['n-150'],
  'border-default': p['n-200'],
  'border-strong': p['n-300'],
  'border-accent': p['a-500'],
  'border-danger': p['danger-500'],

  /* Actions. Primary IS the accent here, which is the whole point of a
     committed palette. */
  'action-primary-bg': p['a-600'],
  'action-primary-bg-hover': p['a-700'],
  'action-primary-bg-active': p['a-700'],
  'action-primary-fg': p['n-0'],

  'action-secondary-bg': p['n-0'],
  'action-secondary-bg-hover': p['n-50'],
  'action-secondary-bg-active': p['n-150'],
  'action-secondary-fg': p['n-800'],
  'action-secondary-border': p['n-200'],

  'action-subtle-bg': 'transparent',
  'action-subtle-bg-hover': p['n-100'],
  'action-subtle-bg-active': p['n-150'],
  'action-subtle-fg': p['n-700'],

  'action-danger-bg': p['danger-600'],
  'action-danger-bg-hover': p['danger-700'],
  'action-danger-fg': p['n-0'],

  'status-danger-bg': p['danger-50'],
  'status-danger-border': p['danger-200'],
  'status-danger-fg': p['danger-700'],
  'status-warning-bg': p['warning-50'],
  'status-warning-border': p['warning-200'],
  'status-warning-fg': p['warning-700'],
  'status-success-bg': p['success-50'],
  'status-success-border': p['success-200'],
  'status-success-fg': p['success-700'],
  'status-info-bg': p['a-50'],
  'status-info-border': p['a-200'],
  'status-info-fg': p['a-700'],
  'status-neutral-bg': p['n-50'],
  'status-neutral-border': p['n-200'],
  'status-neutral-fg': p['n-700'],

  /* Impact. Same three-level reading as the current app so the ranking is not
     silently redefined, but expressed as a filled dot rather than bars. */
  'impact-high': p['danger-500'],
  'impact-medium': p['warning-500'],
  'impact-low': p['n-400'],
  'impact-track': p['n-200'],

  /* ── the brand mark, and nothing else ─────────────────────────────────────
     Watermelon, off the live landing page. It is a role of its own rather than
     part of the accent because it is NOT an accent: a logo is identity, and it
     is the one colour in this file that means "Melonade" instead of meaning
     "selected", "primary" or "danger". Exactly one element may read it.
     ─────────────────────────────────────────────────────────────────────── */
  'brand-mark': p['brand-500'],

  'focus-ring': p['a-500'],
  'focus-ring-offset': p['n-0'],

  'shadow-color': '28 22 27',
} as const;

export const darkColors: Record<keyof typeof lightColors, string> = {
  /* The inversion survives into dark: the rail is the deepest surface and the
     detail pane is the lightest, so the reading plane is still the brightest
     thing on screen. Chroma matches the light theme step for step. */
  'surface-canvas': p['dark-void'],
  'surface-default': p['dark-raised'],   // the detail pane stays the brightest
  'surface-sunken': p['dark-base'],      // the list column
  'surface-raised': p['dark-overlay'],   // menus float above everything
  'surface-nav': p['dark-sunken'],       // the rail is the deepest chrome
  'surface-hover': p['dark-overlay'],
  'surface-active': p['n-850'],
  'surface-selected': p['a-900'],
  'surface-disabled': p['dark-base'],
  'surface-inverse': p['n-100'],

  'content-primary': p['dark-text-hi'],
  'content-secondary': p['dark-text-mid'],
  'content-muted': p['dark-text-lo'],
  'content-placeholder': p['dark-text-lo'],
  'content-disabled': p['n-600'],
  'content-decorative': p['n-500'],
  'content-inverse': p['n-950'],
  'content-accent': p['a-300'],
  'content-danger': p['danger-200'],
  'content-warning': p['warning-200'],
  'content-success': p['success-200'],

  'border-subtle': p['n-850'],
  'border-default': p['n-800'],
  'border-strong': p['n-700'],
  'border-accent': p['a-500'],
  'border-danger': p['danger-500'],

  /* The accent survives as the primary action, lightened and slightly
     desaturated so it does not glow against a near-black ground. */
  'action-primary-bg': p['a-500'],
  'action-primary-bg-hover': p['a-400'],
  'action-primary-bg-active': p['a-600'],
  'action-primary-fg': p['n-0'],

  'action-secondary-bg': p['dark-overlay'],
  'action-secondary-bg-hover': p['n-850'],
  'action-secondary-bg-active': p['dark-base'],
  'action-secondary-fg': p['dark-text-hi'],
  'action-secondary-border': p['n-800'],

  'action-subtle-bg': 'transparent',
  'action-subtle-bg-hover': p['dark-overlay'],
  'action-subtle-bg-active': p['n-850'],
  'action-subtle-fg': p['dark-text-mid'],

  'action-danger-bg': p['danger-500'],
  'action-danger-bg-hover': p['danger-600'],
  'action-danger-fg': p['n-0'],

  'status-danger-bg': p['danger-900'],
  'status-danger-border': p['danger-800'],
  'status-danger-fg': p['danger-200'],
  'status-warning-bg': p['warning-900'],
  'status-warning-border': p['warning-800'],
  'status-warning-fg': p['warning-200'],
  'status-success-bg': p['success-900'],
  'status-success-border': p['success-800'],
  'status-success-fg': p['success-200'],
  'status-info-bg': p['a-900'],
  'status-info-border': p['a-800'],
  'status-info-fg': p['a-200'],
  'status-neutral-bg': p['dark-overlay'],
  'status-neutral-border': p['n-800'],
  'status-neutral-fg': p['dark-text-mid'],

  'impact-high': p['danger-400'],
  'impact-medium': p['warning-400'],
  'impact-low': p['n-500'],
  'impact-track': p['n-800'],

  /* Lifted to the landing page's own dark-mode watermelon so the mark keeps
     the same presence against a near-black rail. */
  'brand-mark': p['brand-400'],

  'focus-ring': p['a-400'],
  'focus-ring-offset': p['dark-raised'],

  'shadow-color': '0 0 0',
};

/* ── type ────────────────────────────────────────────────────────────────── */

/* Paired on a contrast axis, not on similarity: Instrument Sans is a slightly
   condensed grotesk, Instrument Serif is a high-contrast display serif. Two
   grotesks that are almost the same is the pairing mistake; sans plus serif is
   a decision anyone can see.
   The serif is DISPLAY ONLY. It carries the issue title and the write-up's
   opening, and it never touches a label, button, control, or data cell: a
   display face in UI chrome is the fastest way to make a work tool feel
   costumed. */
export const typography = {
  'font-sans':
    "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'font-serif': "'Instrument Serif', Georgia, 'Times New Roman', serif",
  'font-mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",

  /* Fixed rem scale on an untouched 16px root, ratio ~1.14. Looser than option
     A because this option is trading density for legibility. */
  'text-2xs': '0.6875rem', // 11
  'text-xs': '0.75rem',    // 12
  'text-sm': '0.8125rem',  // 13
  'text-md': '0.875rem',   // 14: THE base size
  'text-lg': '0.9375rem',  // 15
  'text-xl': '1.0625rem',  // 17
  'text-2xl': '1.25rem',   // 20
  'text-3xl': '1.625rem',  // 26: the serif issue title
  'text-4xl': '2rem',      // 32: the serif empty state

  'leading-tight': '1.15',
  'leading-snug': '1.4',
  'leading-normal': '1.5',
  'leading-relaxed': '1.65',

  'weight-regular': '400',
  'weight-medium': '500',
  'weight-semibold': '600',

  /* A condensed grotesk needs less negative tracking than a neutral one, and
     the serif needs none at all at display sizes. */
  'tracking-tight': '-0.006em',
  'tracking-normal': '0',
  'tracking-wide': '0.02em',
  'tracking-serif': '-0.012em',
} as const;

/* ── space ───────────────────────────────────────────────────────────────── */

export const space = {
  'space-0': '0',
  'space-px': '1px',
  'space-1': '0.125rem', // 2
  'space-2': '0.25rem',  // 4
  'space-3': '0.5rem',   // 8
  'space-4': '0.75rem',  // 12
  'space-5': '1rem',     // 16
  'space-6': '1.25rem',  // 20
  'space-7': '1.5rem',   // 24
  'space-8': '2rem',     // 32
  'space-9': '2.5rem',   // 40
  'space-10': '3.5rem',  // 56
  'space-11': '4.5rem',  // 72
} as const;

/* ── shape, depth, motion, layering ──────────────────────────────────────── */

/* Larger radii than option A across the board. This is the cheapest, most
   legible difference between the two options at a glance. */
export const radius = {
  'radius-xs': '4px',
  'radius-sm': '6px',
  'radius-md': '10px',
  'radius-lg': '14px',
  'radius-full': '999px',
} as const;

export const border = {
  'border-width': '1px',
  'border-width-strong': '1px',
} as const;

/* Soft and wide rather than tight and dark. Still only used on things that
   genuinely float: the standing note on the app being replaced is that its
   panel shadow reads as "something thick". */
export const elevation = {
  'shadow-none': 'none',
  'shadow-card': '0 1px 2px -1px rgb(var(--m-shadow-color) / 0.06)',
  'shadow-popover':
    '0 2px 6px -2px rgb(var(--m-shadow-color) / 0.08), 0 14px 34px -14px rgb(var(--m-shadow-color) / 0.20)',
  'shadow-modal':
    '0 4px 10px -4px rgb(var(--m-shadow-color) / 0.10), 0 32px 64px -24px rgb(var(--m-shadow-color) / 0.26)',
} as const;

export const motion = {
  'duration-instant': '100ms',
  'duration-fast': '160ms',
  'duration-normal': '220ms',
  'duration-slow': '320ms',
  /* ease-out quint: a slightly longer tail than option A, which is what makes
     the pane transitions feel unhurried rather than snappy. */
  'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'ease-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const layer = {
  'z-base': '0',
  'z-sticky': '100',
  'z-dropdown': '200',
  'z-overlay': '300',
  'z-modal': '400',
  'z-toast': '500',
  'z-tooltip': '600',
} as const;

/* ── layout constants ────────────────────────────────────────────────────── */

export const layout = {
  /* The rail is icon-only at every width. That is the scaling answer: one more
     agent costs 44px of vertical space and nothing horizontal, ever. */
  'rail-width': '3.5rem',      // 56
  'list-width': '25rem',       // 400
  'list-width-wide': '27.5rem',// 440
  'control-height-sm': '1.75rem',  // 28
  'control-height-md': '2rem',     // 32
  'control-height-lg': '2.25rem',  // 36
  'row-height': '4.25rem',         // 68: a two-line list row
  'header-height': '3.25rem',      // 52
} as const;

export const scales = {
  ...typography,
  ...space,
  ...radius,
  ...border,
  ...elevation,
  ...motion,
  ...layer,
  ...layout,
} as const;

export type ColorRole = keyof typeof lightColors;
export type ScaleToken = keyof typeof scales;

/** `t('surface-default')` -> `var(--m-surface-default)`. */
export const t = (name: ColorRole | ScaleToken) => `var(--m-${name})`;
