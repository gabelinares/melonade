/* Product Analytics click-through check (2026-09-14): a Dashboards row opens
   the dashboard view, a Cards row the builder, an Alerts row the form. Run
   with the dev server on 4310. */
import { chromium } from 'playwright';
const SHOT = '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
const out = {};
process.on('uncaughtException', (e) => { out.FAILED = String(e).split('\n')[0]; out.errors = errs.slice(0, 6); console.log(JSON.stringify(out, null, 1)); process.exit(1); });
const nav = async (label) => { await p.locator('.m-nav').getByText(label, { exact: true }).first().click(); await p.waitForTimeout(350); };
const count = (sel) => p.locator(sel).count();
// Dashboards → dashboard view
await nav('Product Analytics');
out.dashRows = await count('.m-pa__row');
await p.locator('.m-pa__row td').first().click(); await p.waitForTimeout(500);
out.dashboard = { title: await p.locator('.m-page__title').textContent(), widgets: await count('.m-dash__widget'), charts: await count('.m-chart'), back: await p.locator('.m-page__back').textContent() };
await p.screenshot({ path: SHOT + 'pa-dashboard.png' });
// add a card
await p.getByRole('button', { name: 'Add card' }).click(); await p.waitForTimeout(300);
out.picker = await count('.m-dash__picker-row');
await p.locator('.m-dash__picker-row').first().click(); await p.waitForTimeout(300);
out.widgetsAfterAdd = await count('.m-dash__widget');
// hover a line chart for the tooltip
const line = p.locator('.m-chart--line svg').first();
if (await line.count()) { const bb = await line.boundingBox(); await p.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height / 2); await p.waitForTimeout(150); out.tooltip = await p.locator('.m-chart__tip').textContent().catch(() => null); }
// remove a widget via menu
await p.locator('.m-dash__widget-head [aria-label^="Actions for"]').first().click(); await p.waitForTimeout(200);
await p.getByText('Remove from dashboard').click(); await p.waitForTimeout(300);
out.widgetsAfterRemove = await count('.m-dash__widget');
// drill into a card via widget body
await p.locator('.m-dash__widget-body').first().click(); await p.waitForTimeout(600);
out.cardFromDashboard = { title: await p.locator('.m-page__title').textContent(), series: await count('.m-cardp__series'), sessions: await count('.m-cardp__sessions .m-psess__row'), updateDisabled: await p.getByRole('button', { name: 'Update' }).isDisabled() };
await p.screenshot({ path: SHOT + 'pa-card.png' });
// edit: add a step → dirty; switch layout
await p.getByRole('button', { name: 'Add step' }).first().click(); await p.waitForTimeout(200);
out.updateEnabledAfterEdit = !(await p.getByRole('button', { name: 'Update' }).isDisabled());
await p.locator('.m-page__actions .ant-segmented-item').nth(1).click(); await p.waitForTimeout(200);
out.layoutTop = await count('.m-cardp--top');
await p.getByRole('button', { name: 'Update' }).click(); await p.waitForTimeout(300);
out.updateDisabledAfterSave = await p.getByRole('button', { name: 'Update' }).isDisabled();
// menu: Set alerts (only if timeseries) else Add to dashboard
await p.locator('.m-page__actions [aria-label="More"]').click(); await p.waitForTimeout(200);
const setAlerts = p.locator('.ant-dropdown-menu-item').filter({ hasText: 'Set alerts' });
out.setAlertsDisabled = (await setAlerts.getAttribute('aria-disabled')) === 'true';
if (!out.setAlertsDisabled) { await setAlerts.click(); await p.waitForTimeout(400); out.alertDrawer = { open: await count('.m-alertf__drawer'), steps: await count('.m-alertf__step') }; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
else { await p.keyboard.press('Escape'); }
// go to Cards list via back, then open a timeseries card and set an alert
await p.locator('.m-page__back').click(); await p.waitForTimeout(400);
out.backFromCardLandsOn = await p.locator('.m-page__title').textContent();
await nav('Cards');
if (await count('.m-page__back')) { await p.locator('.m-page__back').click(); await p.waitForTimeout(300); }
await p.locator('.m-pa__row').filter({ hasText: 'Sign-ups over time' }).locator('td').first().click(); await p.waitForTimeout(500);
await p.locator('.m-page__actions [aria-label="More"]').click(); await p.waitForTimeout(200);
await p.locator('.ant-dropdown-menu-item').filter({ hasText: 'Set alerts' }).click(); await p.waitForTimeout(400);
out.alertDrawerFromTimeseries = { open: await count('.m-alertf__drawer'), createDisabled: await p.getByRole('button', { name: 'Create' }).isDisabled() };
await p.locator('.m-alertf__value input, input.m-alertf__value').fill('5'); await p.waitForTimeout(150);
out.createEnabledAfterValue = !(await p.getByRole('button', { name: 'Create' }).isDisabled());
await p.getByRole('button', { name: 'Create' }).click(); await p.waitForTimeout(400);
// Add to dashboard
await p.locator('.m-page__actions [aria-label="More"]').click(); await p.waitForTimeout(200);
await p.locator('.ant-dropdown-menu-item').filter({ hasText: 'Add to dashboard' }).click(); await p.waitForTimeout(300);
out.addToDashboardRows = await count('.m-cardp__dash-list .m-checkrow');
await p.locator('.m-cardp__dash-list .m-checkrow').nth(1).click(); await p.locator('.ant-modal .ant-btn-primary').click(); await p.waitForTimeout(300);
// a session row → replay → back
await p.locator('.m-cardp__sessions .m-psess__row').first().click(); await p.waitForTimeout(500);
out.replayFromCard = await count('.m-sreplay');
await p.locator('.m-sreplay__back').click(); await p.waitForTimeout(400);
out.backToCard = await count('.m-cardp');
// Alerts → alert page: the created one is first
await nav('Alerts');
out.alertRows = await count('.m-pa__row');
out.firstAlertName = await p.locator('.m-pa__row .m-pa__name-cell > span').first().textContent();
await p.locator('.m-pa__row td').nth(4).click(); await p.waitForTimeout(500);
out.alertPage = { title: await p.locator('.m-page__title').textContent(), steps: await count('.m-alertf__step'), updateDisabled: await p.getByRole('button', { name: 'Update' }).first().isDisabled(), preview: await p.locator('.m-alertf__preview .m-pa__rule').textContent() };
await p.screenshot({ path: SHOT + 'pa-alert.png' });
await p.locator('.m-alertf__value input, input.m-alertf__value').fill('42'); await p.waitForTimeout(150);
out.alertUpdateEnabled = !(await p.getByRole('button', { name: 'Update' }).first().isDisabled());
await p.getByRole('button', { name: 'Update' }).first().click(); await p.waitForTimeout(300);
out.alertPreviewAfter = await p.locator('.m-alertf__preview .m-pa__rule').textContent();
await p.locator('.m-page__back').click(); await p.waitForTimeout(300);
out.alertRuleInList = await p.locator('.m-pa__row .m-pa__rule').nth(1).textContent();
out.errors = errs.slice(0, 6);
console.log(JSON.stringify(out, null, 1));
await b.close();
