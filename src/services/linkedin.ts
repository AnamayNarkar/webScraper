import { Browser } from 'playwright';
import { createStealthContext } from '../utils/browser.js';
import { delay } from '../utils/common.js';

export async function getLinkedInUrl(browser: Browser, profileUrl: string): Promise<string> {
  await delay(Math.random() * 3000 + 2000);

  const context = await createStealthContext(browser);
  const page = await context.newPage();
  try {
    await delay(Math.random() * 3000 + 2000);

    const nameOfAuthor = profileUrl.split('@')[1]?.split('/')[0] || '';
    if (!nameOfAuthor) return '';

    const searchUrl = `https://www.duckduckgo.com/search?q=${encodeURIComponent(
      `${nameOfAuthor} AI artificial intelligence software engineering linkedin profile site:linkedin.com/in/`
    )}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.click('button:has-text("Accept all")').catch(() => {});

    const linkedinUrl = await page.$eval(
      'a[href*="linkedin.com/in/"]',
      (el: HTMLAnchorElement) => new URL(el.href).searchParams.get('url') || el.href
    ).catch(() => '');

    return linkedinUrl
      .replace(/^(https?:\/\/)nl\./, '$1www.')
      .split('?')[0]
      .replace('/pub', '/in');
  } finally {
    await page.close();
  }
}