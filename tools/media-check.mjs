/* Spot + CoBrowse click-through check (2026-09-14): a card opens the spot
   player, a live row opens the assist view, a recording opens in a new tab.
   Run with the dev server on 4310. */
import { chromium } from 'playwright';
const SHOTS = '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
await p.addInitScript(() => { window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; }; });
await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
const out = {};
const nav = async (label) => { await p.locator('.m-nav').getByText(label, { exact: true }).first().click(); await p.waitForTimeout(350); };
const count = (sel) => p.locator(sel).count();
const hb = (text) => p.locator('.m-live__head button, .m-live__chat button', { hasText: new RegExp(`^\\s*${text}\\s*$`) });

// ── Spot
await nav('Spot');
out.spotCards = await count('.m-spot-card');
await p.locator('.m-spot-card__thumb').first().click(); await p.waitForTimeout(500);
out.spotPlayer = { open: await count('.m-spotp'), title: await p.locator('.m-spotp__title').textContent(), frame: await count('.m-spotp .m-frame'), timeline: await count('.m-spotp .m-tl') };
await p.getByRole('button', { name: /^Play/ }).first().click(); await p.waitForTimeout(700);
out.playing = await p.evaluate(() => document.querySelector('.m-tl__clock')?.textContent);
await p.locator('.m-spotp__tab', { hasText: 'Comments' }).click(); await p.waitForTimeout(300);
out.comments = { panel: await count('.m-spotp__panel'), rows: await count('.m-spotp__comment') };
await p.locator('.m-spotp__composer input').fill('Looks reproducible on staging too.');
await p.locator('.m-spotp__send').click(); await p.waitForTimeout(200);
out.commentsAfterPost = await count('.m-spotp__comment');
out.badge = await p.locator('.m-spotp__badge').textContent();
await p.screenshot({ path: `${SHOTS}/spot-player.png` });
await p.locator('.m-spotp__tab', { hasText: 'Comments' }).click(); await p.waitForTimeout(200);
out.panelClosedByActiveTab = (await count('.m-spotp__panel')) === 0;
await p.locator('.m-spotp__tab', { hasText: 'Activity' }).click(); await p.waitForTimeout(300);
out.activity = await count('.m-spotp__act');
await p.locator('.m-spotp__act').last().click(); await p.waitForTimeout(200);
out.seekedTo = await p.evaluate(() => document.querySelector('.m-tl__clock')?.textContent);
await p.locator('.m-spotp__toolbtn', { hasText: 'Console' }).click(); await p.waitForTimeout(300);
out.console = { open: await count('.m-spotp__tool'), rows: await count('.m-spotp__tool .m-dt__row, .m-spotp__tool [class*="row"]') };
await p.getByRole('button', { name: 'Manage access' }).click(); await p.waitForTimeout(300);
out.access = await count('.m-spotp__access');
await p.keyboard.press('Escape'); await p.waitForTimeout(150);
await p.locator('.m-spotp__back').click(); await p.waitForTimeout(400);
out.backToSpots = await count('.m-spot-card');
// rename via the card menu
await p.locator('.m-spot-card').first().getByRole('button', { name: /Actions for/ }).click(); await p.waitForTimeout(200);
await p.locator('.ant-dropdown-menu-item', { hasText: 'Rename' }).click(); await p.waitForTimeout(300);
await p.locator('.ant-modal input').fill('Renamed clip'); await p.locator('.ant-modal .ant-btn-primary').click(); await p.waitForTimeout(300);
out.spotRenamed = await p.locator('.m-spot-card__title', { hasText: 'Renamed clip' }).count();

// ── CoBrowse live
await nav('CoBrowse');
out.liveRows = await count('.m-cb__row');
await p.locator('.m-cb__row td').first().click(); await p.waitForTimeout(500);
out.live = { open: await count('.m-live'), name: await p.locator('.m-live__name').textContent(), liveTag: await p.locator('.m-live__foot').getByText('LIVE').count(), remoteDisabled: await hb('Remote control').isDisabled(), annotateHidden: (await hb('Annotate').count()) === 0 };
await hb('Call').click(); await p.waitForTimeout(300);
out.callConfirm = await p.locator('.ant-modal-title').textContent();
await p.locator('.ant-modal .ant-btn-primary').click(); await p.waitForTimeout(400);
out.onCall = { chat: await count('.m-live__chat'), endBtn: await hb('End').count(), annotate: await hb('Annotate').count(), remoteEnabled: !(await hb('Remote control').isDisabled()) };
await hb('Remote control').click(); await p.waitForTimeout(200);
out.remoteOn = await hb('Stop control').count();
await hb('Annotate').click(); await p.waitForTimeout(200);
out.annotating = await count('.m-live__ink');
await p.locator('.m-live__toolbtn', { hasText: 'Console' }).click(); await p.waitForTimeout(300);
out.liveConsole = await count('.m-live__tool');
await p.screenshot({ path: `${SHOTS}/live-page.png` });
const before = await p.locator('.m-live__elapsed').textContent(); await p.waitForTimeout(1200);
out.elapsedTicks = before !== (await p.locator('.m-live__elapsed').textContent());
await hb('End').first().click(); await p.waitForTimeout(300);
out.afterEnd = { chat: await count('.m-live__chat'), callBtn: await hb('Call').count(), remoteDisabled: await hb('Remote control').isDisabled() };
await p.locator('.m-live__back').click(); await p.waitForTimeout(400);
out.backToCobrowse = await count('.m-cb__row');

// ── CoBrowse recordings
await p.locator('.m-page__tabs').getByText('Recordings', { exact: true }).click(); await p.waitForTimeout(300);
out.recRows = await count('.m-cb__row');
await p.locator('.m-cb__play').first().click(); await p.waitForTimeout(200);
await p.locator('.m-cb__row td').first().click(); await p.waitForTimeout(200);
out.openedUrls = await p.evaluate(() => window.__opened);
out.noDrawer = (await count('.ant-drawer')) === 0;
await p.locator('.m-cb__row').first().getByRole('button', { name: /Actions for/ }).click(); await p.waitForTimeout(200);
await p.locator('.ant-dropdown-menu-item', { hasText: 'Rename' }).click(); await p.waitForTimeout(300);
await p.locator('.ant-modal input').fill('Renamed recording'); await p.locator('.ant-modal .ant-btn-primary').click(); await p.waitForTimeout(300);
out.recRenamed = await p.locator('.m-cb__row', { hasText: 'Renamed recording' }).count();
out.errors = errs.slice(0, 6);
console.log(JSON.stringify(out, null, 1));
await b.close();
