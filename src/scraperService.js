'use strict';

const puppeteer = require('puppeteer');
const config = require('./config');
const { getExtractionFunctions } = require('./extractionFunctions');

/** @type {import('puppeteer').Browser | null} */
let _browser = null;

/** @type {import('puppeteer').Page | null} */
let _page = null;

const LAUNCH_ARGS = [
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--memory-pressure-off',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--max_old_space_size=512',
];

/**
 * Configure a fresh page with resource blocking, viewport, user-agent,
 * and anti-bot measures.
 * @param {import('puppeteer').Page} page
 */
async function configurePage(page) {
  // Block images and fonts to reduce memory (keep stylesheets — the JS
  // framework on f1fantasytools.com needs CSS to complete rendering)
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (['image', 'font'].includes(r.resourceType())) r.abort();
    else r.continue();
  });

  await page.setViewport({ width: 1024, height: 768 });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  );

  // Mask headless Chrome's webdriver flag to avoid bot detection
  // eslint-disable-next-line no-undef
  await page.evaluateOnNewDocument(() => {
    // eslint-disable-next-line no-undef
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
}

/**
 * Launch the persistent Puppeteer browser and create a reusable page.
 * Safe to call multiple times — only launches if no browser is connected.
 */
async function initBrowser() {
  if (_browser && _browser.isConnected()) {
    return;
  }

  // Clean up any stale references
  _page = null;
  _browser = null;

  _browser = await puppeteer.launch({
    headless: 'new',
    args: LAUNCH_ARGS,
  });

  _page = await _browser.newPage();
  await configurePage(_page);

  console.log('Persistent browser launched');
}

/**
 * Ensure the browser and page are alive. If the browser disconnected or
 * the page was closed, re-initialize silently.
 * @returns {import('puppeteer').Page} The ready-to-use page.
 */
async function ensureBrowser() {
  if (!_browser || !_browser.isConnected()) {
    console.warn('Browser not connected — reopening');
    await initBrowser();
  }

  if (!_page || _page.isClosed()) {
    console.warn('Page closed — creating new page');
    _page = await _browser.newPage();
    await configurePage(_page);
  }

  return _page;
}

/**
 * Navigate to the live score page using the persistent browser,
 * extract driver and constructor data, and return the result.
 * The browser stays open between calls for efficiency.
 */
async function scrapeLiveScoreData() {
  const page = await ensureBrowser();

  await page.goto(config.scraper.targetUrl, {
    waitUntil: 'networkidle2',
    timeout: config.scraper.navigationTimeout,
  });

  // Wait for table rows to appear on the live page
  await page.waitForSelector('tbody tr', {
    timeout: config.scraper.selectorTimeout,
  });

  const { extractDriverData, extractConstructorData } =
    getExtractionFunctions();

  // Run extraction functions in the browser context via eval string
  const result = await page.evaluate(`
    const extractDriverData = ${extractDriverData};
    const extractConstructorData = ${extractConstructorData};
    ({
      drivers: extractDriverData(),
      constructors: extractConstructorData(),
    })
  `);

  return {
    extractedAt: new Date().toISOString(),
    drivers: result.drivers,
    constructors: result.constructors,
  };
}

/**
 * Gracefully close the persistent browser. Safe to call even if the
 * browser is already closed or was never opened.
 */
async function closeBrowser() {
  if (_page) {
    await _page.close().catch(() => {});
    _page = null;
  }

  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }

  console.log('Persistent browser closed');
}

module.exports = { initBrowser, closeBrowser, scrapeLiveScoreData };
