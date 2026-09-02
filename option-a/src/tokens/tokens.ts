/* ═══════════════════════════════════════════════════════════════════════════
   OPTION A: "GRAPHITE"

   The semantic token layer. This file is the single source of truth: the CSS
   custom properties in tokens.css are GENERATED from it (tools/gen-css.mjs),
   and the antd theme in src/theme/antd.ts is DERIVED from it. Nothing in the
   app may reference a palette primitive directly.

   Why two layers. `palette` holds primitives with no meaning ("n-600" is a
   value). This file assigns roles ("content.muted" is a decision). Dark mode
   only ever redefines roles; primitives never move. That is the whole reason
   the old app's colour work kept regressing: it had 67 hardcoded literals and
   no role layer, so every theme change was a search-and-replace.

   The identity, in one line: ink is the primary action, colour is rationed to
   one restrained teal, and every rule is a hairline. Monochrome, dense, quiet.
   ═══════════════════════════════════════════════════════════════════════════ */

import { palette as p } from './palette.ts';

/* ── colour roles ────────────────────────────────────────────────────────── */

export const lightColors = {
  /* surfaces, from the back of the page to the front */
  'surface-canvas': p['n-100'],   // the page behind the content card
  'surface-default': p['n-0'],    // cards, table body, the content plane
  'surface-sunken': p['n-50'],    // toolbars, table head, inset strips
  'surface-raised': p['n-0'],     // popovers and menus (lifted by shadow)
  'surface-nav': p['n-50'],       // the left nav: the second neutral layer
  'surface-hover': p['n-100'],
  'surface-active': p['n-150'],
  'surface-selected': p['a-50'],  // the one place the accent tints a surface
  'surface-disabled': p['n-100'],
  'surface-inverse': p['n-900'],

  /* content: text and icons */
  'content-primary': p['n-900'],
  'content-secondary': p['n-700'],
  'content-muted': p['n-600'],      // 5.97:1 on white: a real reading colour
  'content-placeholder': p['n-550'], // 4.85:1: placeholders are text too
  'content-disabled': p['n-400'],
  'content-decorative': p['n-500'],  // icons only, 3.93:1
  'content-inverse': p['n-0'],
  'content-accent': p['a-600'],
  'content-danger': p['danger-600'],
  'content-warning': p['warning-700'],
  'content-success': p['success-600'],

  /* borders. Three weights and no more: "too many lines" is the standing
     complaint about the current app, so a border must earn its step up. */
  'border-subtle': p['n-150'],   // inside a card: row rules, cell divisions
  'border-default': p['n-200'],  // the edge of a card or control
  'border-strong': p['n-300'],   // hover on an interactive edge
  'border-accent': p['a-500'],
  'border-danger': p['danger-500'],

  /* actions. Primary is INK, not the accent: that is the single biggest
     visual departure from OpenReplay's blue-button app. */
  'action-primary-bg': p['n-900'],
  'action-primary-bg-hover': p['n-800'],
  'action-primary-bg-active': p['n-950'],
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

  /* status chips: a tinted fill, a matching hairline, and readable text */
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

  /* impact, carried over from the current app so the reading is unchanged:
     high is red, medium amber, low a plain grey. */
  'impact-high': p['danger-500'],
  'impact-medium': p['warning-500'],
  'impact-low': p['n-400'],
  'impact-track': p['n-200'],

  /* focus. One ring, everywhere, never removed. */
  /* ── the brand mark, and nothing else ─────────────────────────────────────
     Watermelon, off the live landing page. It is a role of its own rather than
     part of the accent because it is NOT an accent: a logo is identity, and it
     is the one colour in this file that means "Melonade" instead of meaning
     "selected", "primary" or "danger". Exactly one element may read it.
     ─────────────────────────────────────────────────────────────────────── */
  'brand-mark': p['brand-500'],

  'focus-ring': p['a-500'],
  'focus-ring-offset': p['n-0'],

  /* the shadow colour, kept as a role so dark mode can drop it entirely */
  'shadow-color': '13 25 28',
} as const;

export const darkColors: Record<keyof typeof lightColors, string> = {
  /* Dark is not inverted light. Two rules the first attempt broke, both caught
     by rendering it and looking:

     1. The surface ladder carries depth here, because a shadow does almost
        nothing on a dark ground. The first ladder stepped 2.5 L points at a
        time and nav, canvas and card collapsed into one flat black plane. The
        steps are now 4-5 points, which is wider than the light theme needs and
        exactly what dark needs.
     2. A status chip cannot reuse the light theme's tint. `danger-50` inverted
        naively lands on `danger-700`, a mid-saturation red that shouts louder
        on black than the row title it is annotating. The dark fills are the new
        `-900` steps: the same hue at low lightness and low chroma.

     Chroma is matched to the light theme throughout, so the theme reads as the
     same product with the lamp off rather than a different palette. */
  'surface-canvas': p['dark-void'],
  'surface-default': p['dark-base'],
  'surface-sunken': p['dark-sunken'],
  'surface-raised': p['dark-raised'],
  'surface-nav': p['dark-sunken'],
  'surface-hover': p['dark-raised'],
  'surface-active': p['dark-overlay'],
  'surface-selected': p['a-900'],
  'surface-disabled': p['dark-sunken'],
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

  /* Borders step UP from the card, and by more than in light: a hairline that
     works on white disappears entirely on near-black. */
  'border-subtle': p['n-850'],
  'border-default': p['n-800'],
  'border-strong': p['n-700'],
  'border-accent': p['a-500'],
  'border-danger': p['danger-500'],

  /* On a dark ground an ink button would vanish, so primary inverts to a light
     surface with dark text: the same "unmissable, uncoloured" idea. */
  'action-primary-bg': p['n-100'],
  'action-primary-bg-hover': p['n-0'],
  'action-primary-bg-active': p['n-200'],
  'action-primary-fg': p['n-950'],

  'action-secondary-bg': p['dark-raised'],
  'action-secondary-bg-hover': p['dark-overlay'],
  'action-secondary-bg-active': p['dark-sunken'],
  'action-secondary-fg': p['dark-text-hi'],
  'action-secondary-border': p['n-800'],

  'action-subtle-bg': 'transparent',
  'action-subtle-bg-hover': p['dark-raised'],
  'action-subtle-bg-active': p['dark-overlay'],
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
  'status-neutral-bg': p['dark-raised'],
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
  'focus-ring-offset': p['dark-base'],

  /* Shadows do not read on a dark ground; the surface ladder does the work. */
  'shadow-color': '0 0 0',
};

/* ── type ────────────────────────────────────────────────────────────────── */

/* One superfamily, two cuts. IBM Plex Sans is humanist and slightly
   engineered, which suits a triage table; IBM Plex Mono is its sibling, so
   numerals and ids sit beside prose without a pairing clash. Deliberately not
   Inter or Figtree: Figtree is the current app's face and the brief is that
   this must not read as the same product. */
export const typography = {
  'font-sans':
    "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /* The display and tag roles default to the sans and are only ever moved by a
     type pairing in the prototype panel. A page that reads its title font from
     a variable nothing sets is a page with no title font. */
  'font-display': "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'font-prose': "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'font-tag': "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /* Figures in the interface - counts, durations, timestamps, ranges. The sans
     by default; a type system that says "the machine's numbers are mono" moves
     this one role and changes the texture of every table. */
  'font-num': "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'display-weight': '600',
  'display-tracking': '-0.011em',
  'display-scale': '1',
  /* The weight a row's own title takes. A serif at 500 has to be synthesised;
     the systems that use one ask for 600 instead. */
  'title-weight': '500',
  /* Tags are sentence case in the shipped design. Every alternative pairing
     sets them as small uppercase labels with air in them, which is what the
     rest of the industry does with metadata - so the treatment is a token
     rather than a rule inside the chip. */
  'tag-case': 'none',
  'tag-tracking': '0em',
  'tag-size': '0.75rem',
  'tag-weight': '400',
  'font-mono': "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",

  /* Fixed rem scale on an untouched 16px root, ratio ~1.09 at the dense end.
     Product UI wants many close steps, not a dramatic ladder. */
  'text-2xs': '0.6875rem', // 11: micro labels, counts
  'text-xs': '0.75rem',    // 12: table meta, captions
  'text-sm': '0.8125rem',  // 13: THE base size. Compact by intent.
  'text-md': '0.875rem',   // 14: controls, emphasis in a row
  'text-lg': '1rem',       // 16: section titles
  'text-xl': '1.125rem',   // 18: page title
  'text-2xl': '1.375rem',  // 22: the only display step

  'leading-tight': '1.2',
  'leading-snug': '1.35',
  'leading-normal': '1.5',
  'leading-relaxed': '1.6',

  /* three weights. A fourth is how a quiet system starts shouting. */
  'weight-regular': '400',
  'weight-medium': '500',
  'weight-semibold': '600',

  'tracking-tight': '-0.011em',
  'tracking-normal': '0',
  'tracking-wide': '0.01em',
} as const;

/* ── space, on a 4pt base ────────────────────────────────────────────────── */

export const space = {
  'space-0': '0',
  'space-px': '1px',
  'space-1': '0.125rem', // 2
  'space-2': '0.25rem',  // 4
  'space-3': '0.375rem', // 6
  'space-4': '0.5rem',   // 8
  'space-5': '0.75rem',  // 12
  'space-6': '1rem',     // 16
  'space-7': '1.25rem',  // 20
  'space-8': '1.5rem',   // 24
  'space-9': '2rem',     // 32
  'space-10': '2.5rem',  // 40
  'space-11': '3rem',    // 48
} as const;

/* ── shape, depth, motion, layering ──────────────────────────────────────── */

/* ── corner radius, BY ROLE ──────────────────────────────────────────────────
   Four values, and the name says what kind of object gets it rather than how
   big the value is. That is the whole fix: the old scale was xs/sm/md/lg, so
   picking one meant guessing a size, and antd made it worse by handing small
   controls a smaller radius than big ones. A 26px button and a 36px button are
   both BUTTONS - the shape of a corner is a property of what the thing is, not
   of how tall it happens to be. Mehdi found the seam from across a screen
   share: "the corners here are rounded, but if you look at the search bar the
   corners are not rounded. Is that done on purpose?" It was not.

     chip      small labelled marks INSIDE a row - chips, tags, counts, badges,
               the checkbox's box - and controls nested inside another control,
               where the inner corner has to be tighter than the outer one or
               the two read as misaligned
     control   anything you click or type in, at any size: buttons, inputs,
               selects, nav rows, toggle tracks, the focus ring
     surface   anything that contains or floats: the plane, cards, popovers,
               drawers, dialogs, inset boxes, the replay frame
     full      circles and pills: avatars, dots, progress bars

   All four move together in the prototype panel's Corners control; see
   tools/gen-proto-themes.mjs. */
export const radius = {
  'radius-chip': '2px',
  'radius-control': '4px',
  'radius-surface': '8px',
  /* A TRACK THAT WRAPS CONTROLS, and the only radius in the system that is
     arithmetic rather than a choice. Two concentric rounded rectangles look
     nested when the outer radius is the inner one PLUS the gap between them,
     and wrong at every other value - the corners either pinch or bulge. Both
     tracks in the app (the filter strip, the replay's speed picker) pad their
     items by 2px, so this is control + 2 and it follows the control wherever it
     goes. Caught by eye at the Round shape, where a fully round item inside a
     10px track read as a pill dropped into the wrong hole. */
  'radius-track': 'calc(var(--m-radius-control) + 2px)',
  /* THE ONE CAPPED VALUE. A checkbox is square, and CSS clamps a radius to half
     the box, so a "round" shape turns a 14px box into a circle - and a circle
     means "one of these", not "any of these". It stays a rounded square at
     every shape. */
  'radius-check': '2px',
  'radius-full': '999px',
} as const;

export const border = {
  'border-width': '1px',
  'border-width-strong': '1px', // there is no 2px rule in this system
} as const;

/* Two elevations. Cards get a border, never a shadow: the standing note on
   the current app is that its panel shadow reads as "something thick". */
export const elevation = {
  'shadow-none': 'none',
  'shadow-popover':
    '0 1px 2px -1px rgb(var(--m-shadow-color) / 0.10), 0 8px 24px -10px rgb(var(--m-shadow-color) / 0.18)',
  'shadow-modal':
    '0 2px 4px -2px rgb(var(--m-shadow-color) / 0.12), 0 24px 48px -20px rgb(var(--m-shadow-color) / 0.24)',
} as const;

export const motion = {
  'duration-instant': '80ms',
  'duration-fast': '130ms',
  'duration-normal': '180ms',
  'duration-slow': '260ms',
  /* ease-out quart. No bounce, no elastic: this is a work tool. */
  'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
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
  /* TWO nav widths, 2026-08-31, and the second one is ARITHMETIC rather than a
     number: ONE 28px glyph with the same gutter either side, so the glyphs land
     on the rail's own centre line. Nothing shares the row with them - the
     counts are dots on the glyphs and their figures are in the tooltip - which
     is what lets the rail be this narrow and still be read.

     ⚠ Written as a calc and not as 3.25rem, because the gutter is a SPACE TOKEN
     and the prototype's density control moves it. Frozen as a number, Spaced
     silently clipped the row. */
  'nav-width': '16rem',        // 256: the project name is a domain, and a
                               // truncated project name reads as a bug
  'nav-width-collapsed': 'calc(var(--m-space-5) * 2 + 1.75rem)', // 52 at compact
  'content-max': '85rem',        // 1360: matches the current app's measure
  'control-height-sm': '1.625rem', // 26
  'control-height-md': '1.875rem', // 30
  'control-height-lg': '2.25rem',  // 36
  'row-height': '2.375rem',        // 38: the compact table row
  /* THE MENU'S OWN ROW, 2026-09-02, and it is a token rather than a number in
     side-nav.css for the reason the density note gives: "a row that keeps its
     height while the gaps around it grow reads as a spacing bug rather than as
     a roomier product". It is not `control-height-md` because a nav row is not
     a control - it went to 32 at compact for the air Mehdi asked for, where
     every input and button stayed at 30. A section row is this minus 2. */
  'nav-row-height': '2rem',        // 32
  'header-height': '2.75rem',      // 44
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

/** `t('surface-default')` -> `var(--m-surface-default)`. The only sanctioned
 *  way for a component to reach a token, so a typo is a type error. */
export const t = (name: ColorRole | ScaleToken) => `var(--m-${name})`;
