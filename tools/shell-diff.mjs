/* Measures the page shell on the list and on the detail and prints them side by
 * side. "It feels like a break" is a claim about numbers - where the card starts,
 * how tall the header is, where the first text sits - and those either match or
 * they do not. */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{width:1680,height:1000}, colorScheme:'light' })).newPage();
await p.goto(process.argv[2] || 'http://localhost:4310/', { waitUntil:'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);

const shell = () => p.evaluate(() => {
  const main = document.querySelector('.m-shell__main');
  const card = main?.firstElementChild;
  const head = card?.querySelector('.m-page__head, .m-work__head, header');
  const title = card?.querySelector('h1, .m-page__title, .m-work__title');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
             pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
             radius: cs.borderRadius, border: cs.borderWidth, bg: cs.backgroundColor, shadow: cs.boxShadow.slice(0,28) }; };
  const t = title ? getComputedStyle(title) : null;
  return {
    mainPad: main ? getComputedStyle(main).padding : null,
    card: box(card), cardClass: card?.className?.toString().slice(0, 34),
    head: box(head), headClass: head?.className?.toString().slice(0, 34),
    titleText: title?.textContent?.trim().slice(0, 26),
    titleLeft: title ? Math.round(title.getBoundingClientRect().left) : null,
    titleFont: t ? `${t.fontSize}/${t.fontWeight}` : null,
  };
});

const list = await shell();
await p.locator('[aria-label="Open the write-up"]').first().click();
await p.waitForTimeout(600);
const detail = await shell();

const keys = [...new Set([...Object.keys(list), ...Object.keys(detail)])];
const rows = {};
for (const k of keys) {
  const a = typeof list[k] === 'object' ? JSON.stringify(list[k]) : String(list[k]);
  const c = typeof detail[k] === 'object' ? JSON.stringify(detail[k]) : String(detail[k]);
  rows[k] = { list: a, detail: c, same: a === c ? 'yes' : 'NO' };
}
for (const [k, v] of Object.entries(rows)) {
  console.log(`\n${v.same === 'yes' ? '  ' : '≠ '}${k}`);
  console.log(`    list  : ${v.list}`);
  if (v.same !== 'yes') console.log(`    detail: ${v.detail}`);
}
await b.close();
