'use strict';

require('dotenv').config();

// Config validation runs on require — will throw if env vars are missing
const config = require('./src/config');
const { startPolling, stop } = require('./src/pollingLoop');
const telegramService = require('./src/telegramService');

let pollingHandle; // eslint-disable-line no-unused-vars

async function main() {
  console.log(
    `f1-fantasy-live-score starting (interval: ${config.polling.intervalMs}ms)`,
  );

  await telegramService.notifyStartup();

  pollingHandle = startPolling();
}

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);

  try {
    await stop();
    await telegramService.notifyShutdown();
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }

  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);

  try {
    await telegramService.sendErrorMessage(
      `🚨 *Uncaught Exception*\n${error.message}\nService is crashing.`,
    );
  } catch (telegramError) {
    console.error('Failed to send crash notification:', telegramError.message);
  }

  process.exit(1);
});

main().catch(async (error) => {
  console.error('Fatal startup error:', error.message);

  try {
    await telegramService.notifyError(error);
  } catch (telegramError) {
    console.error(
      'Failed to send startup error notification:',
      telegramError.message,
    );
  }

  process.exit(1);
});
