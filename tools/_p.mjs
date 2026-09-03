import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1680,height:1000} });
const p = await c.newPage();
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,140)));
p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,180)));
await p.goto('http://localhost:4310/', { waitUntil:'networkidle' });
await p.waitForTimeout(900);
console.log('tree:', await p.evaluate(()=>[...document.querySelectorAll('.m-nav__section')].map(sec=>({
  label: sec.querySelector('.m-nav__label')?.textContent ?? '(none)',
  rows: [...sec.querySelectorAll('.m-nav-item:not(.is-nested) .m-nav-item__label')].map(e=>e.textContent),
}))));
console.log('collapse in foot:', await p.evaluate(()=>[...document.querySelectorAll('.m-nav__tool')].map(b=>b.getAttribute('aria-label'))));
console.log('collapse in corner:', await p.evaluate(()=>document.querySelector('.m-nav__collapse')?.getAttribute('aria-label')));
// expand Analytics
await p.locator('.m-nav-item__label', { hasText: /^Analytics$/ }).first().click();
await p.waitForTimeout(500);
console.log('analytics subitems:', await p.evaluate(()=>[...document.querySelectorAll('.m-nav__sections .m-nav-item__label')].map(e=>e.textContent)));
// synthetics has no children in the nav
await p.locator('.m-nav-item__label', { hasText: /^Synthetics$/ }).first().click();
await p.waitForTimeout(500);
console.log('after Synthetics — nav subitems:', await p.evaluate(()=>[...document.querySelectorAll('.m-nav__sections .m-nav-item__label')].map(e=>e.textContent)));
console.log('page tabs:', await p.evaluate(()=>[...document.querySelectorAll('.m-page__tabs .ant-tabs-tab, .m-page__header .m-seg__item')].map(e=>e.textContent.trim())));
// collapse
await p.locator('.m-nav__collapse').click();
await p.waitForTimeout(600);
console.log('collapsed:', await p.evaluate(()=>({
  width: Math.round(document.querySelector('.m-nav').getBoundingClientRect().width),
  toggle: document.querySelector('.m-nav__brand-toggle')?.getAttribute('aria-label'),
  labelsHidden: getComputedStyle(document.querySelector('.m-nav__label')).opacity,
})));
await p.locator('.m-nav__brand-toggle').click();
await p.waitForTimeout(600);
console.log('re-expanded width:', await p.evaluate(()=>Math.round(document.querySelector('.m-nav').getBoundingClientRect().width)));
console.log('errors:', errs);
await b.close();
