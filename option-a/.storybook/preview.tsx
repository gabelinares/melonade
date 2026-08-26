/* ══════════════════════════════════════════════════════════════════════════
   Every story renders inside the app's real ThemeProvider.

   That is not convenience, it is the point of the whole exercise. A component
   here reads its colour, type and spacing from `--m-*` custom properties and
   its control metrics from antd's ConfigProvider. Rendered outside the provider
   it still renders, silently, with none of them: black text, antd's own grey
   ramp, 32px controls. So the decorator uses the SAME provider main.tsx mounts
   rather than a Storybook-only copy, because a copy is a second source of
   truth and it would drift.

   The toolbar drives that provider through its own `setPref`, so switching
   theme in Storybook exercises the real mechanism (the data-theme attribute on
   the root, plus a fresh antd ThemeConfig) instead of a parallel one that could
   pass while the app's own toggle is broken.

   There is deliberately no backgrounds panel. The provider paints the canvas
   from `--m-surface-canvas`; a second background control would sit on top of it
   and let a story pass on a colour the app can never produce.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, type ReactNode } from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { ProtoTokensProvider } from '../src/theme/ProtoTokens.tsx';
import { ThemeProvider, useTheme, type ThemePref } from '../src/theme/ThemeProvider.tsx';

/** Globals are untyped by design, so narrow rather than cast. */
const asPref = (value: unknown): ThemePref =>
  value === 'dark' || value === 'system' ? value : 'light';

function ThemeSync({ pref, children }: { pref: ThemePref; children: ReactNode }) {
  const { setPref } = useTheme();
  useEffect(() => {
    setPref(pref);
  }, [pref, setPref]);
  return <>{children}</>;
}

/* ProtoTokensProvider sits outside, exactly as it does in main.tsx: the theme
   provider reads the palette switches out of it to build antd's config, so a
   story rendered without it throws rather than falling back. Storybook has no
   panel to drive it, and `frozen` is what makes that mean the SHIPPED tokens
   rather than whatever was last picked in the app: the two share an origin, so
   without it they would share the stored choice. A story is a reference, not a
   preview of somebody's palette. */
const withTheme: Decorator = (Story, context) => (
  <ProtoTokensProvider frozen>
    <ThemeProvider>
      <ThemeSync pref={asPref(context.globals['theme'])}>
        <Story />
      </ThemeSync>
    </ThemeProvider>
  </ProtoTokensProvider>
);

const preview: Preview = {
  decorators: [withTheme],

  globalTypes: {
    theme: {
      description: 'Theme preference, passed straight to the provider',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          /* "system" is a real state and the app's default, so it is on the
             toolbar too: a two-way switch would hide the state most users are
             actually in. */
          { value: 'system', title: 'System', icon: 'browser' },
        ],
      },
    },
  },

  initialGlobals: { theme: 'light' },

  /* Autodocs, because the reasoning attached to each story is the deliverable
     here as much as the render is, and a story description only surfaces on a
     docs page. It is also what the `toc` below has to sit on. A file that would
     read badly with every story stacked on one page opts out with
     `tags: ['!autodocs']`. */
  tags: ['autodocs'],

  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'todo' },
    docs: { toc: true },
  },
};

export default preview;
