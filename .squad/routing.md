# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Puppeteer / scraping | Prost | Browser automation, page scraping, data extraction |
| Node.js service logic | Prost | Polling loop, data transformation, Azure Storage integration |
| Docker / containers | Lauda | Dockerfile, image builds, container config |
| Azure infra / deployment | Lauda | Hosting, CI/CD, env vars, secrets, scaling |
| Testing | Hunt | Unit tests, integration tests, edge cases, reliability |
| Code review | Senna | Review PRs, check quality, suggest improvements |
| Architecture / design | Senna | Service structure, data flow, component boundaries |
| Scope & priorities | Senna | What to build next, trade-offs, decisions |
| Issue triage | Senna | Analyze issues, assign labels, set priority |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Lead |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Human Members

| Name | Role | Workflow |
|------|------|----------|
| Doron | Reviewer | After agent work completes, present changes to Doron. Wait for approval before committing. |

## Rules

0. **Human gate — Doron approves before commit.** After agents finish changes, ask Doron to verify. Only commit when he confirms it works.
1. **Eager by default**— spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
