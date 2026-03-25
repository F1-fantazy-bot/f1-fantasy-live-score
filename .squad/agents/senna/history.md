# Project Context

- **Owner:** Doron
- **Project:** f1-fantasy-live-score — A live data scraping service for F1 Fantasy. Uses Puppeteer to extract real-time driver and constructor scoring data from f1fantasytools.com/live every 30 seconds. Stores data in Azure Storage for consumption by the Telegram bot (f1-fantazy-bot).
- **Stack:** Node.js, Puppeteer, Azure Storage (Blob/Table), Docker, Azure hosting
- **Ecosystem:** Part of the F1 Fantasy suite: f1-fantasy-scraper (data scraper), f1-fantasy-next-race-info (race info), f1-fantazy-bot (Telegram bot)
- **Created:** 2026-03-25

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-03-25 — Project Structure Plan Created

**Task:** Create comprehensive project structure plan for f1-fantasy-live-score.

**What I did:**
- Studied all three sibling projects (scraper, bot, next-race-info) in depth
- Read the extraction JS code from `temp/jsFunction.md`
- Mapped the scraper's Puppeteer patterns, Azure Blob upload code, Telegram notifications, Dockerfile, GitHub Actions
- Mapped the bot's data reading patterns to ensure output compatibility
- Mapped the next-race-info project's Docker and CI/CD patterns

**Deliverables:**
1. `.squad/decisions/inbox/senna-project-structure-plan.md` — Full project plan with:
   - 20-file directory structure with purpose annotations
   - File-by-file breakdown (every function, every dependency)
   - Architecture diagram (Puppeteer → extraction → blob → bot)
   - 30-second polling loop design with one-at-a-time guard
   - Error handling strategy (5 levels, consecutive failure escalation)
   - Docker setup matching scraper exactly
   - 3 GitHub Actions workflows (ACR push + 2 Telegram notifiers)
   - ESLint/Prettier/Husky config matching ecosystem
   - package.json with exact dependency versions
   - 13 work items across Prost (8), Lauda (2), Hunt (3) with dependency graph

2. `.squad/decisions/inbox/senna-architecture-decisions.md` — 11 Architecture Decision Records covering:
   - Blob naming, no-dedup, extraction approach, polling vs one-shot
   - Browser-per-cycle for memory safety, CommonJS, error resilience
   - All Doron-confirmed decisions documented

**Key decisions:**
- New browser per cycle (ADR-011) — critical for long-running container memory management
- No retries, natural 30s loop recovery (ADR-006) — keeps it simple
- `f1-live-score-latest.json` blob name (ADR-001) — separate from scraper's blob
- Prost and Lauda can work in parallel after scaffolding (WI-1)

**Status:** PROPOSED — awaiting Doron's review and approval before team execution.

### 2026-03-25 — Team Execution Complete
- Prost (Backend Dev) completed WI-1 through WI-8: all source code (15 files, config/services/main loop)
  - Puppeteer scraper with new browser per cycle (ADR-011)
  - 30-second polling loop with concurrency guard (ADR-004)
  - Extraction functions ported from temp/jsFunction.md
  - Blob upload with no dedup (ADR-002)
  - Telegram service with "LIVE-SCORE:" prefix (ADR-007) and 5-failure escalation (ADR-006)
  - All code passes lint and format checks; Husky hooks active
- Lauda (DevOps/Infra) completed WI-9, WI-10: Docker + GitHub Actions
  - Dockerfile matches scraper pattern (ghcr.io/puppeteer/puppeteer:latest, pptruser, Chrome)
  - GitHub Actions workflows: ACR docker-build-push + commit/PR Telegram notifiers
  - OIDC federated credentials for Azure auth (no stored secrets)
  - Secrets required: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, TELEGRAM_TO, TELEGRAM_TOKEN
- Orchestration logs written (.squad/orchestration-log/2026-03-25T12-53-{senna,prost,lauda}.md)
- Session log written (.squad/log/2026-03-25T12-53-project-setup.md)
- Decisions merged to .squad/decisions/decisions.md; inbox cleaned up
- Agent histories updated with cross-team coordination notes
- Project ready for testing phase (Hunt); awaiting GitHub secret configuration for CI/CD
