/* ══════════════════════════════════════════════════════════════════════════
   Storybook, Option B.

   The one thing this file has to get right: `@shared`. The mock dataset lives
   OUTSIDE this app (../shared) because both design options read the same data,
   so Storybook's Vite pass needs the same alias vite.config.ts declares. Without
   it every story that imports an issue, a segment or a tag fails to resolve and
   the whole build dies on the first component.

   The alias is derived from `configDir` rather than from `import.meta.url`, so
   it is correct whether Storybook loads this file as ESM or transpiles it, and
   it needs no @types/node (this project deliberately has none: tsconfig's
   `types` is ["vite/client"], so a `node:path` import would fail the typecheck
   that gates every build here).

   POSTCSS. Mantine expects postcss-preset-mantine plus postcss-simple-vars, and
   both are configured once in postcss.config.cjs at the project root. Vite
   discovers that file from its root, and Storybook's Vite pass runs with the
   same root, so it is picked up without being named here. It is deliberately
   NOT re-declared in viteFinal: a second copy of that config is a second source
   of truth, and the failure mode when they drift (our Mantine postcss syntax
   silently shipping as invalid CSS) is invisible in a passing build.
   ══════════════════════════════════════════════════════════════════════════ */

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

/** `<app>/.storybook` -> `<workspace>/shared`, the same target vite.config.ts
 *  resolves as `../shared` from the app root. */
const sharedDir = (configDir: string): string =>
  decodeURIComponent(new URL('../../shared', `file://${configDir}/`).pathname);

const config: StorybookConfig = {
  framework: '@storybook/react-vite',

  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],

  /* docs renders the foundations MDX; a11y runs axe over every story, which is
     the only automated check a token system can have on contrast. */
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],

  viteFinal: (viteConfig, { configDir }) =>
    mergeConfig(viteConfig, {
      resolve: { alias: { '@shared': sharedDir(configDir) } },
    }),
};

export default config;
