import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1680,height:1000} });
const p = await c.newPage();
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,180)));
p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,140)));
await p.goto('http://localhost:4310/', { waitUntil:'networkidle' });
await p.waitForTimeout(700);
console.log('brand:', await p.evaluate(()=>({
  name: document.querySelector('.m-nav__brand-name')?.textContent,
  mark: !!document.querySelector('.m-ormark'),
  outline: document.querySelector('.m-ormark__outline') && getComputedStyle(document.querySelector('.m-ormark__outline')).fill,
  play: document.querySelector('.m-ormark__play') && getComputedStyle(document.querySelector('.m-ormark__play')).fill,
})));
await p.hover('.m-nav__brand');
await p.waitForTimeout(500);
console.log('on hover, inner play transform:', await p.evaluate(()=>getComputedStyle(document.querySelector('.m-ormark__play')).transform));
await p.locator('.m-nav-item__label', { hasText: /^Sessions$/ }).first().click();
await p.waitForTimeout(700);
await p.locator('.m-sc__field').click(); await p.waitForTimeout(500);
const kinds = () => p.evaluate(()=>[...document.querySelectorAll('.m-pick__kind')].map(k=>({
  head: k.querySelector('.m-pick__kind-name')?.textContent ?? '(no heading)',
  hint: k.querySelector('.m-pick__kind-hint')?.textContent ?? '',
  n: k.querySelectorAll('.m-pick__row').length,
})));
console.log('all:', await kinds());
await p.fill('.m-pick__search input', 'error'); await p.waitForTimeout(400);
console.log('"error" (both kinds):', await kinds());
await p.fill('.m-pick__search input', 'country'); await p.waitForTimeout(400);
console.log('"country" (one kind, no heading):', await kinds());
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// the segment drawer copy
await p.locator('.m-page__tabs .ant-tabs-tab', { hasText: 'Segments' }).click(); await p.waitForTimeout(500);
await p.locator('.m-seg__row').first().click(); await p.locator('.ant-drawer').waitFor(); await p.waitForTimeout(500);
console.log('drawer field copy:', await p.evaluate(()=>document.querySelector('.ant-drawer .m-sc__lead')?.textContent));
console.log('errors:', errs);
await b.close();
