# f1-fantasy-live-score

Live data scraping service for F1 Fantasy. Scrapes real-time driver and constructor scoring data from [f1fantasytools.com/live](https://f1fantasytools.com/live) every 30 seconds and uploads it to Azure Blob Storage.

## Architecture

```
index.js → pollingLoop (every 30s)
             ├── scraperService   → Puppeteer → f1fantasytools.com/live
             ├── azureBlobService → Azure Blob → f1-live-score-latest.json
             └── telegramService  → Telegram notifications (log + error channels)
```

- **New browser per cycle** — Puppeteer launches and closes on each 30s cycle to prevent memory leaks
- **One-at-a-time guard** — skips a cycle if the previous one is still running
- **Error resilient** — individual cycle failures are logged and notified but never crash the service
- **Consecutive failure escalation** — 5+ failures in a row trigger a critical Telegram alert

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in values
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the service:
   ```bash
   npm start
   ```

## Environment Variables

| Variable                          | Required | Description                             |
| --------------------------------- | -------- | --------------------------------------- |
| `AZURE_STORAGE_CONNECTION_STRING` | ✅       | Azure Storage connection string         |
| `AZURE_STORAGE_CONTAINER_NAME`    | ✅       | Blob container name                     |
| `TELEGRAM_BOT_TOKEN`              | ✅       | Telegram bot token                      |
| `TELEGRAM_LOG_CHANNEL_ID`         | ✅       | Telegram log channel ID                 |
| `TELEGRAM_ERRORS_CHANNEL_ID`      | ✅       | Telegram errors channel ID              |
| `POLLING_INTERVAL_MS`             | ❌       | Polling interval in ms (default: 30000) |

## Output Schema

```json
{
  "extractedAt": "2026-03-25T14:30:00.000Z",
  "drivers": {
    "VER": {
      "TotalPoints": 45.5,
      "PriceChange": 0.2,
      "Sprint": {},
      "Qualifying": {},
      "Race": {}
    }
  },
  "constructors": {
    "RBR": {
      "TotalPoints": 60,
      "PriceChange": 0.5,
      "Sprint": {},
      "Qualifying": {},
      "Race": {}
    }
  }
}
```

## Docker

```bash
docker build -t f1-fantasy-live-score .
docker run --env-file .env f1-fantasy-live-score
```

## Part of the F1 Fantasy Ecosystem

- **f1-fantasy-scraper** — Scrapes simulation data from team calculator
- **f1-fantasy-live-score** — This service (live scoring data)
- **f1-fantasy-next-race-info** — Next race schedule info
- **f1-fantazy-bot** — Telegram bot that consumes all data
