// Google Flights (agrega Latam, Gol, Azul e outras). Lê o texto renderizado da página pública.
export const id = 'google';
export const name = 'Google Flights';

export function buildGoogleUrl(q) {
  let phrase = `Flights to ${q.destination} from ${q.origin} on ${q.depart}`;
  if (q.return) phrase += ` through ${q.return}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(phrase)}&curr=BRL&hl=pt-BR`;
}

const TIME = /^\d{1,2}:\d{2}$/;
const PRICE = /^R\$\s?([\d.]+)$/;

export function parseGoogleText(text, q) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const offers = [];
  for (let i = 0; i < lines.length; i++) {
    // início de um card: HH:MM, "–", HH:MM
    if (!(TIME.test(lines[i]) && lines[i + 1] === '–' && TIME.test(lines[i + 2] ?? ''))) continue;
    let j = i + 3;
    while (/^\+\d$/.test(lines[j] ?? '')) j++;
    const airline = (lines[j] ?? '').split('Operado por')[0].trim() || null;
    let stops = null, price = null;
    for (let k = j + 1; k < Math.min(lines.length, j + 14); k++) {
      if (TIME.test(lines[k]) && lines[k + 1] === '–') break; // próximo card
      if (/^Sem escalas$/i.test(lines[k])) stops = 0;
      const m = /^(\d+) escalas?$/i.exec(lines[k]);
      if (m) stops = Number(m[1]);
      const p = PRICE.exec(lines[k]);
      if (p) { price = Number(p[1].replace(/\./g, '')); break; }
    }
    if (price && airline) {
      offers.push({ source: id, price, currency: 'BRL', airline, stops, depart: q.depart, return: q.return ?? null, url: buildGoogleUrl(q) });
    }
  }
  return offers;
}

export async function search({ newPage }, q) {
  const page = await newPage();
  try {
    return await run(page, q);
  } finally {
    await page.close().catch(() => {});
  }
}

async function run(page, q) {
  const resp = await page.goto(buildGoogleUrl(q), { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (resp && [403, 429].includes(resp.status())) throw Object.assign(new Error(`HTTP ${resp.status()}`), { code: 'blocked' });
  // consentimento de cookies (UE) — não é verificação anti-robô
  await page.getByRole('button', { name: /Aceitar tudo|Accept all/i }).first().click({ timeout: 2500 }).catch(() => {});
  await page.waitForFunction(() => /R\$\s?\d/.test(document.body.innerText) || /nenhum voo|no flights/i.test(document.body.innerText), null, { timeout: 25000 }).catch(() => {});
  const text = await page.evaluate(() => document.body.innerText);
  if (/tráfego incomum|unusual traffic|captcha/i.test(text) || page.url().includes('/sorry/')) {
    throw Object.assign(new Error('verificação anti-robô'), { code: 'blocked' });
  }
  return parseGoogleText(text, q);
}
