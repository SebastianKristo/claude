// Tar skjermbilde av et kd-kort i harness.html.
// node test/shoot.js <tag> <out.png> [width] [height] [--cfg '{"...":1}'] [--wrap sheet] [--eval "js"] [--hash strom]
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const FONTS = process.env.KD_FONTS || '';
(async () => {
  const a = process.argv.slice(2); const opt = {};
  for (const k of ['--cfg', '--wrap', '--eval', '--hash']) { const i = a.indexOf(k); if (i >= 0) { opt[k.slice(2)] = a[i + 1]; a.splice(i, 2); } }
  const [tag, out, w = '420', h = '1400'] = a;
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/test/mock/index.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(fs.readdirSync(path.join(ROOT, 'test/mock')).filter(f => f.endsWith('.js')).sort())); }
    if (u === '/dist/ki-hjem-design.js') { // bygges i farten av src/*.js, så parallelle kjøringer ikke krasjer i dist
      const vm = require('vm');
      const only = process.env.KD_ONLY ? process.env.KD_ONLY.split(',') : null; // f.eks. KD_ONLY=00,10,20
      const src = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort()
        .filter(f => !only || only.some(p => f.startsWith(p)))
        .map(f => { const code = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
          try { new vm.Script(code, { filename: f }); } catch (e) { console.error('HOPPER OVER (syntaksfeil)', f, e.message); return `console.warn('hoppet over ${f}: syntaksfeil');`; }
          return `/* ${f} */\ntry {\n${code}\n} catch (e) { console.error('${f}', e); }`; }).join('\n');
      res.writeHead(200, { 'content-type': 'application/javascript' }); return res.end(src);
    }
    const p = path.join(ROOT, u);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : p.endsWith('.json') ? 'application/json' : 'text/html' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('CONSOLE', m.type(), m.text()); });
  if (FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, route => {
    const url = route.request().url();
    if (url.includes('googleapis')) return route.fulfill({ path: path.join(FONTS, url.includes('Material') ? 'ms.css' : 'sg.css'), contentType: 'text/css' });
    return route.fulfill({ path: path.join(FONTS, url.split('/').pop()), contentType: 'font/woff2' });
  });
  const qs = new URLSearchParams({ card: tag, cfg: opt.cfg || '{}', ...(opt.wrap ? { wrap: opt.wrap } : {}), ...(opt.hash ? { hash: opt.hash } : {}) });
  await page.goto(`http://localhost:${port}/test/harness.html?${qs}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);
  if (opt.eval) { await page.evaluate(opt.eval); await page.waitForTimeout(1500); }
  await page.screenshot({ path: out, fullPage: true });
  await browser.close(); srv.close();
})();
