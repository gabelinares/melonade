/* Two pages, two jobs, and they must not borrow each other's furniture.
 *
 * ISSUE DETAIL: the write-up is the document on the page - its own title, fact
 * row and tabs - a breadcrumb in the header, and NO side panel and NO details
 * band. That page was fine before 08-26 and is back to being that page.
 * SESSION REPLAY: the side panel with Journey + Details, where Details is the
 * write-up read beside the recording.
 */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1680,height:1000}, colorScheme:'light' })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.argv[2] || 'http://localhost:4310/', { waitUntil:'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

const state = () => p.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const head = q('.m-ihdr');
  return {
    crumb: q('.m-ihdr__crumb')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    headerTitle: q('.m-ihdr__grow .m-ihdr__title')?.textContent?.trim().slice(0, 22) ?? null,
    headerTitleFont: (() => { const t = q('.m-ihdr__grow .m-ihdr__title'); if (!t) return null;
      const cs = getComputedStyle(t); return `${cs.fontSize}/${cs.fontWeight}`; })(),
    detailsBand: !!q('.m-idet'),
    writeUpOnPage: !!q('.m-work__scroll .m-wu'),
    writeUpTitle: q('.m-wu__title')?.textContent?.trim().slice(0, 22) ?? null,
    writeUpTabs: [...document.querySelectorAll('.m-wu .ant-tabs-tab')].map((t) => t.textContent.trim()),
    panel: !!q('.m-jrn'),
    tabs: [...document.querySelectorAll('.m-jrn__tab')].map((t) => t.textContent.trim()),
    onTab: q('.m-jrn__tab.is-on')?.textContent?.trim() ?? null,
    journeySteps: document.querySelectorAll('.m-jrn__step').length,
    answers: [...document.querySelectorAll('.m-jrn__answer h3')].map((h) => h.textContent.trim()),
    headerH: head ? Math.round(head.getBoundingClientRect().height) : null,
    cardLeft: Math.round((q('.m-work') ?? q('.m-page')).getBoundingClientRect().left),
    cardW: Math.round((q('.m-work') ?? q('.m-page')).getBoundingClientRect().width),
  };
});

const list = await state();
await p.locator('[aria-label="Open the write-up"]').first().click();
await p.locator('.m-scard:not(.m-scard--skeleton) .m-scard__frame').first().waitFor();
const issue = await state();
await p.locator('.m-scard').first().click();
await p.waitForTimeout(900);
const replay = await state();
await p.locator('.m-jrn__tab', { hasText: 'Details' }).click();
await p.waitForTimeout(350);
const replayDetails = await state();

const ok = [], bad = [];
const t = (n, c, d) => (c ? ok : bad).push(`${n}${d ? ` — ${d}` : ''}`);

t('ISSUE PAGE: breadcrumb in the header', issue.crumb === 'Issues/This issue', issue.crumb);
t('ISSUE PAGE: no expand/collapse title', !issue.headerTitle);
t('ISSUE PAGE: no details band', !issue.detailsBand);
t('ISSUE PAGE: no side panel', !issue.panel);
t('ISSUE PAGE: the write-up is the document', issue.writeUpOnPage && !!issue.writeUpTitle, issue.writeUpTitle);
t('ISSUE PAGE: its tabs are back', issue.writeUpTabs.length >= 3, issue.writeUpTabs.join(' | '));

t('REPLAY: side panel with two tabs', replay.panel && replay.tabs.length === 2, replay.tabs.join(' | '));
t('REPLAY: journey is the default tab', replay.onTab?.startsWith('Journey'), replay.onTab);
t('REPLAY: the journey walks', replay.journeySteps > 0, `${replay.journeySteps} steps`);
t('REPLAY: Details tab holds the three answers stacked', replayDetails.answers.length === 3,
  replayDetails.answers.join(' / '));
t('REPLAY: header title is the row size, not the page size',
  replay.headerTitleFont === '14px/500', replay.headerTitleFont);
t('REPLAY: no details band', !replay.detailsBand);

t('SHELL: card edges match the list on both', issue.cardLeft === list.cardLeft && issue.cardW === list.cardW
  && replay.cardLeft === list.cardLeft, `list ${list.cardLeft}/${list.cardW}, issue ${issue.cardLeft}/${issue.cardW}`);
t('SHELL: header height constant', issue.headerH === replay.headerH, `${issue.headerH}/${replay.headerH}`);
t('no page errors', errs.length === 0, errs.join(' | '));

console.log('PASS'); ok.forEach(l => console.log('  ✓ ' + l));
if (bad.length) { console.log('\nFAIL'); bad.forEach(l => console.log('  ✗ ' + l)); }
await b.close();
process.exit(bad.length ? 1 : 0);
