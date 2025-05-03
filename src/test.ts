import { firefox, Browser } from 'playwright';

interface AuthorDetails {
  name: string;
  profileUrl: string;
  articleTitle: string;
  articleClaps: string;
  linkedInUrl: string;
  articleUrl: string;
}

async function getArticleClaps(browser: Browser, articleUrl: string): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.goto(articleUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('div.pw-multi-vote-count', { timeout: 30000 });

    await page.waitForTimeout(3000);
    const claps = await page.$eval(
      'div.pw-multi-vote-count button',
      el => el.textContent?.trim() || '0'
    );
    return claps;
  } catch (err) {
    console.error(`Failed to get claps for ${articleUrl}:`, err);
    return '0';
  } finally {
    await page.close();
  }
}

async function scrapeMediumAuthors(maxAuthors = 50): Promise<AuthorDetails[]> {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage();
  const authors: AuthorDetails[] = [];
  let scrolls = 0;

  try {
    await page.goto(
      'https://medium.com/tag/artificial-intelligence/recommended',
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    await page.waitForSelector('article', { timeout: 30000 });

    while (authors.length < maxAuthors && scrolls < 15) {
      const newEntries = await page.$$eval('article', articles =>
        articles.map(article => {
          const authorLink = article.querySelector('a[href^="/@"]');
          const name = authorLink?.textContent?.trim() || '';
          const rawProfile = authorLink?.getAttribute('href')?.split('?')[0] || '';
          const profileUrl = rawProfile.startsWith('http')
            ? rawProfile
            : `https://medium.com${rawProfile}`;

          const titleEl = article.querySelector('h2, h3');
          const articleTitle = titleEl?.textContent?.trim() || '';
          const rawArticleUrl = titleEl?.parentElement?.getAttribute('href')?.split('?')[0] || '';
          const articleUrl = rawArticleUrl.startsWith('http')
            ? rawArticleUrl
            : `https://medium.com${rawArticleUrl}`;

          return { name, profileUrl, articleTitle, articleUrl };
        })
      );

      for (const entry of newEntries) {
        if (
          entry.name && entry.profileUrl && entry.articleTitle &&
          !authors.find(a => a.profileUrl === entry.profileUrl && a.articleUrl === entry.articleUrl)
        ) {
          const claps = await getArticleClaps(browser, entry.articleUrl);
          authors.push({
            name: entry.name,
            profileUrl: entry.profileUrl,
            articleTitle: entry.articleTitle,
            articleClaps: claps,
            linkedInUrl: '', // TODO: add LinkedIn scraping if required
            articleUrl: entry.articleUrl,
          });

          if (authors.length >= maxAuthors) break;
        }
      }

      console.log(`Collected ${authors.length}/${maxAuthors} authors so far…`);

      if (authors.length >= maxAuthors) break;

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(3000);
      await page.waitForSelector('article:last-child', { timeout: 5000 });
      scrolls++;
    }

    console.log('Done. Total authors:', authors.length);
    return authors.slice(0, maxAuthors);
  } catch (err) {
    console.error('Scraping error:', err);
    return authors;
  } finally {
    await page.close();
    await browser.close();
  }
}

(async () => {
  const authors = await scrapeMediumAuthors(5)
  console.log('Sample output:', authors.slice(0, 5));
})();
