# Project Decisions — f1-fantasy-live-score

## Decision Inbox Merge Log
**Merged:** 2026-03-25T12:53:00Z
**Source files:**
- senna-project-structure-plan.md
- senna-architecture-decisions.md
- copilot-directive-2026-03-25T12-32.md
- copilot-directive-2026-03-25T12-35.md

---

## Key User Directives

### Repo Boundary (2026-03-25T12:32:00Z)
**Decision:** Only write inside f1-fantasy-live-score repo. Other repos (f1-fantasy-scraper, f1-fantazy-bot, f1-fantasy-next-race-info) are read-only references.
**Rationale:** User request to maintain clear ownership boundaries.
**Impact:** All work items scoped to this repo only.

### Model Preference (2026-03-25T12:35:00Z)
**Decision:** Always use claude-opus-4.6 as the model for all team members.
**Rationale:** User preference for consistent model capability across team.
**Impact:** All agents (Senna, Prost, Lauda, Hunt, etc.) use Opus-4.6 for their work.

---

## Architecture Decisions (ADRs)

### ADR-001: Blob Name — `f1-live-score-latest.json`
**Context:** Live scores need a separate storage location from simulation data (`f1-fantasy-data.json`).
**Decision:** Use `f1-live-score-latest.json` as the Azure Blob name.
**Rationale:** Prevents accidental overwrites; "latest" communicates most recent snapshot; clear namespace differentiation.
**Status:** PROPOSED (Doron-confirmed)

### ADR-002: No Deduplication on Upload
**Context:** Should we compare data before uploading to detect unchanged results?
**Decision:** Skip deduplication. Every successful scrape overwrites the blob unconditionally.
**Rationale:** Per Doron's explicit instruction; live scores change continuously; overwrite latency negligible; code simplicity wins. Future: May add hash-based dedup if needed.
**Status:** PROPOSED (Doron-confirmed)

### ADR-003: Extraction Functions Ported from `temp/jsFunction.md`
**Context:** Doron provided pre-tested JS extraction functions for the /live page DOM.
**Decision:** Port functions into `src/extractionFunctions.js` as string templates for `page.evaluate()`.
**Key discriminator:** Driver rows have 16 cells; constructor rows have 17 cells.
**Rationale:** Functions already proven in browser; target exact DOM structure; rich output schema (sprint/qualifying/race breakdown).
**Status:** PROPOSED

### ADR-004: Polling Loop Architecture (Not One-Shot)
**Context:** Scraper runs one-shot; live scores need continuous polling during race windows.
**Decision:** Implement `setInterval`-based polling loop with one-at-a-time concurrency guard.
**Details:** 30-second intervals; guard prevents overlapping cycles if scrape takes >30s (simple boolean flag).
**Rationale:** Simple, reliable, proven pattern; no complex scheduler needed (cron, node-cron); container lifecycle controlled externally.
**Status:** PROPOSED

### ADR-005: Container-Friendly Puppeteer Chrome Flags
**Context:** Puppeteer in Docker needs specific flags for reliability.
**Decision:** Use exact same Chrome flags as f1-fantasy-scraper (proven in ACI).
**Flags:**
```
--enable-features=NetworkService,NetworkServiceInProcess
--no-sandbox
--disable-setuid-sandbox
--disable-dev-shm-usage
--memory-pressure-off
--disable-background-timer-throttling
--disable-renderer-backgrounding
--max_old_space_size=512
```
**Rationale:** Proven to work; prevent OOM in containers; critical for long-running polling service.
**Status:** PROPOSED

### ADR-006: Error Resilience — No Retries, Natural Loop Recovery
**Context:** What happens when a scrape cycle fails?
**Decision:** No retry logic within a cycle. 30-second loop naturally retries. Track consecutive failures for escalation.
**Error escalation:**
1. Single failure → log + Telegram error message
2. 5+ consecutive failures → escalated alert ("may need manual restart")
3. Config failure → immediate exit (no recovery possible)
**Rationale:** 30s loop already provides fast retry; retries add complexity; scraper pattern doesn't use retries.
**Status:** PROPOSED

### ADR-007: Telegram Notification Prefix — "LIVE-SCORE:"
**Context:** Scraper uses "SCRAPER:" prefix. Need distinct prefix for live score service.
**Decision:** Use "LIVE-SCORE:" as the prefix for all Telegram notifications.
**Rationale:** Clearly distinguishes notifications; short and descriptive; matches role-based prefix pattern.
**Status:** PROPOSED

### ADR-008: Dockerfile — Match Scraper Pattern Exactly
**Context:** Reuse proven Docker setup for Puppeteer-based services.
**Decision:** Clone the f1-fantasy-scraper Dockerfile pattern exactly.
**Pattern:**
```
FROM ghcr.io/puppeteer/puppeteer:latest
USER root → install deps → copy source
USER pptruser → install Chrome → CMD node index.js
```
**Rationale:** Proven to work in ACI deployment; `pptruser` is Puppeteer convention; Chrome install must run as pptruser.
**Status:** PROPOSED

### ADR-009: CommonJS Module System
**Context:** Should we use ESM (`import/export`) or CommonJS (`require/module.exports`)?
**Decision:** CommonJS throughout, matching entire F1 Fantasy ecosystem.
**Rationale:** Consistency with f1-fantasy-scraper, f1-fantazy-bot, f1-fantasy-next-race-info; compatibility with node-telegram-bot-api and @azure/storage-blob.
**Status:** PROPOSED

### ADR-010: Output Schema Design
**Context:** Extraction functions return driver/constructor data. Need top-level wrapper for the JSON file.
**Decision:** Schema: `{ extractedAt: ISO8601, drivers: {...}, constructors: {...} }`
**Rationale:** `extractedAt` tells consumers how fresh the data is; keys are driver/constructor names (e.g., "VER", "McLaren"); no simulation metadata needed; separate from simulation blob allows independent data path in bot.
**Status:** PROPOSED (Doron-confirmed)

### ADR-011: Browser Lifecycle — New Browser Per Cycle
**Context:** Should we keep one persistent browser or launch new one each cycle?
**Decision:** Launch new Puppeteer browser for each 30-second cycle.
**Rationale:** Prevents memory leaks over hours of operation; Chrome in containers accumulates memory if kept alive; clean state ensures no stale data; 2-3 second startup overhead acceptable in 30s window; matches scraper pattern.
**Trade-off:** Slightly more overhead per cycle, but much better reliability for long-running operation.
**Status:** PROPOSED

---

## Project Structure Summary

### Directory Layout
```
f1-fantasy-live-score/
├── src/
│   ├── config.js              # Env-based configuration
│   ├── scraperService.js      # Puppeteer launch, page.evaluate, extraction
│   ├── extractionFunctions.js # Driver/constructor DOM parsing (ported from temp/)
│   ├── azureBlobService.js    # Upload to Azure Blob (f1-live-score-latest.json)
│   ├── telegramService.js     # Notifications with escalation
│   └── pollingLoop.js         # 30s setInterval with concurrency guard
├── index.js                   # Entry point (init telegram, start loop, graceful shutdown)
├── package.json               # Dependencies (puppeteer, @azure/storage-blob, node-telegram-bot-api, dotenv)
├── .eslintrc.json, .prettierrc, .editorconfig # Code quality
├── .husky/pre-commit          # Lint + format on commit
├── Dockerfile                 # Puppeteer base, pptruser, Chrome
├── .dockerignore              # Exclude node_modules, .git, .squad, .env, temp
├── .github/workflows/
│   ├── docker-build-push.yml            # Build & push to ACR on push to main
│   ├── commit_to_main_telegram-notifier.yml    # Alert on push
│   └── new_pr_telegram_notifier.yml     # Alert on new PR
└── README.md, .gitignore, .env.example, .vscode/
```

### Key Files
- **Entry:** `index.js` — Requires config, initializes telegram, starts polling loop, handles SIGTERM/SIGINT
- **Main loop:** `pollingLoop.js` — `setInterval(30s)` with `isRunning` guard; calls scraperService, logs errors, updates failure counter, uploads blob
- **Scraper:** `scraperService.js` — New browser per cycle, visits f1fantasytools.com/live, page.evaluate() extraction, closes browser
- **Extraction:** `extractionFunctions.js` — String templates for drivers/constructors parsing (16-cell vs 17-cell row discrimination)
- **Blob upload:** `azureBlobService.js` — No dedup logic; always overwrite `f1-live-score-latest.json`
- **Notifications:** `telegramService.js` — "LIVE-SCORE:" prefix; error channel; escalation at 5+ consecutive failures

---

## Schedule Implications

**Container Lifecycle (externally managed):**
- Start: ~1 hour before F1 session
- Stop: ~3 hours after session ends
- Polling loop: Continuous 30-second cycles while running
- Graceful shutdown: SIGTERM closes browser and exits

**Target update frequency:** Every 30 seconds during race window
**Data availability:** Consumers read `f1-live-score-latest.json` from blob storage
**Telegram visibility:** Commit/PR alerts + error escalation alerts

---

## Implementation Status

### Completed (All agents)
✅ Senna: Project structure plan + 11 ADRs
✅ Prost: All source code (config, services, main loop, Husky) — 15 files, lint passes
✅ Lauda: Dockerfile + GitHub Actions workflows — 5 files (ACR push + Telegram notifiers)

### Pending
- Hunt: Unit, integration, E2E testing
- Doron: Review and approve architecture decisions
- DevOps: Configure GitHub secrets (AZURE_*, TELEGRAM_*)
- QA: Validate in dev/test environments

---

## Decision Lineage

| Decision | ADR | Author | Date | Status |
|----------|-----|--------|------|--------|
| Blob name | ADR-001 | Senna | 2026-03-25 | PROPOSED |
| No dedup | ADR-002 | Senna | 2026-03-25 | PROPOSED (Doron-confirmed) |
| Extraction port | ADR-003 | Senna | 2026-03-25 | PROPOSED |
| Polling loop | ADR-004 | Senna | 2026-03-25 | PROPOSED |
| Chrome flags | ADR-005 | Senna | 2026-03-25 | PROPOSED |
| Error strategy | ADR-006 | Senna | 2026-03-25 | PROPOSED |
| Telegram prefix | ADR-007 | Senna | 2026-03-25 | PROPOSED |
| Dockerfile | ADR-008 | Senna | 2026-03-25 | PROPOSED |
| CommonJS | ADR-009 | Senna | 2026-03-25 | PROPOSED |
| Output schema | ADR-010 | Senna | 2026-03-25 | PROPOSED (Doron-confirmed) |
| Browser per cycle | ADR-011 | Senna | 2026-03-25 | PROPOSED |
| Repo boundary | Directive | Doron | 2026-03-25 | APPROVED |
| Model choice | Directive | Doron | 2026-03-25 | APPROVED |
