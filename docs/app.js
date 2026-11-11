const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtDate = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const fmtWhen = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Cria elemento sem innerHTML: textos dos usuários nunca viram HTML.
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

const state = { searches: [], prices: {}, status: {}, deals: [], meta: { sources: [] }, fSource: '', fAirline: '' };

async function loadJson(name, fallback) {
  try {
    const r = await fetch(`data/${name}?t=${Date.now()}`, { cache: 'no-store' });
    return r.ok ? await r.json() : fallback;
  } catch { return fallback; }
}

async function loadAll() {
  [state.searches, state.prices, state.status, state.deals, state.meta] = await Promise.all([
    loadJson('searches.json', []), loadJson('prices.json', {}), loadJson('status.json', {}),
    loadJson('deals.json', []), loadJson('meta.json', { sources: [] }),
  ]);
  render();
}

function renderHealth() {
  const box = $('#health');
  box.replaceChildren();
  for (const src of state.meta.sources ?? []) {
    const st = state.status[src.id];
    let cls = 'chip', txt = `${src.name}: aguardando 1ª coleta`;
    if (st?.ok) { cls = 'chip ok'; txt = `${src.name}: funcionando (${st.offers} ofertas)`; }
    else if (st?.code === 'not_configured') { cls = 'chip warn'; txt = `${src.name}: precisa de token (veja o README)`; }
    else if (st?.code === 'blocked') { cls = 'chip bad'; txt = `${src.name}: bloqueado pelo site`; }
    else if (st) { cls = 'chip bad'; txt = `${src.name}: erro — ${st.error ?? ''}`; }
    box.append(h('span', { class: cls, title: st?.at ? `Última tentativa: ${fmtWhen(st.at)}` : '' }, txt));
  }
  box.append(h('span', { class: 'chip', title: 'Latam, Decolar e Kayak bloqueiam robôs. O Google Flights já lista voos e preços da Latam, Gol e Azul.' }, 'ℹ Latam/Decolar/Kayak: via Google Flights'));
}

function renderDeals() {
  const box = $('#deals');
  box.replaceChildren();
  if (!state.deals.length) {
    box.append(h('div', { class: 'empty' }, 'Nada por enquanto. Quando um preço bater sua meta ou cair 20% ou mais abaixo do normal da rota, aparece aqui.'));
    return;
  }
  for (const d of state.deals.slice(0, 12)) {
    box.append(h('div', { class: `deal ${d.flash ? '' : 'target'}` },
      d.flash ? h('span', { class: 'tag flash' }, `RELÂMPAGO −${d.dropPct}%`) : null,
      d.belowTarget ? h('span', { class: 'tag target' }, 'META') : null,
      h('div', {}, h('b', {}, brl(d.price)), ` · ${d.airline ?? 'companhia n/d'}`),
      h('div', { class: 'route' }, `${d.label} · ${fmtWhen(d.t)}`),
      h('a', { href: d.url, target: '_blank', rel: 'noopener' }, 'Ver oferta')));
  }
}

const matches = (r) => (!state.fSource || r.source === state.fSource) && (!state.fAirline || r.airline === state.fAirline);

function sparkline(points) {
  const W = 300, H = 60, P = 6;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Evolução do menor preço');
  if (points.length < 2) return svg;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const xy = points.map((v, i) => [P + (i * (W - 2 * P)) / (points.length - 1), H - P - ((v - min) / span) * (H - 2 * P)]);
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  const dot = document.createElementNS(svg.namespaceURI, 'circle');
  dot.setAttribute('cx', xy.at(-1)[0]); dot.setAttribute('cy', xy.at(-1)[1]); dot.setAttribute('r', 3.5);
  svg.append(path, dot);
  return svg;
}

const dedupe = (rows) => rows.filter((r, i) => rows.findIndex((x) => x.airline === r.airline && x.price === r.price && x.source === r.source) === i);

function renderSearches() {
  const box = $('#searches');
  box.replaceChildren();
  if (!state.searches.length) { box.append(h('div', { class: 'empty' }, 'Nenhuma busca ainda. Clique em “+ Nova busca”.')); return; }
  for (const s of state.searches) {
    const rows = (state.prices[s.id] ?? []).filter(matches);
    const byRun = new Map();
    for (const r of rows) byRun.set(r.t, Math.min(byRun.get(r.t) ?? Infinity, r.price));
    const series = [...byRun.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
    const lastT = [...byRun.keys()].sort().at(-1);
    const latest = rows.filter((r) => r.t === lastT).sort((a, b) => a.price - b.price);
    const best = latest[0];
    const histMin = rows.length ? Math.min(...rows.map((r) => r.price)) : null;

    const card = h('article', { class: 'card' },
      h('h3', {}, s.label || `${s.origin} → ${s.destination}`),
      h('div', { class: 'route' }, `${s.origin} → ${s.destination} · ${fmtDate(s.depart)}${s.return ? ` – ${fmtDate(s.return)}` : ' (só ida)'} · a cada ${s.intervalMinutes} min`),
      best
        ? h('div', { class: 'price' }, brl(best.price), ' ', h('small', {}, `${best.airline ?? ''} · ${best.stops === 0 ? 'direto' : best.stops != null ? best.stops + ' esc.' : ''}`))
        : h('div', { class: 'empty' }, rows.length ? 'Nenhuma oferta com esses filtros.' : 'Aguardando a 1ª coleta (roda a cada 15 min no GitHub).'),
      series.length >= 2 ? sparkline(series) : null,
      h('div', { class: 'stats' },
        s.targetPrice ? h('span', {}, `Meta: ${brl(s.targetPrice)}`) : null,
        histMin != null ? h('span', {}, `Mínimo visto: ${brl(histMin)}`) : null,
        lastT ? h('span', {}, `Atualizado ${fmtWhen(lastT)}`) : null),
      latest.length ? h('table', {}, dedupe(latest).slice(0, 5).map((r) => h('tr', {}, h('td', {}, `${r.airline ?? '—'} · ${r.source}`), h('td', {}, brl(r.price))))) : null,
      h('div', { class: 'foot' },
        best ? h('a', { href: best.url, target: '_blank', rel: 'noopener' }, 'Abrir busca ↗') : h('span'),
        h('button', { class: 'danger', onclick: () => removeSearch(s.id) }, 'Remover')));
    box.append(card);
  }
}

function renderFilters() {
  const all = Object.values(state.prices).flat();
  const fill = (sel, values, labelOf, current) => {
    const el = $(sel);
    el.replaceChildren(h('option', { value: '' }, 'Todas'), ...values.map((v) => h('option', { value: v, selected: v === current }, labelOf(v))));
  };
  const names = Object.fromEntries((state.meta.sources ?? []).map((x) => [x.id, x.name]));
  fill('#f-source', [...new Set(all.map((r) => r.source))].sort(), (v) => names[v] ?? v, state.fSource);
  fill('#f-airline', [...new Set(all.map((r) => r.airline).filter(Boolean))].sort(), (v) => v, state.fAirline);
}

function render() {
  $('#updated').textContent = state.meta.updatedAt ? `Última coleta: ${fmtWhen(state.meta.updatedAt)}` : 'Ainda sem coletas';
  renderHealth(); renderDeals(); renderFilters(); renderSearches();
}

/* ---------- GitHub (criar/remover buscas) ---------- */
const store = {
  get: (k) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
function guessRepo() {
  const saved = store.get('fw-repo');
  if (saved) return saved;
  const m = location.hostname.match(/^(.+)\.github\.io$/);
  const repo = location.pathname.split('/').filter(Boolean)[0];
  return m && repo ? `${m[1]}/${repo}` : '';
}
const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const unb64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

async function ghEditSearches(mutate) {
  const repo = guessRepo(), token = store.get('fw-token');
  if (!repo || !token) { $('#dlg-settings').showModal(); throw new Error('Conecte ao GitHub primeiro.'); }
  const url = `https://api.github.com/repos/${repo}/contents/docs/data/searches.json`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  const cur = await fetch(url, { headers });
  if (!cur.ok) throw new Error(`GitHub respondeu ${cur.status} ao ler as buscas.`);
  const file = await cur.json();
  const next = mutate(JSON.parse(unb64(file.content)));
  const put = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ message: 'buscas: atualizado pelo site', content: b64(JSON.stringify(next, null, 2) + '\n'), sha: file.sha }) });
  if (!put.ok) throw new Error(`GitHub respondeu ${put.status} ao salvar.`);
  state.searches = next;
  render();
}

async function removeSearch(id) {
  if (!confirm('Remover esta busca?')) return;
  try { await ghEditSearches((list) => list.filter((s) => s.id !== id)); } catch (e) { alert(e.message); }
}

function setupAddDialog() {
  const boxes = $('#source-boxes');
  for (const src of state.meta.sources?.length ? state.meta.sources : [{ id: 'google', name: 'Google Flights' }]) {
    boxes.append(h('label', {}, h('input', { type: 'checkbox', name: 'src', value: src.id, checked: src.id === 'google' }), src.name));
  }
  $('#btn-add').addEventListener('click', () => { $('#add-msg').textContent = ''; $('#dlg-add').showModal(); });
  $('#add-cancel').addEventListener('click', () => $('#dlg-add').close());
  $('#form-add').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const msg = $('#add-msg');
    const origin = String(f.get('origin')).toUpperCase().trim(), destination = String(f.get('destination')).toUpperCase().trim();
    const sources = f.getAll('src');
    const err = !/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) ? 'Use códigos IATA de 3 letras (ex.: GRU, GIG, SSA).'
      : origin === destination ? 'Origem e destino são iguais.'
      : f.get('return') && f.get('return') < f.get('depart') ? 'A volta é antes da ida.'
      : !sources.length ? 'Escolha ao menos uma fonte.' : '';
    msg.className = 'hint err';
    if (err) { msg.textContent = err; return; }
    const id = `${origin}-${destination}-${f.get('depart')}${f.get('return') ? '-' + f.get('return') : ''}`.toLowerCase();
    const entry = { id, label: String(f.get('label') || '').trim() || `${origin} → ${destination}`, origin, destination, depart: f.get('depart'), return: f.get('return') || null, sources, intervalMinutes: Number(f.get('intervalMinutes')), targetPrice: f.get('targetPrice') ? Number(f.get('targetPrice')) : null, active: true };
    try {
      await ghEditSearches((list) => (list.some((s) => s.id === id) ? list : [...list, entry]));
      $('#dlg-add').close(); ev.target.reset();
    } catch (e) { msg.textContent = e.message; }
  });
}

function setupSettings() {
  $('#btn-settings').addEventListener('click', () => { $('#s-repo').value = guessRepo(); $('#s-token').value = store.get('fw-token'); $('#dlg-settings').showModal(); });
  $('#set-cancel').addEventListener('click', () => $('#dlg-settings').close());
  $('#set-save').addEventListener('click', () => { store.set('fw-repo', $('#s-repo').value.trim()); store.set('fw-token', $('#s-token').value.trim()); $('#dlg-settings').close(); });
}

$('#f-source').addEventListener('change', (e) => { state.fSource = e.target.value; renderSearches(); });
$('#f-airline').addEventListener('change', (e) => { state.fAirline = e.target.value; renderSearches(); });

await loadAll();
setupAddDialog();
setupSettings();
