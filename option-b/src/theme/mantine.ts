/* ═══════════════════════════════════════════════════════════════════════════
   OPTION B: the Mantine bridge.

   Mantine is the component base, and the reason it is here rather than antd is
   coverage: this option needs a command palette, a drawer, a scroll area with
   sticky group headers, a segmented control, a combobox and a kbd, and Mantine
   ships all of them. Building those on top of a smaller kit is where the
   "cheap option" argument stops being true.

   Mantine already themes through CSS variables, so the bridge is genuinely a
   MAPPING rather than a fight: our token layer feeds createTheme, Mantine emits
   its own --mantine-* variables from it, and our components keep reading --m-*.
   One palette, two variable namespaces, no literals in either.

   Mantine wants 10-step arrays ordered lightest to darkest, and it derives
   hover / border / light-variant colours from them, so the arrays have to be
   real ramps rather than ten copies of one value.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createTheme, type MantineColorsTuple } from '@mantine/core';
import { palette as p } from '../tokens/palette.ts';
import { scales } from '../tokens/tokens.ts';

const brand: MantineColorsTuple = [
  p['a-50'], p['a-100'], p['a-200'], p['a-300'], p['a-400'],
  p['a-500'], p['a-600'], p['a-700'], p['a-800'], p['a-900'],
];

const gray: MantineColorsTuple = [
  p['n-50'], p['n-100'], p['n-150'], p['n-200'], p['n-300'],
  p['n-400'], p['n-500'], p['n-600'], p['n-700'], p['n-800'],
];

/* Mantine's `dark` tuple is positional and not a plain ramp: 0-4 are text
   weights, 5 is the default border, 6 is a hover surface, 7 is the paper
   background, and 8-9 are deeper grounds. Filling it as a naive ramp is the
   usual mistake and produces borders that read as text. */
const dark: MantineColorsTuple = [
  p['dark-text-hi'],   // 0  brightest text
  p['dark-text-mid'],  // 1  body text
  p['n-400'],          // 2
  p['n-500'],          // 3  placeholder
  p['n-600'],          // 4  dimmed
  p['n-800'],          // 5  default border
  p['dark-overlay'],   // 6  hover surface
  p['dark-raised'],    // 7  paper: our detail pane, the brightest plane
  p['dark-base'],      // 8  the list column
  p['dark-void'],      // 9  the gap between panes
];

const danger: MantineColorsTuple = [
  p['danger-50'], p['danger-100'], p['danger-200'], p['danger-200'], p['danger-400'],
  p['danger-500'], p['danger-600'], p['danger-700'], p['danger-800'], p['danger-900'],
];

const warning: MantineColorsTuple = [
  p['warning-50'], p['warning-100'], p['warning-200'], p['warning-200'], p['warning-400'],
  p['warning-500'], p['warning-600'], p['warning-700'], p['warning-800'], p['warning-900'],
];

const success: MantineColorsTuple = [
  p['success-50'], p['success-100'], p['success-200'], p['success-200'], p['success-400'],
  p['success-500'], p['success-600'], p['success-700'], p['success-800'], p['success-900'],
];

export const mantineTheme = createTheme({
  colors: { brand, gray, dark, danger, warning, success },
  primaryColor: 'brand',
  /* 6 in light, 5 in dark: a mid-plum glows against near-black, so the dark
     theme steps one lighter and slightly less saturated. Same decision the
     token layer records for action-primary-bg. */
  primaryShade: { light: 6, dark: 5 },

  white: p['n-0'],
  black: p['n-900'],

  fontFamily: scales['font-sans'],
  fontFamilyMonospace: scales['font-mono'],
  /* Headings stay on the SANS. The serif is display-only and is applied by an
     explicit class on the two places it belongs, never by a global heading
     rule: a serif on a section label is how a work tool starts looking
     costumed. */
  headings: {
    fontFamily: scales['font-sans'],
    fontWeight: '600',
    sizes: {
      h1: { fontSize: scales['text-2xl'], lineHeight: '1.2' },
      h2: { fontSize: scales['text-xl'], lineHeight: '1.25' },
      h3: { fontSize: scales['text-lg'], lineHeight: '1.3' },
      h4: { fontSize: scales['text-md'], lineHeight: '1.4' },
      h5: { fontSize: scales['text-sm'], lineHeight: '1.4' },
      h6: { fontSize: scales['text-xs'], lineHeight: '1.4' },
    },
  },

  fontSizes: {
    xs: scales['text-2xs'],
    sm: scales['text-xs'],
    md: scales['text-md'],
    lg: scales['text-lg'],
    xl: scales['text-xl'],
  },

  lineHeights: {
    xs: scales['leading-tight'],
    sm: scales['leading-snug'],
    md: scales['leading-normal'],
    lg: scales['leading-normal'],
    xl: scales['leading-relaxed'],
  },

  spacing: {
    xs: scales['space-3'],
    sm: scales['space-4'],
    md: scales['space-5'],
    lg: scales['space-6'],
    xl: scales['space-8'],
  },

  radius: {
    xs: scales['radius-xs'],
    sm: scales['radius-sm'],
    md: scales['radius-md'],
    lg: scales['radius-lg'],
    xl: scales['radius-lg'],
  },
  defaultRadius: 'sm',

  shadows: {
    xs: scales['shadow-card'],
    sm: scales['shadow-card'],
    md: scales['shadow-popover'],
    lg: scales['shadow-popover'],
    xl: scales['shadow-modal'],
  },

  /* A checkbox that does not show a pointer reads as disabled. Mantine's
     default is the native cursor, so this is opt-in. */
  cursorType: 'pointer',
  focusRing: 'auto',
  defaultGradient: { from: 'brand.5', to: 'brand.7', deg: 90 },

  components: {
    Button: {
      defaultProps: { size: 'sm', radius: 'sm' },
      styles: { root: { fontWeight: 500 } },
    },
    ActionIcon: { defaultProps: { variant: 'subtle', color: 'gray', size: 'md' } },
    TextInput: { defaultProps: { size: 'sm', radius: 'sm' } },
    Textarea: { defaultProps: { size: 'sm', radius: 'sm' } },
    Badge: { defaultProps: { radius: 'xs', variant: 'light' } },
    Tooltip: {
      defaultProps: { withArrow: false, openDelay: 250, radius: 'xs', fz: 'sm' },
    },
    Modal: {
      defaultProps: { radius: 'md', centered: true, overlayProps: { blur: 2 } },
    },
    Drawer: { defaultProps: { radius: 0 } },
    Menu: { defaultProps: { radius: 'sm', shadow: 'md' } },
    Popover: { defaultProps: { radius: 'sm', shadow: 'md', withArrow: false } },
    SegmentedControl: { defaultProps: { radius: 'xs', size: 'xs' } },
    ScrollArea: { defaultProps: { scrollbarSize: 8, type: 'hover' } },
    Skeleton: { defaultProps: { radius: 'xs' } },
  },
});
