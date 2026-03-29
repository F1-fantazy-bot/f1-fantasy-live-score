# F1 Fantasy ACI Scheduler — Logic App

Polls every 30 minutes on **Fri/Sat/Sun/Mon** and idempotently starts or stops the ACI based on F1 session time windows.

## Flow

```
┌─────────────────────────────────────┐
│  ⏰ Recurrence Trigger              │
│  Every 30 min (Fri/Sat/Sun/Mon)     │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│ Current_Time│  │ Fetch_Race_  │
│  utcNow()   │  │ Schedule     │
└──────┬──────┘  │ GET /ergast/ │
       │         │ f1/current/  │
       │         │ next.json    │
       │         └──────┬───────┘
       │                │
       │                ▼
       │         ┌──────────────┐
       │         │ Get_Race_    │
       │         │ Object       │
       │         │ Races[0]     │
       │         └──────┬───────┘
       │                │
       └───────┬────────┘
               │
     ┌─────────┼─────────────┐
     │         │             │
     ▼         ▼             ▼
┌─────────┐ ┌──────────┐ ┌─────────┐
│ Is_Quali│ │ Is_Sprint│ │ Is_Race │
│ Window  │ │ Window   │ │ Window  │
│ Active? │ │ Active?  │ │ Active? │
└────┬────┘ └────┬─────┘ └────┬────┘
     │           │             │
     └─────┬─────┘             │
           └──────┬────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │ Should_Be_      │
        │ Running          │
        │ = Q OR S OR R   │
        └────────┬────────┘
                 │
          ┌──────┴──────┐
          │             │
       true          false
          │             │
          ▼             ▼
   ┌────────────┐ ┌────────────┐
   │ Start ACI  │ │ Stop ACI   │
   │ POST /start│ │ POST /stop │
   └────────────┘ └────────────┘
```

## Session Time Windows

Each session defines a window during which the ACI should be running:

| Session    | Window Start          | Window End            | Notes                         |
| ---------- | --------------------- | --------------------- | ----------------------------- |
| Qualifying | `quali_time - 30min`  | `quali_time + 90min`  | 1.5h total from session start |
| Sprint     | `sprint_time - 30min` | `sprint_time + 90min` | 1.5h total from session start |
| Race       | `race_time - 30min`   | `race_time + 180min`  | 3h total from session start   |

- **Sprint** is only evaluated if the API response contains a `Sprint` field (sprint weekends only).
- All times are **UTC**.

## Example — Miami GP 2026 (Sprint Weekend)

| Session    | Start (UTC) | ACI Start | ACI Stop  |
| ---------- | ----------- | --------- | --------- |
| Qualifying | Sat 20:00   | Sat 19:30 | Sat 21:30 |
| Sprint     | Sat 16:00   | Sat 15:30 | Sat 17:30 |
| Race       | Sun 20:00   | Sun 19:30 | Sun 23:00 |

## Key Design Decisions

- **Idempotent:** Starting an already-running ACI or stopping an already-stopped ACI is a no-op.
- **Polling over scheduling:** Avoids Logic App `Delay Until` complexity; self-corrects on every run.
- **Managed Identity auth:** Logic App uses system-assigned identity to call Azure Management API.

## Deployment

```bash
az deployment group create \
  --resource-group f1-fantazy-bot \
  --template-file azuredeploy.json \
  --parameters azuredeploy.parameters.json
```

**Post-deploy — assign RBAC:**

```bash
az role assignment create \
  --assignee <logicAppPrincipalId> \
  --role Contributor \
  --scope /subscriptions/<subId>/resourceGroups/f1-fantazy-bot/providers/Microsoft.ContainerInstance/containerGroups/f1-fantasy-live-score-aci
```

## Data Source

Race schedule fetched from: `https://api.jolpi.ca/ergast/f1/current/next.json`
