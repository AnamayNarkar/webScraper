# Medium-LinkedIn Author Scraper

A TypeScript application that scrapes Medium articles and authors in the Artificial Intelligence category, extracts article metrics, and finds their LinkedIn profiles.

## Project Overview

This tool helps you:
- Collect data on Medium authors writing about AI
- Extract article titles and clap counts
- Find corresponding LinkedIn profiles for networking opportunities
- Store all data in a JSON file for further analysis

## Technologies Used

- **TypeScript**: Type-safe code implementation
- **Playwright**: Web automation and scraping

## Prerequisites

- Node.js
- npm or yarn

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/AnamayNarkar/webScraper.git
   cd mediumlinkedin
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Configuration

By default, the application:
- Scrapes the "Artificial Intelligence" tag on Medium
- Collects data for 3 authors due to rate limitation constraints
- Uses webkit browser in headless mode

You can modify these settings in `src/index.ts` and `src/services/medium.ts`.

## Usage

Run the application with:

```
npm start
```

This will:
1. Compile the TypeScript code
2. Launch the scraper
3. Save the results to `authors.json` in the project root

## Output Format

The application generates an `authors.json` file with this structure:

```json
[
  {
    "name": "Author Name",
    "profileUrl": "https://medium.com/@author",
    "articleTitle": "Title of the article",
    "articleClaps": "123",
    "linkedInUrl": "https://linkedin.com/in/author",
    "articleUrl": "https://medium.com/article-path"
  },
]
```

## Implementation Details

- Uses randomized browser context to avoid detection
- Implements random delays to simulate human behavior
- Searches for LinkedIn profiles using author names + keywords
- Processes authors concurrently for better performance
- Handles pagination by scrolling on Medium

## Limitations

- Rate limiting may occur with excessive use
