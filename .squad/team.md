# Squad Team

> f1-fantasy-live-score — Live F1 Fantasy scoring data extraction service

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Senna | Lead/PM | `.squad/agents/senna/charter.md` | 🏗️ Active |
| Prost | Backend Dev | `.squad/agents/prost/charter.md` | 🔧 Active |
| Lauda | DevOps/Infra | `.squad/agents/lauda/charter.md` | ⚙️ Active |
| Hunt | Tester | `.squad/agents/hunt/charter.md` | 🧪 Active |
| Scribe | Session Logger | `.squad/agents/scribe/charter.md` | 📋 Active |
| Ralph | Work Monitor | — | 🔄 Monitor |

## Project Context

- **Owner:** Doron
- **Project:** f1-fantasy-live-score — A live data scraping service using Puppeteer to extract real-time F1 Fantasy scoring data from f1fantasytools.com/live every 30 seconds. Stores data in Azure Storage for the Telegram bot (f1-fantazy-bot).
- **Stack:** Node.js, Puppeteer, Azure Storage (Blob/Table), Docker, Azure hosting
- **Ecosystem:** f1-fantasy-scraper, f1-fantasy-next-race-info, f1-fantazy-bot (all in ~/homeCode/f1/)
- **Cast Universe:** F1 Legends
- **Created:** 2026-03-25
