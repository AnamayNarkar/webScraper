import { Browser, BrowserContext } from 'playwright';
import { getRandomUserAgent, getRandomViewport } from './common.js';

export async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  const viewport = getRandomViewport();
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  });

  await context.addCookies([]);
  await context.setExtraHTTPHeaders({
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'en-US,en;q=0.9'
  });

  return context;
}