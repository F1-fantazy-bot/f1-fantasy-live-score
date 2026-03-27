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

### 2026-03-27 — ACI ARM Template for Live-Score

**What was done:**

- Created `infra/aci/azuredeploy.json` — ARM template for Azure Container Instances deployment
- Created `infra/aci/azuredeploy.parameters.json` — Parameters file with Key Vault secret references

**ARM template structure for ACI with Puppeteer:**
- API version `2023-05-01`, Linux OS, single container in group
- 2 GB memory (up from 1.5 in next-race-info) — Puppeteer/Chrome headless needs the headroom
- CPU/memory passed as strings and converted via `json()` in the template (ARM pattern)
- ACR image registry credentials section for pulling from f1fantasyacr.azurecr.io
- Output: containerGroupResourceId

**Key Vault secret reference pattern:**
- Parameters file uses `reference` syntax pointing to `f1-fantasy-kv` vault
- Three secrets pulled from KV: `acr-password`, `azure-storage-connection-string`, `telegram-bot-token`
- Same Key Vault as next-race-info — shared infrastructure across the F1 Fantasy suite
- Secure params use `secureString` type in template, `secureValue` in env vars

**Environment variable mapping for live-score:**
- 6 env vars total: AZURE_STORAGE_CONNECTION_STRING (secure), AZURE_STORAGE_CONTAINER_NAME, TELEGRAM_BOT_TOKEN (secure), TELEGRAM_LOG_CHANNEL_ID, TELEGRAM_ERRORS_CHANNEL_ID, POLLING_INTERVAL_MS
- No OpenAI params (unlike next-race-info) — live-score is pure scraping, no AI
- Telegram channel IDs left empty in params file — user fills per environment
- Restart policy defaults to OnFailure (container restarts on crash but not on clean exit)

### 2026-03-27 — Logic App: Polling-Based ACI Scheduler

**What changed:**

- Completely rewrote `infra/scheduler/azuredeploy.json` — replaced Delay Until approach with polling-based design
- Parameters file (`azuredeploy.parameters.json`) unchanged — same parameter structure

**Architecture change — Delay Until → Polling:**

- **Old design:** Daily trigger at 00:00 UTC, three parallel branches with Delay Until actions that waited for exact session times, then started/stopped ACI sequentially per session. Problem: long-running workflow instances, fragile on failures.
- **New design:** Polls every 30 minutes on Fri/Sat/Sun only. Each poll fetches Ergast API, calculates session windows, checks if current time falls within any window, then idempotently starts or stops ACI. Stateless — no long-running instances.

**Trigger design:**

- Weekly recurrence, interval 1, `weekDays: ["Friday", "Saturday", "Sunday", "Monday"]`
- All 24 hours × 2 minutes (5, 35) = 48 polls per day, 192 per weekend+Monday
- UTC timezone

**Session window offsets (from session start time):**

- Qualifying: -30min to +90min (1.5h from session start)
- Sprint: -30min to +90min (1.5h from session start)
- Race: -30min to +180min (3h from session start)

**Expression patterns:**

- `ticks()` conversion for reliable timestamp comparison (not string comparison)
- `if(equals(..., null), false, ...)` null guards on all three window checks
- Sprint has dual null guard: `or(race_object_null, sprint_field_null)`
- `Current_Time` Compose action captures `utcNow()` once for consistency across all comparisons
- `Should_Be_Running = or(quali, sprint, race)` → single condition → Start or Stop ACI

**User preference noted:**

- Doron prefers polling/idempotent approach over long-running Delay Until workflows
- No auto-commit — Doron reviews before commit

**Post-deployment requirement:**

- Assign Contributor RBAC role to Logic App's managed identity principal on the ACI resource
- Principal ID available in deployment output `logicAppPrincipalId`
- Command: `az role assignment create --assignee <principalId> --role Contributor --scope <aciResourceId>`

**Key design improvements over ADR-014:**

1. **Stateless polling:** Each 30-minute cycle is independent (no long-running instance state)
2. **Idempotent decisions:** Same poll result triggers no cascading effects
3. **Cost efficiency:** 144 polls/weekend still within Logic App free tier
4. **Reliability:** No fragile delay state management
5. **Timestamp precision:** `ticks()` conversion prevents drift from string comparison
6. **Robust null handling:** Dual null guard on Sprint field (only exists sprint weekends)
