'use strict';

const { BlobServiceClient } = require('@azure/storage-blob');
const config = require('./config');

/**
 * Upload live score JSON data to Azure Blob Storage.
 * Overwrites the blob every time — no deduplication (ADR-002).
 */
async function uploadLiveScore(data) {
  if (!data) {
    throw new Error('No data provided for upload');
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.azure.connectionString,
  );
  const containerClient = blobServiceClient.getContainerClient(
    config.azure.containerName,
  );
  const blockBlobClient = containerClient.getBlockBlobClient(
    config.azure.blobName,
  );

  const jsonData = JSON.stringify(data);
  await blockBlobClient.upload(jsonData, jsonData.length, {
    blobHTTPHeaders: { blobContentType: 'application/json' },
  });

  console.log(`Data uploaded successfully to ${config.azure.blobName}`);
}

module.exports = { uploadLiveScore };
