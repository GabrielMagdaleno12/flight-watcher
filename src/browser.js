import { chromium } from 'playwright';

// Navegador comum, sem disfarce: se um site bloquear, a fonte é marcada como "blocked".
export async function launch({ headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1366, height: 900 },
  });
  return { browser, context };
}
