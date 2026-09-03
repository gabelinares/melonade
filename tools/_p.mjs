import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport:{width:1680,height:1000} });
const p = await c.newPage();
const errs=[]; p.on('console',m=>m.type()==='error'&&errs.push(m.text().slice(0,140)));
p.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,180)));
await p.goto('http://localhost:4310/', { waitUntil:'networkidle' });
await p.waitForTimeout(500);
await p.locator('.m-nav-item__label', { hasText: /^Sessions$/ }).first().click();
await p.waitForTimeout(800);
console.log('columns:', await p.evaluate(()=>[...document.querySelectorAll('.m-ss__table th')].map(t=>t.textContent.trim()).filter(Boolean)));
console.log('sortable headers:', await p.evaluate(()=>[...document.querySelectorAll('.m-ss__table th')].filter(t=>t.querySelector('.m-sort')).map(t=>t.textContent.trim())));
console.log('strip:', await p.evaluate(()=>[...document.querySelectorAll('.m-page__toolbar .m-seg__item, .m-page__toolbar button')].map(e=>e.textContent.trim())));
console.log('bookmark on row:', await p.evaluate(()=>!!document.querySelector('.m-ss__act')), '| play:', await p.evaluate(()=>!!document.querySelector('.m-ss__play')));
console.log('field says:', await p.evaluate(()=>document.querySelector('.m-sc__field-text')?.textContent));
console.log('sort options:', await p.evaluate(async()=>{
  document.querySelector('.m-sc__bar [aria-label^="Display"]')?.click();
  await new Promise(r=>setTimeout(r,400));
  const sel = document.querySelector('.m-dm__row .ant-select');
  return sel?.textContent;
}));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// click a tab
const tabs = await p.locator('.m-page__toolbar .m-seg__item').count();
if (tabs) {
  await p.locator('.m-page__toolbar .m-seg__item', { hasText: 'Errors' }).first().click();
  await p.waitForTimeout(500);
  console.log('after Errors tab:', await p.evaluate(()=>document.querySelector('.m-listfoot__range')?.textContent));
}
console.log('errors:', errs);
await b.close();
