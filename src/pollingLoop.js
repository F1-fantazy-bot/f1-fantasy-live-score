'use strict';

const { scrapeLiveScoreData } = require('./scraperService');
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
 * Start the polling loop. Runs one immediate cycle, then schedules
 * subsequent cycles at the configured interval.
 * @returns {{ stop: () => Promise<void> }} Handle to stop the loop gracefully.
 */
function startPolling() {
  console.log(
    `Starting polling loop (interval: ${config.polling.intervalMs}ms)`,
  );

  // Run first cycle immediately
  executeCycle();

  intervalId = setInterval(executeCycle, config.polling.intervalMs);

  return { stop };
}

/**
 * Gracefully stop the polling loop.
 * Clears the interval and waits for any in-flight cycle to finish.
 */
function stop() {
  return new Promise((resolve) => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // Wait for current cycle to finish
    const waitForCycle = () => {
      if (!cycleRunning) {
        resolve();
      } else {
        setTimeout(waitForCycle, 200);
      }
    };

    waitForCycle();
  });
}

module.exports = { startPolling, stop };
