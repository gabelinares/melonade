/* Data Management click-through check (2026-09-14): every row on the five
   pages opens what production opens. Run with the dev server on 4310. */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
const out = {};
const nav = async (label) => { await p.locator('.m-nav').getByText(label, { exact: true }).first().click(); await p.waitForTimeout(350); };
const count = (sel) => p.locator(sel).count();
// Activity → event drawer → play session → back
await nav('Data Management');
out.activityRows = await count('.m-dmg__row');
await p.locator('.m-dmg__row td').first().click(); await p.waitForTimeout(400);
out.eventDrawer = { open: await count('.m-evd'), rows: await count('.m-evd__row'), play: await p.getByRole('button', { name: 'Play session' }).count() };
await p.locator('.m-evd__tools input[type="text"], .m-evd__tools input:not([type="radio"])').first().fill('url'); await p.waitForTimeout(150);
out.eventDrawerFiltered = await count('.m-evd__row');
await p.getByRole('button', { name: 'Play session' }).click(); await p.waitForTimeout(500);
out.replayFromActivity = await count('.m-sreplay');
await p.locator('.m-sreplay__back').click(); await p.waitForTimeout(400);
out.backToActivity = await count('.m-dmg__row');
// distinct id link → person page
await p.locator('.m-dmg__link').first().click(); await p.waitForTimeout(500);
out.personFromActivity = { card: await count('.m-person__card'), timelineRows: await count('.m-ptl__row'), days: await count('.m-tl__day'), title: await p.locator('.m-page__title').textContent() };
// person: timeline row → event drawer; properties drawer; sessions drawer → replay
await p.screenshot({ path: '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad/person.png' });
await p.locator('.m-ptl__row').first().evaluate((el) => el.click()); await p.waitForTimeout(400);
await p.screenshot({ path: '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad/person-event.png' });
out.personEventDrawer = await count('.m-evd');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.getByRole('button', { name: /properties$/ }).click(); await p.waitForTimeout(400);
out.propsDrawer = { rows: await count('.m-uprops__list .m-erow'), title: await p.locator('.m-drawer__title').last().textContent() };
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Play sessions' }).click(); await p.waitForTimeout(400);
out.sessionsDrawer = await count('.m-psess__row');
if (out.sessionsDrawer) { await p.locator('.m-psess__row').first().click(); await p.waitForTimeout(500); out.replayFromPerson = await count('.m-sreplay'); await p.locator('.m-sreplay__back').click(); await p.waitForTimeout(400); out.backToPerson = await count('.m-person__card'); }
await p.locator('.m-page__back').click(); await p.waitForTimeout(400);
out.backToPeople = await count('.m-dmg__row');
// Events → event page → property row → property page → event row
await nav('Events');
await p.locator('.m-dmg__row').first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad/event-page.png' });
out.eventPage = { pill: await p.locator('.m-ditem__pill').textContent(), rows: await count('.m-ditem__rows .m-erow'), switch: await count('.m-ditem__rows .ant-switch'), propRows: await count('.m-page .ant-table-row') };
// edit display name inline
await p.locator('.m-ditem__rows .m-erow').first().hover(); await p.locator('.m-ditem__rows .m-erow__pencil').first().click({ force: true }); await p.waitForTimeout(200);
await p.keyboard.type(' edited'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
out.eventRenamed = await p.locator('.m-page__title').textContent();
const customRow = p.locator('.m-page .ant-table-row.m-dmg__row').first();
out.eventHasCustomProp = await customRow.count();
if (out.eventHasCustomProp) { await customRow.click(); await p.waitForTimeout(500); out.propertyPage = { back: await p.locator('.m-page__back').textContent(), pill: await p.locator('.m-ditem__pill').textContent(), rows: await count('.m-ditem__rows .m-erow'), eventsRows: await count('.m-page .ant-table-row') }; await p.locator('.m-page .ant-table-row').first().click(); await p.waitForTimeout(500); out.eventFromProperty = await p.locator('.m-page__back').textContent(); }
// Features → drawer → update disabled until change
await nav('Features');
await p.locator('.m-dmg__row').first().click(); await p.waitForTimeout(400);
await p.screenshot({ path: '/private/tmp/claude-501/-Users-gabriellinares-awesomic-OpenReplay/c1ad3923-4301-44de-a8aa-9d487e991527/scratchpad/feature.png' });
out.featureDrawer = { open: await count('.m-fdrawer__fields'), tiles: await count('.m-tile'), updateDisabled: await p.getByRole('button', { name: 'Update' }).isDisabled() };
await p.locator('.m-fdrawer__fields input').first().fill('Renamed feature'); await p.waitForTimeout(100);
out.featureUpdateEnabled = !(await p.getByRole('button', { name: 'Update' }).isDisabled());
await p.getByRole('button', { name: 'Update' }).click(); await p.waitForTimeout(300);
out.featureRenamedInList = await p.locator('.m-dmg__row').getByText('Renamed feature').count();
// Properties list → user property page → user row → person
await nav('Properties');
await p.locator('.m-dmg__row').first().click(); await p.waitForTimeout(400);
out.userPropertyPage = { back: await p.locator('.m-page__back').textContent(), users: await count('.m-page .ant-table-row') };
if (out.userPropertyPage.users) { await p.locator('.m-page .ant-table-row').first().click(); await p.waitForTimeout(500); out.personFromProperty = await count('.m-person__card'); }
// Events → Play sessions → sessions list with a filter
await nav('Events');
if (await count('.m-page__back')) { await p.locator('.m-page__back').click(); await p.waitForTimeout(300); }
await p.locator('.m-dmg__row td').nth(3*4).click(); await p.waitForTimeout(400);
await p.getByRole('button', { name: 'Play sessions' }).click(); await p.waitForTimeout(600);
out.sessionsAfterPlay = { onSessions: await count('.m-sc'), summary: await p.locator('.m-sc__summary').textContent().catch(() => null) };
out.errors = errs.slice(0, 6);
console.log(JSON.stringify(out, null, 1));
await b.close();
