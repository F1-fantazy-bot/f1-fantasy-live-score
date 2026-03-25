'use strict';

const puppeteer = require('puppeteer');
const config = require('./config');
const { getExtractionFunctions } = require('./extractionFunctions');

/**
 * Launch headless Chrome, navigate to f1fantasytools.com/live,
 * extract driver and constructor data, and return the result.
 * A new browser is launched and closed on every call (ADR-011).
 */
async function scrapeLiveScoreData() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--memory-pressure-off',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--max_old_space_size=512',
    ],
  });

  let page;

  try {
    page = await browser.newPage();

    // Block images, fonts, and stylesheets to reduce memory usage
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      if (['image', 'font', 'stylesheet'].includes(r.resourceType())) r.abort();
      else r.continue();
    });

    await page.setViewport({ width: 1024, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Linux; x86_64) AppleWebKit/537.36');

    await page.goto(config.scraper.targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.scraper.navigationTimeout,
    });

    // Wait for table rows to appear on the live page
    await page.waitForSelector('tbody tr', {
      timeout: config.scraper.selectorTimeout,
      visible: true,
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
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }
}

module.exports = { scrapeLiveScoreData };
