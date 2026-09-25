// Integrasjonstest: laster den bygde bunten (dist/) i harness med alle mocks, åpner hvert ark i kd-hjem-card via hash,
// og rapporterer konsollfeil + tar et bilde per ark.  node test/alle-ark.js <utmappe>
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '/tmp/kd-ark', FONTS = process.env.KD_FONTS || '';
fs.mkdirSync(OUT, { recursive: true });
const HASHES = ['strom', 'klima', 'alarm', 'kamera', 'personer', 'vanning', 'planter', 'sovn', 'weather', 'rolf', 'media', 'tesla', '3d', 'server', 'settings', 'kalender', 'gjoremal', 'soppel', 'lys', 'stue', 'kjokken', 'soverom', 'gang'];
(async () => {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/test/mock/index.json') { res.writeHead(200); return res.end(JSON.stringify(fs.readdirSync(path.join(ROOT, 'test/mock')).filter(f => f.endsWith('.js')).sort())); }
    const p = path.join(ROOT, u);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : 'text/html' }); fs.createReadStream(p).pipe(res);
  }).listen(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  let errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('ERROR ' + m.text()); });
  if (FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => { const u = r.request().url(); return r.fulfill({ path: path.join(FONTS, u.includes('googleapis') ? (u.includes('Material') ? 'ms.css' : 'sg.css') : u.split('/').pop()) }); });
  await page.goto(`http://localhost:${srv.address().port}/test/harness.html?card=kd-hjem-card`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  console.log('start:', errs.length ? errs.join('\n') : 'ok'); errs = [];
  for (const h of HASHES) {
    await page.evaluate(h => { history.pushState(null, '', location.pathname + location.search + '#' + h); window.dispatchEvent(new CustomEvent('location-changed')); }, h);
    await page.waitForTimeout(1400);
    const info = await page.evaluate(() => { const r = document.querySelector('kd-hjem-card').shadowRoot; const host = r.querySelector('[data-sheet-host]'); const el = host && host.firstElementChild; return { tag: el && el.localName, len: el && el.shadowRoot ? el.shadowRoot.innerHTML.length : 0, title: (r.querySelector('[data-bh=title]') || {}).textContent, sub: (r.querySelector('[data-bh=sub]') || {}).textContent, err: el && el.shadowRoot ? /kd-.*card: /.test(el.shadowRoot.textContent) && el.shadowRoot.querySelector('.kd-root > div[style*="3a1c1c"]') ? el.shadowRoot.textContent.slice(0, 200) : '' : 'ikke montert' }; });
    await page.screenshot({ path: path.join(OUT, h + '.png') });
    console.log(`#${h}: ${info.tag} (${info.len} tegn) «${info.title} · ${info.sub}»${info.err ? ' FEIL: ' + info.err : ''}${errs.length ? '\n   ' + errs.join('\n   ') : ''}`);
    errs = [];
    await page.evaluate(() => history.back()); await page.waitForTimeout(700);
  }
  await browser.close(); srv.close();
})();
