# Flight Watcher Implementation Plan

**Goal:** Monitorar preços de passagens aéreas (Google Flights, Latam, Decolar, Kayak etc.), com site gratuito para cadastrar buscas e ver histórico/ofertas relâmpago.

**Architecture:** GitHub Actions roda `src/run.js` a cada 15 min. O coletor lê `docs/data/searches.json`, executa só as buscas "vencidas" (cada uma tem seu intervalo) em cada fonte escolhida, grava `docs/data/prices.json` (histórico) e `docs/data/status.json` (saúde por fonte) e faz commit. GitHub Pages serve `docs/`. O site edita `searches.json` via API do GitHub com token fine-grained guardado só no navegador.

**Tech Stack:** Node 24 (ESM), Playwright (Chromium) para fontes que bloqueiam bots, `node:test`, HTML/JS puro no site.

**Spec:** decisões da conversa de 2026-11-11 (sem Telegram por enquanto; sem Supabase, dados em JSON no repo).

## Global Constraints
- Respostas e textos da UI em português do Brasil. Moeda BRL.
- Cada fonte é um módulo `src/sources/<id>.js` exportando `{ id, name, search(page, query) }` que retorna `Offer[]`.
- Falha de uma fonte nunca derruba o coletor; vira entrada em `status.json`.
- `Offer = { source, price:number, currency:'BRL', airline:string|null, stops:number|null, depart:'YYYY-MM-DD', return:'YYYY-MM-DD'|null, url:string }`.

## Review Focus
- Fonte bloqueada (CAPTCHA/403): deve registrar `blocked`, não preço falso.
- Preço 0 ou não numérico: descartado.
- Busca sem histórico: sem oferta relâmpago (sem baseline).
- Intervalo menor que 15 min: tratado como 15.

### Task 1: Lógica pura (due, deals, history)
**Files:** `src/due.js`, `src/deals.js`, `src/history.js`, `test/*.test.js`
**Produces:** `isDue(search, lastRunISO, nowISO)->bool`; `classify(offer, history, search)->{belowTarget:bool, flash:bool, dropPct:number|null}`; `appendOffers(db, searchId, offers, nowISO)->db` (mantém 90 dias).
- [ ] testes → falham → implementar → passam → commit

### Task 2: Fontes
**Files:** `src/sources/{google,kayak,latam,decolar}.js`, `src/browser.js`, `src/probe.js`
- [ ] Sondar cada site com Playwright, escrever parser, validar contra captura real salva em `.probe/`.

### Task 3: Coletor + Workflow
**Files:** `src/run.js`, `.github/workflows/collect.yml`
- [ ] Orquestra tudo, grava JSON, commit via Actions.

### Task 4: Site
**Files:** `docs/{index.html,app.js,style.css}`
- [ ] Lista de buscas, formulário, filtro por fonte, gráfico, ofertas relâmpago, painel de saúde das fontes.
