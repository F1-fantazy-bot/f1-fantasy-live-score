# Project Context

- **Owner:** Doron
- **Project:** f1-fantasy-live-score — A live data scraping service for F1 Fantasy. Uses Puppeteer to extract real-time driver and constructor scoring data from f1fantasytools.com/live every 30 seconds. Stores data in Azure Storage for consumption by the Telegram bot (f1-fantazy-bot).
- **Stack:** Node.js, Puppeteer, Azure Storage (Blob/Table), Docker, Azure hosting
- **Ecosystem:** Part of the F1 Fantasy suite: f1-fantasy-scraper (data scraper), f1-fantasy-next-race-info (race info), f1-fantazy-bot (Telegram bot)
- **Created:** 2026-03-25

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-27 — Cross-Team Update: Prost's scraperService.js Fixes

**Context:** Prost resolved `waitForSelector` timeouts in the polling cycle with three changes.

**Changes affecting Lauda's Docker/CI considerations:**
- `waitUntil` now waits for `networkidle2` instead of domcontentloaded
- Navigation timeout remains 45 seconds (sufficient for network settle)
- Full Chrome 125 User-Agent string prevents bot detection

**Docker timing impact:**
- First cycle may take slightly longer due to network wait, but acceptable within 30-second polling window
- Network waits ensure reliable data extraction, correct behavior for JS-rendered sites
- Container startup latency unaffected (changes only affect page navigation within cycle)

**Reference:** See `.squad/orchestration-log/2026-03-27T09-07-prost.md` and `.squad/decisions/decisions.md`

### 2026-03-25 — WI-9 & WI-10: Docker + CI/CD Infrastructure

**What was done:**

- Created `Dockerfile` — exact clone of f1-fantasy-scraper pattern (ghcr.io/puppeteer/puppeteer:latest, root→install→copy→pptruser→chrome→CMD)
- Created `.dockerignore` — excludes node_modules, .git, .github, .squad, .env, temp, etc.
- Created `.github/workflows/docker-build-push.yml` — builds and pushes to f1fantasyacr.azurecr.io/f1-fantasy-live-score:latest on push to main, using OIDC Azure login + Docker Buildx with GHA caching
- Created `.github/workflows/commit_to_main_telegram-notifier.yml` — Telegram alert on push to main
- Created `.github/workflows/new_pr_telegram_notifier.yml` — Telegram alert on new PR to main

**Key facts:**

- ACR registry: f1fantasyacr.azurecr.io
- Image name: f1-fantasy-live-score
- OIDC secrets needed: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
- Telegram secrets needed: TELEGRAM_TO, TELEGRAM_TOKEN
- Existing squad workflow files in .github/workflows/ were left untouched

### 2026-03-25 — Team Coordination: Prost Source Code Completed
- Prost completed WI-1 through WI-8 (all source code: 15 files including config, services, main loop)
- Puppeteer scraper service implements ADR-011 (new browser per cycle) and ADR-004 (30s polling with concurrency guard)
- Extraction functions ported from temp/jsFunction.md and integrated into pollingLoop
- Blob upload implements ADR-002 (no dedup, always overwrite f1-live-score-latest.json)
- Telegram service implements ADR-007 ("LIVE-SCORE:" prefix) and ADR-006 (5+ failure escalation)
- All code passes ESLint and Prettier checks; Husky pre-commit hooks active
- Integration point: Source code ready to be containerized by Dockerfile
- Next phase: Docker image built; GitHub Actions workflows trigger on push/PR; Hunt begins testing
