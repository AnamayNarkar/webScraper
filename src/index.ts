import { firefox } from 'playwright';

(async () => {
    const browser = await firefox.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://medium.com/tag/artificial-intelligence/recommended', {
        waitUntil: 'networkidle',
        timeout: 60000
    });

    console.log('Page loaded, waiting for SVGs to render...');

    console.log('Waiting for SVGs to load...');
    page.waitForTimeout(10000); // Wait for 5 seconds to allow SVGs to load
    console.log('SVGs should be loaded now.');

    // Wait until at least one clap SVG loads
    await page.waitForFunction(() => {
        return Array.from(document.querySelectorAll('svg[viewBox="0 0 16 16"] path[fill="#6B6B6B"]'))
            .some(path => path.getAttribute('d')?.startsWith('m3.672 10.167'));
    }, { timeout: 10000 });

    // Evaluate and extract first visible clap count
    const clapCount = await page.evaluate(() => {
        const path = Array.from(document.querySelectorAll('svg[viewBox="0 0 16 16"] path[fill="#6B6B6B"]'))
            .find(p => p.getAttribute('d')?.startsWith('m3.672 10.167'));
        if (path) {
            const span = path.closest('span')?.nextElementSibling;
            return span?.textContent?.trim() || 'manish';
        }
        return 'not found';
    });

    console.log(`Clap count: ${clapCount}`);

    await browser.close();
})();
