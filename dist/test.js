import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
// Utility delay function that doesn't depend on page context
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function getArticleClaps(browser, articleUrl) {
    const page = await browser.newPage();
    try {
        await page.goto(articleUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('div.pw-multi-vote-count', { timeout: 30000 });
        // Use utility delay instead of page.waitForTimeout
        await delay(3000);
        return await page.$eval('div.pw-multi-vote-count button', el => el.textContent?.trim() || '0');
    }
    catch (err) {
        console.error(`Failed to get claps for ${articleUrl}:`, err);
        return '0';
    }
    finally {
        await page.close();
    }
}
async function getLinkedInUrl(browser, profileUrl) {
    const page = await browser.newPage();
    try {
        // Add random delay before starting
        await delay(Math.random() * 3000 + 2000);
        // Set realistic headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });
        const nameOfAuthor = profileUrl.split('@')[1]?.split('/')[0] || '';
        if (!nameOfAuthor)
            return '';
        const searchUrl = `https://www.duckduckgo.com/search?q=${encodeURIComponent(`${nameOfAuthor} artificial intelligence AI linkedin profile site:linkedin.com/in/`)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Handle consent dialog
        await page.click('button:has-text("Accept all")').catch(() => { });
        // Get first LinkedIn result
        const linkedinUrl = await page.$eval('a[href*="linkedin.com/in/"]', (el) => {
            const url = new URL(el.href);
            return url.searchParams.get('url') || url.href;
        }).catch(() => '');
        // Normalize URL format
        return linkedinUrl
            .replace(/^(https?:\/\/)nl\./, '$1www.')
            .split('?')[0]
            .replace('/pub', '/in');
    }
    catch (err) {
        console.error(`LinkedIn lookup failed for ${profileUrl}:`, err);
        return '';
    }
    finally {
        await page.close();
        // Add random delay between requests
        await delay(Math.random() * 5000 + 2000);
    }
}
async function scrapeMediumAuthors(maxAuthors = 50) {
    chromium.use(StealthPlugin());
    const browser = await chromium.launch({ headless: false });
    try {
        const page = await browser.newPage();
        const authors = [];
        let scrolls = 0;
        await page.goto('https://medium.com/tag/artificial-intelligence/recommended', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('article', { timeout: 30000 });
        while (authors.length < maxAuthors && scrolls < 15) {
            const newEntries = await page.$$eval('article', articles => articles.map(article => {
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
            }));
            for (const entry of newEntries) {
                if (authors.length >= maxAuthors)
                    break;
                if (!entry.name || !entry.profileUrl || !entry.articleTitle)
                    continue;
                try {
                    const [claps, linkedInUrl] = await Promise.all([
                        getArticleClaps(browser, entry.articleUrl),
                        getLinkedInUrl(browser, entry.profileUrl)
                    ]);
                    authors.push({
                        ...entry,
                        articleClaps: claps,
                        linkedInUrl
                    });
                    console.log(`Added author ${authors.length}/${maxAuthors}: ${entry.name}`);
                }
                catch (err) {
                    console.error(`Failed to process entry: ${entry.name}`, err);
                }
            }
            // Scroll handling
            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
            await delay(3000);
            scrolls++;
        }
        return authors.slice(0, maxAuthors);
    }
    finally {
        await browser.close();
    }
}
(async () => {
    try {
        const authors = await scrapeMediumAuthors(1);
        console.log('Scraping complete!');
        console.log('Results:', JSON.stringify(authors, null, 2));
    }
    catch (error) {
        console.error('Main execution error:', error);
    }
})();
