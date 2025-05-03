import { Browser, webkit } from 'playwright';
import { AuthorDetails } from '../types/index.js';
import { createStealthContext } from '../utils/browser.js';
import { delay } from '../utils/common.js';
import { getLinkedInUrl } from './linkedin.js';

export async function getArticleClaps(browser: Browser, articleUrl: string): Promise<string> {
  await delay(Math.random() * 3000 + 2000);

  const context = await createStealthContext(browser);
  const page = await context.newPage();
  try {
    await page.goto(articleUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('div.pw-multi-vote-count button', { timeout: 30000 });
    await delay(1000);
    return await page.$eval(
      'div.pw-multi-vote-count button',
      (el: HTMLElement) => el.textContent?.trim() || '0'
    );
  } finally {
    await page.close();
  }
}

export async function scrapeMediumAuthors(maxAuthors = 50): Promise<AuthorDetails[]> {
  const browser = await webkit.launch({ headless: true });
  const CONCURRENCY = 3;

  try {
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    const authors: AuthorDetails[] = [];
    let scrolls = 0;

    await page.goto('https://medium.com/tag/artificial-intelligence/recommended', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    while (authors.length < maxAuthors && scrolls < 15) {
      const newEntries = await page.$$eval('article', (articles: Element[]) => 
        articles.map((article: Element) => {
          const authorLink = article.querySelector('a[href^="/@"]');
          const titleEl = article.querySelector('h2, h3');
          return {
            name: authorLink?.textContent?.trim() || '',
            profileUrl: authorLink?.getAttribute('href')?.split('?')[0] || '',
            articleTitle: titleEl?.textContent?.trim() || '',
            articleUrl: titleEl?.parentElement?.getAttribute('href')?.split('?')[0] || ''
          };
        })
      );

      const validEntries = newEntries
        .map(entry => ({
          ...entry,
          profileUrl: entry.profileUrl.startsWith('http') 
            ? entry.profileUrl 
            : `https://medium.com${entry.profileUrl}`,
          articleUrl: entry.articleUrl.startsWith('http')
            ? entry.articleUrl
            : `https://medium.com${entry.articleUrl}`
        }))
        .filter(entry => 
          entry.name && 
          entry.profileUrl && 
          entry.articleTitle &&
          !authors.some(a => a.articleUrl === entry.articleUrl)
        )
        .slice(0, maxAuthors - authors.length);

      const results = await Promise.allSettled(
        validEntries.map(async (entry: typeof validEntries[number]) => {
          try {
            const [linkedInUrl,claps] = await Promise.all([
              getLinkedInUrl(browser, entry.profileUrl),
              getArticleClaps(browser, entry.articleUrl)
            ]);
            return { ...entry, articleClaps: claps, linkedInUrl };
          } catch (error) {
            console.error(`Error processing ${entry.name}:`, error);
            return null;
          }
        })
      );

      const successfulEntries = results
        .filter((result): result is PromiseFulfilledResult<AuthorDetails> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      authors.push(...successfulEntries);
      console.log(`Processed ${successfulEntries.length} entries, total: ${authors.length}`);

      if (authors.length >= maxAuthors) break;

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await delay(3000);
      scrolls++;
    }

    return authors.slice(0, maxAuthors);
  } finally {
    await browser.close();
  }
}