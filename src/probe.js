// Uso: node src/probe.js <url> [prefixo-saida] — salva texto renderizado, respostas JSON com preço e screenshot
import fs from 'node:fs';
import { launch } from './browser.js';

const [url, out = '.probe/out'] = process.argv.slice(2);
const { browser, context } = await launch();
const page = await context.newPage();
const jsons = [];
page.on('response', async (r) => {
  try {
    if (!(r.headers()['content-type'] || '').includes('json')) return;
    const body = await r.text();
    if (/price|preco|fare|total|amount/i.test(body)) jsons.push({ url: r.url(), status: r.status(), size: body.length, body: body.slice(0, 200000) });
  } catch {}
});
const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => ({ status: () => 'ERR ' + e.message }));
console.log('status', resp.status?.());
await page.waitForTimeout(Number(process.env.WAIT || 9000));
fs.writeFileSync(out + '.txt', await page.evaluate(() => document.body.innerText));
fs.writeFileSync(out + '.json', JSON.stringify(jsons, null, 1));
await page.screenshot({ path: out + '.png' });
console.log('title:', await page.title(), '| json responses:', jsons.length);
for (const j of jsons) console.log(' ', j.status, j.size, j.url.slice(0, 120));
await browser.close();
