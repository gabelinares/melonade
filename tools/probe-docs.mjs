import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1280,height:900} });
const p = await c.newPage();
await p.goto('http://localhost:6399/iframe.html?id=components-chip--docs&viewMode=docs', { waitUntil:'networkidle' });
await p.waitForTimeout(1500);
const info = await p.evaluate(() => {
  const ids = [...document.querySelectorAll('[id]')].map(e => e.id).filter(Boolean).slice(0, 12);
  const body = document.body;
  return {
    ids,
    bodyNodes: body.querySelectorAll('*').length,
    bodyText: (body.innerText||'').trim().slice(0, 120),
    sbRoot: !!document.getElementById('storybook-root'),
    sbDocs: !!document.getElementById('storybook-docs'),
    sbDocsNodes: document.getElementById('storybook-docs')?.querySelectorAll('*').length ?? -1,
    sbDocsHTML: (document.getElementById('storybook-docs')?.innerHTML || '').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
