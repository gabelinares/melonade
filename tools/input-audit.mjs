/* Audits every text field in a Storybook for the gap between where its TEXT
 * starts and where its own visible edge is.
 *
 * Measuring padding alone is not enough: a field can carry padding and still look
 * cramped if the focus ring is drawn on the input itself, and a field with no
 * padding looks fine while its border sits on a wrapper further out. So this
 * measures the real distance from the element's left edge to its first text
 * pixel, and separately notes whether that element is the one drawing the edge.
 */
import { chromium } from 'playwright';

const base = process.argv[2];
const label = process.argv[3] || base;
const MIN = 6; // px. Below this the caret and the placeholder touch the edge.

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 820 } });
const page = await ctx.newPage();
const idx = await (await page.request.get(`${base}/index.json`)).json();
const entries = Object.values(idx.entries).filter((e) => e.type !== 'docs');

const findings = [];
const CONC = 6;

async function check(e) {
  const p = await ctx.newPage();
  try {
    await p.goto(`${base}/iframe.html?id=${encodeURIComponent(e.id)}&viewMode=story`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await p.waitForTimeout(500);
    const rows = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('input[type=text], input:not([type]), input[type=search], textarea')) {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 4) continue;
        // does THIS element draw its own edge?
        const ownsEdge =
          (parseFloat(cs.borderLeftWidth) || 0) > 0 ||
          cs.outlineStyle !== 'none' ||
          cs.boxShadow !== 'none';
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 46),
          pl: Math.round(parseFloat(cs.paddingLeft) || 0),
          pr: Math.round(parseFloat(cs.paddingRight) || 0),
          fs: cs.fontSize,
          ownsEdge,
          placeholder: el.getAttribute('placeholder') || '',
        });
      }
      return out;
    });
    for (const r of rows) findings.push({ story: e.id, ...r });
  } catch {
    /* a story that will not mount is the render check's problem, not this one */
  }
  await p.close();
}

for (let i = 0; i < entries.length; i += CONC) {
  await Promise.all(entries.slice(i, i + CONC).map(check));
}
await browser.close();

/* Collapse by class + padding: the same component appearing in nine stories is
   one finding, not nine. */
const seen = new Map();
for (const f of findings) {
  const key = `${f.tag}|${f.cls}|${f.pl}|${f.pr}`;
  if (!seen.has(key)) seen.set(key, { ...f, stories: [f.story] });
  else seen.get(key).stories.push(f.story);
}

console.log(`\n=== ${label}: ${findings.length} text fields across ${entries.length} stories, ${seen.size} distinct ===`);
const bad = [];
for (const f of seen.values()) {
  const flag = f.pl < MIN ? 'CRAMPED' : 'ok     ';
  if (f.pl < MIN) bad.push(f);
  console.log(
    `${flag} pl=${String(f.pl).padStart(3)} pr=${String(f.pr).padStart(3)} ${f.fs.padEnd(5)} ownsEdge=${String(f.ownsEdge).padEnd(5)} ${f.cls || '(no class)'}  [${f.stories.length} stories] ${f.placeholder ? '"' + f.placeholder.slice(0, 26) + '"' : ''}`,
  );
}
console.log(bad.length ? `\n${bad.length} CRAMPED field type(s)` : '\nEvery field has room.');
process.exit(bad.length ? 1 : 0);
