# Project Context

- **Owner:** Doron
- **Project:** f1-fantasy-live-score — A live data scraping service for F1 Fantasy. Uses Puppeteer to extract real-time driver and constructor scoring data from f1fantasytools.com/live every 30 seconds. Stores data in Azure Storage for consumption by the Telegram bot (f1-fantazy-bot).
- **Stack:** Node.js, Puppeteer, Azure Storage (Blob/Table), Docker, Azure hosting
- **Ecosystem:** Part of the F1 Fantasy suite: f1-fantasy-scraper (data scraper), f1-fantasy-next-race-info (race info), f1-fantazy-bot (Telegram bot)
- **Created:** 2026-03-25

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-27 — Cross-Team Update: Prost's scraperService.js Fixes

**Context:** Prost resolved `waitForSelector` timeouts in the polling cycle.

**Changes that affect Hunt tests:**
- `waitUntil` changed from implicit to explicit `networkidle2`
- Removed `visible: true` from selector options  
- Full Chrome 125 User-Agent string added

**Action for Hunt:**
- Any test mocks of `page.goto()` or `page.waitForSelector()` should update their expected call options
- Selector timeouts should now pass consistently on polling cycles 2+ (after initial network load)

**Reference:** See `.squad/orchestration-log/2026-03-27T09-07-prost.md` and `.squad/decisions/decisions.md`

### 2026-03-25 — WI-11 Smoke Test / Full Validation

**Scope:** Validated all source files against the project plan and 11 ADRs.

**Lint & Format:** Both `npm run lint` and `npm run format` pass clean — zero issues.

**File-by-File Results:**

| File                                      | Status  | Notes                                                                                                                                                                                   |
| ----------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config.js`                           | ✅ PASS | All 5 required env vars validated, throws descriptive error, structured export with azure/telegram/polling/scraper sections                                                             |
| `src/telegramService.js`                  | ✅ PASS | "LIVE-SCORE:" prefix (ADR-007), all 5 methods present, swallows send failures, singleton export matches scraper pattern                                                                 |
| `src/extractionFunctions.js`              | ✅ PASS | Logic identical to temp/jsFunction.md — all cell indices, field names, data types match exactly. Driver=16 cells, Constructor=17 cells (ADR-003)                                        |
| `src/scraperService.js`                   | ✅ PASS | All 8 Chrome flags match ADR-005. New browser per cycle (ADR-011). Navigation 45s, selector 15s. Always closes in finally. Request interception, viewport, user agent all match scraper |
| `src/azureBlobService.js`                 | ✅ PASS | Uploads to 'f1-live-score-latest.json' (ADR-001). No dedup (ADR-002). Uses @azure/storage-blob. Sets content-type JSON                                                                  |
| `src/pollingLoop.js`                      | ✅ PASS | 30s default interval (ADR-004). One-at-a-time guard. Consecutive failure tracking with escalation at 5 (ADR-006). stop() returns Promise                                                |
| `index.js`                                | ✅ PASS | dotenv loaded, config validated on require, startup/shutdown Telegram notifications, SIGTERM/SIGINT/uncaughtException handlers                                                          |
| `Dockerfile`                              | ✅ PASS | IDENTICAL to f1-fantasy-scraper Dockerfile (ADR-008). ghcr.io/puppeteer/puppeteer:latest, USER root→pptruser, Chrome install as pptruser                                                |
| `.github/workflows/docker-build-push.yml` | ✅ PASS | IMAGE_NAME=f1-fantasy-live-score, OIDC auth (id-token:write), ACR=f1fantasyacr.azurecr.io                                                                                               |
| `package.json`                            | ✅ PASS | All 4 deps correct, all 5 scripts present (start/lint/lint:fix/format/prepare), CommonJS (ADR-009)                                                                                      |
| `.env.example`                            | ✅ PASS | All 5 required vars + POLLING_INTERVAL_MS optional                                                                                                                                      |
| `README.md`                               | ✅ PASS | Architecture diagram, setup instructions, env vars table, output schema, Docker instructions                                                                                            |

**ADR Compliance:**

- ADR-001 (Blob name): ✅ `f1-live-score-latest.json`
- ADR-002 (No dedup): ✅ Simple overwrite every cycle
- ADR-003 (Extraction from jsFunction.md): ✅ Logic identical
- ADR-004 (Polling loop): ✅ setInterval + one-at-a-time guard
- ADR-005 (Chrome flags): ✅ All 8 flags present
- ADR-006 (Error resilience): ✅ No retries, natural loop recovery, escalation at 5
- ADR-007 (Telegram prefix): ✅ "LIVE-SCORE:"
- ADR-008 (Dockerfile): ✅ Matches scraper exactly
- ADR-009 (CommonJS): ✅ require/module.exports throughout
- ADR-010 (Output schema): ✅ `{ extractedAt, drivers, constructors }`
- ADR-011 (New browser per cycle): ✅ Launch + close every cycle

**Scraper Cross-Reference:** Code follows f1-fantasy-scraper patterns (Puppeteer launch, request interception, viewport, user agent, Telegram notification class, Azure Blob upload, Dockerfile). Only intentional differences exist (live page extraction vs team-calculator, no dedup vs dedup).

**Bugs Found:** 0
**Issues Found:** 0
**Fixes Applied:** 0

**Verdict:** Clean pass. All 12 files validated, all 11 ADRs respected, extraction logic matches reference exactly.
