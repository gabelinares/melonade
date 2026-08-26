/* Interaction screenshots: the states a static shot cannot reach. Each step is
 * a click/selector pair so a failure names which control was missing rather
 * than silently producing an identical-looking image. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const url = arg('url'), out = arg('out'), tag = arg('tag'), steps = arg('steps').split(',');

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];

for (const step of steps) {
  const [name, w, h, theme] = step.split(':');
  const ctx = await browser.newContext({
    viewport: { width: Number(w), height: Number(h) },
    deviceScaleFactor: 2,
    colorScheme: theme || 'light',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  try {
    /* the prototype panel is collapsed by default, so any step that drives one
       of its controls has to open it first */
    if (['rail', 'agents-max', 'agents-mid', 'loading', 'empty'].includes(name)) {
      await page.getByRole('button', { name: /Prototype controls/ }).click();
      await page.waitForTimeout(250);
    }
    if (name === 'expanded') {
      await page.locator('.m-issues__caret').first().click();
      await page.waitForTimeout(500);
    }
    if (name === 'rail') {
      await page.locator('#proto-rail').click();
      await page.waitForTimeout(500);
    }
    if (name === 'agents-max' || name === 'agents-mid') {
      // library-agnostic: antd and Mantine name their slider thumb differently,
      // and a selector that only matches one silently skips the step
      await page
        .locator('.ant-slider-handle, .mantine-Slider-thumb, [role="slider"]')
        .first()
        .focus();
      const presses = name === 'agents-max' ? 14 : 3;
      for (let i = 0; i < presses; i++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(400);
    }
    if (name === 'loading') {
      await page.getByText('Loading', { exact: true }).click();
      await page.waitForTimeout(400);
    }
    if (name === 'empty') {
      await page.getByText('Empty', { exact: true }).click();
      await page.waitForTimeout(400);
    }
    if (name === 'critical') {
      await page.locator('.m-crit').first().click();
      await page.waitForTimeout(500);
    }
    if (name === 'palette') {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(600);
    }
    if (name === 'walk') {
      // J three times: the keyboard triage claim, checked rather than asserted
      await page.keyboard.press('j');
      await page.keyboard.press('j');
      await page.keyboard.press('j');
      await page.waitForTimeout(400);
    }
    if (name === 'critical-b') {
      await page.locator('.b-crit').first().click();
      await page.waitForTimeout(500);
    }
    if (name === 'filter-root') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(450);
    }
    if (name === 'filter-dim') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: 'Tags' }).last().click();
      await page.waitForTimeout(400);
      await page.mouse.move(400, 300);
      await page.waitForTimeout(200);
    }
    if (name === 'filter-hover') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: 'Tags' }).last().click();
      await page.waitForTimeout(350);
      // hover the third option: the checkbox must appear on THAT row only
      await page.getByRole('menuitemcheckbox', { name: /Drop off/ }).hover();
      await page.waitForTimeout(350);
    }
    if (name === 'filter-mixed') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: 'Tags' }).last().click();
      await page.waitForTimeout(300);
      await page.getByRole('menuitemcheckbox', { name: /Checkout/ }).click();
      await page.waitForTimeout(250);
      await page.getByRole('menuitemcheckbox', { name: /Payment/ }).click();
      await page.waitForTimeout(250);
      // hover a THIRD, unselected row so selected and hovered are both visible
      await page.getByRole('menuitemcheckbox', { name: /Frustration/ }).hover();
      await page.waitForTimeout(350);
    }
    if (name === 'filter-mixed') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: 'Tags' }).last().click();
      await page.waitForTimeout(300);
      await page.getByRole('menuitemcheckbox', { name: /Checkout/ }).click();
      await page.waitForTimeout(250);
      await page.getByRole('menuitemcheckbox', { name: /Payment/ }).click();
      await page.waitForTimeout(250);
      // hover a THIRD, unselected row so selected and hovered are both visible
      await page.getByRole('menuitemcheckbox', { name: /Frustration/ }).hover();
      await page.waitForTimeout(400);
    }
    if (name === 'filter-search') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByLabel('Search filters').fill('checkout');
      await page.waitForTimeout(450);
    }
    if (name === 'filter-applied') {
      await page.getByRole('button', { name: /^Filters/ }).click();
      await page.waitForTimeout(350);
      await page.getByRole('button', { name: 'Impact' }).last().click();
      await page.waitForTimeout(300);
      await page.getByRole('menuitemcheckbox', { name: /High/ }).click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    if (name === 'display') {
      await page.getByRole('button', { name: /^Display/ }).click();
      await page.waitForTimeout(450);
    }
    if (name === 'grouped') {
      await page.getByRole('button', { name: /^Display/ }).click();
      await page.waitForTimeout(350);
      await page.locator('#dm-group').click();
      await page.waitForTimeout(300);
      await page.getByTitle('Impact', { exact: true }).click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    if (name === 'filters') {
      await page.getByRole('button', { name: /^Display/ }).click();
      await page.waitForTimeout(400);
    }
  } catch (e) {
    errors.push(`[${name}] STEP FAILED: ${e.message}`);
  }

  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${tag}-${name}.png` });
  console.log(`shot ${tag}-${name}.png (${w}x${h} ${theme || 'light'})`);
  await ctx.close();
}
await browser.close();
if (errors.length) { console.log('\nERRORS:'); for (const e of [...new Set(errors)]) console.log('  ' + e); }
else console.log('\nNo errors.');
