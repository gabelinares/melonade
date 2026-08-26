/* Verifies a BUILT Storybook actually renders, rather than trusting the build's
 * exit code. Reads the generated index, then loads a sample of entries in the
 * iframe and reports any that error or render nothing. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2];
const out = process.argv[3];
const want = (process.argv[4] || '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const idx = await (await page.request.get(`${base}/index.json`)).json();
const entries = Object.values(idx.entries);
console.log(`index reports ${entries.length} entries (${entries.filter(e=>e.type==='docs').length} docs)`);

const pick = want.length
  ? entries.filter((e) => want.some((w) => e.id.includes(w)))
  : entries;

let broken = 0;
const notes = [];

/* Six at a time. Serially this took over three minutes per Storybook, which is
 * long enough that it stops being run. */
const CONCURRENCY = 6;
async function checkOne(e) {
  const errs = [];
  const p = await ctx.newPage();
  p.on('pageerror', (err) => errs.push(err.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const url = `${base}/iframe.html?id=${encodeURIComponent(e.id)}&viewMode=${e.type === 'docs' ? 'docs' : 'story'}`;
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 40000 });
  } catch (err) {
    errs.push(`goto failed: ${err.message}`);
  }
  /* A docs page mounts every story in the file plus the controls table, so it
     needs materially longer than a single story. */
  await p.waitForTimeout(e.type === 'docs' ? 2600 : 700);

  /* The root depends on the view mode. BOTH containers exist in every iframe, and
     the one belonging to the other mode is present but empty, so a fixed
     preference order measures the empty one half the time. That reported 61 of
     85 healthy entries as broken. */
  const rendered = await p.evaluate((isDocs) => {
    const root = isDocs
      ? document.getElementById('storybook-docs')
      : document.getElementById('storybook-root');
    if (!root) return { children: 0, area: 0, text: 0 };
    const r = root.getBoundingClientRect();
    return {
      children: root.querySelectorAll('*').length,
      area: Math.round(r.width * r.height),
      text: (root.innerText || '').trim().length,
    };
  }, e.type === 'docs');

  const hasSbError = await p.evaluate(() => {
    const el = document.querySelector('.sb-show-errordisplay') || document.getElementById('error-message');
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
  });
  await p.close();

  const nullRender = rendered.children === 1 && errs.length === 0 && !hasSbError;
  const bad = errs.length > 0 || hasSbError || rendered.children < 1 || rendered.area === 0;
  if (nullRender) notes.push(`renders nothing by design: ${e.id}`);
  if (bad) {
    broken++;
    console.log(`  BROKEN ${e.id}  nodes=${rendered.children} area=${rendered.area} text=${rendered.text} sbError=${hasSbError} errs=${errs.length}`);
    for (const x of [...new Set(errs)].slice(0, 2)) console.log(`      ${x.slice(0, 160)}`);
  }
}

for (let i = 0; i < pick.length; i += CONCURRENCY) {
  await Promise.all(pick.slice(i, i + CONCURRENCY).map(checkOne));
}

for (const nt of notes) console.log(`  ${nt}`);
console.log(`checked ${pick.length} entries, ${broken} broken`);
await browser.close();
process.exit(broken ? 1 : 0);
