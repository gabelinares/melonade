/* ══════════════════════════════════════════════════════════════════════════
   Storybook, Option A.

   The one thing this file has to get right: `@shared`. The mock dataset lives
   OUTSIDE this app (../shared) because both design options read the same data,
   so Storybook's Vite pass needs the same alias vite.config.ts declares. Without
   it every story that imports an issue, a segment or a tag fails to resolve and
   the whole build dies on the first component.

   The alias is derived from `configDir` rather than from `import.meta.url`, so
   it is correct whether Storybook loads this file as ESM or transpiles it, and
   it needs no @types/node (this project deliberately has none: tsconfig's
   `types` is ["vite/client"]).
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
