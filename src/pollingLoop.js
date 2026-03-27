'use strict';

const {
  initBrowser,
  closeBrowser,
  scrapeLiveScoreData,
} = require('./scraperService');
const { uploadLiveScore } = require('./azureBlobService');
const telegramService = require('./telegramService');
const config = require('./config');

let intervalId = null;
let cycleRunning = false;
let cycleCount = 0;
let consecutiveFailures = 0;
const ESCALATION_THRESHOLD = 5;

/**
 * Execute a single scrape → validate → upload cycle.
 * Uses the persistent browser managed by scraperService.
 */
async function executeCycle() {
  if (cycleRunning) {
    console.warn('Previous cycle still running, skipping');
    return;
  }

  cycleRunning = true;
  cycleCount++;
  const cycleNum = cycleCount;
  const start = Date.now();

  try {
    const data = await scrapeLiveScoreData();

    // Validate extracted data
    const driverCount = Object.keys(data.drivers || {}).length;
    const constructorCount = Object.keys(data.constructors || {}).length;

    if (driverCount === 0 && constructorCount === 0) {
      throw new Error('Extraction returned no drivers and no constructors');
    }

    await uploadLiveScore(data);

    const elapsed = Date.now() - start;
    console.log(
      `[CYCLE #${cycleNum}] Completed in ${elapsed}ms | Drivers: ${driverCount} | Constructors: ${constructorCount}`,
    );

    consecutiveFailures = 0;
  } catch (error) {
    consecutiveFailures++;
    const elapsed = Date.now() - start;
    console.error(
      `[CYCLE #${cycleNum}] Failed in ${elapsed}ms:`,
      error.message,
    );

    try {
      if (consecutiveFailures >= ESCALATION_THRESHOLD) {
        await telegramService.sendErrorMessage(
          `🚨 *Live Score CRITICAL*\n${consecutiveFailures} consecutive cycle failures!\nLast error: ${error.message}\nService may need manual restart.`,
        );
      } else {
        await telegramService.notifyError(error);
      }
    } catch (telegramError) {
      console.error(
        'Failed to send error notification:',
        telegramError.message,
      );
    }
  } finally {
    cycleRunning = false;
  }
}

/**
 * Start the polling loop. Launches the persistent browser, runs one
 * immediate cycle, then schedules subsequent cycles at the configured interval.
 * @returns {Promise<{ stop: () => Promise<void> }>} Handle to stop the loop gracefully.
 */
async function startPolling() {
  console.log(
    `Starting polling loop (interval: ${config.polling.intervalMs}ms)`,
  );

  await initBrowser();

  // Run first cycle immediately
  executeCycle();

  intervalId = setInterval(executeCycle, config.polling.intervalMs);

  return { stop };
}

/**
 * Gracefully stop the polling loop.
 * Clears the interval, waits for any in-flight cycle, then closes the browser.
 */
async function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  // Wait for current cycle to finish
  await new Promise((resolve) => {
    const waitForCycle = () => {
      if (!cycleRunning) {
        resolve();
      } else {
        setTimeout(waitForCycle, 200);
      }
    };

    waitForCycle();
  });

  await closeBrowser();
}

module.exports = { startPolling, stop };
