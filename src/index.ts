import { Browser, BrowserContext, ElementHandle, Page,firefox, webkit } from 'playwright';

interface AuthorDetails {
  name: string;
  profileUrl: string;
  articleTitle: string;
  articleClaps: string;
  linkedInUrl: string;
  articleUrl: string;
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:102.0) Gecko/20100101 Firefox/102.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 }
  ];
  return viewports[Math.floor(Math.random() * viewports.length)];
}

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
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
  // await context.setViewportSize(viewport);

  return context;
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function getArticleClaps(browser: Browser, articleUrl: string): Promise<string> {

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

async function getLinkedInUrl(browser: Browser, profileUrl: string): Promise<string> {

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

async function scrapeMediumAuthors(maxAuthors = 50): Promise<AuthorDetails[]> {
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

(async (): Promise<void> => {
  try {
    const authors = await scrapeMediumAuthors(3);
    console.log('Final results:', JSON.stringify(authors));
  } catch (error) {
    console.error('Runtime error:', error);
  }
})();