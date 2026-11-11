# Radar de Passagens

Monitora preços de passagens aéreas a cada 15 minutos (GitHub Actions), guarda o histórico e mostra tudo num site grátis (GitHub Pages). Destaca **metas atingidas** e **ofertas relâmpago** (preço 20% ou mais abaixo da mediana histórica da rota).

## Fontes

| Fonte | Status | Observação |
|---|---|---|
| Google Flights | ✅ funciona | Já lista voos e preços de Latam, Gol, Azul e outras. Use o filtro "Companhia" no site. |
| Travelpayouts (Aviasales) | ⚙ precisa de token | API oficial gratuita, preços de várias agências. Cadastro em travelpayouts.com → guarde o token em `TRAVELPAYOUTS_TOKEN`. |
| Latam (site), Decolar, Kayak | ⛔ bloqueiam robôs | Testado: "Access Denied", 403 e "você é um bot". O projeto **não contorna** essas verificações. |

Se uma fonte falhar, o painel de saúde no topo do site mostra o motivo, e as outras continuam funcionando.

## Publicar (uma vez só)

1. Crie um repositório no GitHub (ex.: `flight-watcher`) e envie esta pasta.
2. **Settings → Pages**: Source "Deploy from a branch", branch `main`, pasta `/docs`.
3. **Settings → Actions → General → Workflow permissions**: "Read and write permissions".
4. (Opcional) **Settings → Secrets → Actions**: `TRAVELPAYOUTS_TOKEN`.
5. Aba **Actions → Coletar preços → Run workflow** (marque "force") para a primeira coleta.

## Usar

- Site: `https://SEU_USUARIO.github.io/flight-watcher/`
- **+ Nova busca**: digite o nome da cidade (ex.: "miami", "nova york", "lisboa") e escolha na lista; datas, preço-alvo, fontes e intervalo (15 min a 1 dia).
- Para criar/remover buscas pelo site: **Conectar ao GitHub** e cole um token fine-grained (só este repositório, **Contents: Read and write**). Fica só no seu navegador.
- Ou edite `docs/data/searches.json` direto no GitHub.

## Desenvolvimento

```bash
npm install && npx playwright install chromium
npm test                 # testes
FORCE=1 node src/run.js  # coleta real agora
```

Limites: o GitHub pode atrasar o cron em alguns minutos; o intervalo mínimo é 15 min. Os preços do Google Flights são de ida e volta quando há data de volta.
