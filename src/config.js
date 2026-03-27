'use strict';

const requiredVars = [
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_STORAGE_CONTAINER_NAME',
  'TELEGRAM_BOT_TOKEN',
];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
}

const config = {
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
    blobName: 'f1-live-score-latest.json',
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    logChannelId: '-1002298860617',
    errorsChannelId: '-5167373779',
  },
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS, 10) || 30000,
  },
  scraper: {
    targetUrl: 'https://f1fantasytools.com/live',
    navigationTimeout: 45000,
    selectorTimeout: 15000,
  },
};

module.exports = config;
