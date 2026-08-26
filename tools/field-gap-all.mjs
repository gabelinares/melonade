/* Every text field in the running app, including the ones only reachable through
 * an interaction: the filter menu's search, the display menu, the command
 * palette, and each dialog. Storybook cannot cover these compositions, which is
 * how a 1px gap shipped in the one field with no story. */
import { chromium } from 'playwright';

const [url, theme] = process.argv.slice(2);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 880 }, colorScheme: theme || 'light' });

const MEASURE = () =>
  // eslint-disable-next-line
  (() => {
    /* A border only draws an edge if it is VISIBLE. Mantine's unstyled input
       keeps a 1px TRANSPARENT border for layout, and counting that as an edge
       reported a correctly-fixed field as still cramped. Third measuring bug of
       the session, same shape as the others: the tool believed a computed value
       without asking whether it renders. */
    const opaque = (color) => !/^(transparent$|rgba?\(.*,\s*0\s*\)$)/.test(color.trim());
    const drawsEdge = (el) => {
      const cs = getComputedStyle(el);
      const bw = parseFloat(cs.borderLeftWidth) || 0;
      const ow = parseFloat(cs.outlineWidth) || 0;
      return (
        (bw > 0 && cs.borderLeftStyle !== 'none' && opaque(cs.borderLeftColor)) ||
        (cs.outlineStyle !== 'none' && ow > 0 && opaque(cs.outlineColor)) ||
        (cs.boxShadow !== 'none' && cs.boxShadow !== '')
      );
    };
    const res = [];
    for (const el of document.querySelectorAll('input, textarea')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let owner = el, hops = 0;
      while (owner && hops < 4 && !drawsEdge(owner)) { owner = owner.parentElement; hops++; }
      const or = (owner || el).getBoundingClientRect();
      const cs = getComputedStyle(el);
      const textStart = r.left + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0);
      res.push({
        ph: el.getAttribute('placeholder') || el.getAttribute('aria-label') || '(none)',
        gap: Math.round(textStart - or.left),
        pad: Math.round(parseFloat(cs.paddingLeft) || 0),
        edge: owner === el ? 'self' : 'wrapper',
      });
    }
    return res;
  })();

const seen = new Map();
async function probe(name, setup) {
  const p = await c.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  try { await setup(p); } catch (e) { console.log(`  (${name} unreachable: ${String(e).slice(0, 60)})`); }
  await p.waitForTimeout(400);
  for (const r of await p.evaluate(MEASURE)) {
    const key = `${r.ph}|${r.gap}|${r.edge}`;
    if (!seen.has(key)) seen.set(key, { ...r, where: name });
  }
  await p.close();
}

await probe('page', async () => {});
await probe('filter root', async (p) => {
  await p.getByRole('button', { name: /^Filters/ }).click();
});
await probe('filter dimension', async (p) => {
  await p.getByRole('button', { name: /^Filters/ }).click();
  await p.waitForTimeout(300);
  await p.locator('[class*="fm__dim-row"]').first().click();
});
await probe('command palette', async (p) => {
  await p.keyboard.press('Meta+k');
});
await probe('rename dialog', async (p) => {
  await p.locator('[aria-label^="Actions for"], [aria-label="Issue actions"]').first().click();
  await p.waitForTimeout(300);
  await p.getByRole('menuitem', { name: /Rename/ }).click();
});
await probe('critical dialog', async (p) => {
  await p.locator('.m-crit, .b-crit').first().click();
});

let bad = 0;
for (const r of seen.values()) {
  const flag = r.gap < 6 ? 'CRAMPED' : 'ok     ';
  if (r.gap < 6) bad++;
  console.log(`${flag} gap=${String(r.gap).padStart(3)}px pad=${String(r.pad).padStart(2)} edge=${r.edge.padEnd(7)} [${r.where}] "${r.ph.slice(0, 34)}"`);
}
console.log(bad ? `\n${bad} CRAMPED` : '\nEvery field has room.');
await b.close();
process.exit(bad ? 1 : 0);
