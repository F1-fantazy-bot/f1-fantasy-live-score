
## Learnings

- **scraperService.js** is the core scraping module at `src/scraperService.js`. It launches a fresh browser per call (ADR-011), blocks heavy resources, and extracts driver/constructor data via `page.evaluate`.
- The target site (`f1fantasytools.com/live`) renders table rows via client-side JS — `waitUntil: 'networkidle2'` is required, not `'domcontentloaded'`.
- Since stylesheets are blocked for performance, `visible: true` in `waitForSelector` is unreliable — CSS-based visibility checks fail without styles. Use DOM-only presence checks.
- User-Agent must be a full realistic Chrome string to avoid bot detection on the target site.
- Key config values (`navigationTimeout`, `selectorTimeout`, `targetUrl`) live in `src/config.js` under `config.scraper`.
- **Blocking stylesheets kills rendering on f1fantasytools.com** — the site's JS framework (likely React/Vue/Angular) depends on CSS to complete its rendering pipeline. Blocking `stylesheet` requests causes `tbody tr` to never appear. Only block `image` and `font`.
- **Anti-bot: `navigator.webdriver` override** — use `page.evaluateOnNewDocument()` to set `navigator.webdriver` to `undefined` before navigation. This prevents basic headless-Chrome detection. Must be called before `page.goto()`.
- Created `temp/diagnose-scraper.js` as a 3-pass diagnostic tool: baseline (no blocking), current config (block CSS+img+font), and proposed fix (block img+font). Useful for future scraping issues.
