# Task: Advanced Scrapper & Cache Management

- `[/]` Backend: Implement session-based scraping
    - `[ ]` Add `tough-cookie` and `axios-cookiejar-support` to `server/package.json`
    - `[ ]` Refactor `scrapperService.js` for session handling
- `[/]` Maintenance: Force cache refresh
    - `[ ]` Implement `clearMarketCache` in `marketController.js`
    - `[ ]` Add route `POST /api/market/clear-cache`
- `[ ]` Verification
    - `[ ]` Run quality tests
    - `[ ]` Deploy and test with real query
