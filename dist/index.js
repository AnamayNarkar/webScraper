import { scrapeMediumAuthors } from './services/medium.js';
import { writeFile } from 'fs/promises';
import path from 'path';
(async () => {
    try {
        const authors = await scrapeMediumAuthors(3);
        console.log('Scraped authors data successfully!');
        // Save authors data to authors.json file
        const authorsJsonPath = path.resolve(process.cwd(), 'authors.json');
        await writeFile(authorsJsonPath, JSON.stringify(authors, null, 2), 'utf8');
        console.log(`Authors data successfully written to ${authorsJsonPath}`);
    }
    catch (error) {
        console.error('Runtime error:', error);
    }
})();
