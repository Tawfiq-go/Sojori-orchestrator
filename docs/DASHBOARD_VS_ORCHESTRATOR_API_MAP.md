# Pointeur — Carte APIs Dashboard vs Orchestrator

Le document **source de vérité** est dans le monorepo backend :

**[`sojori-production/docs/DASHBOARD_VS_ORCHESTRATOR_API_MAP.md`](../../sojori-production/docs/DASHBOARD_VS_ORCHESTRATOR_API_MAP.md)**

Script smoke test :

```bash
cd ../sojori-production
export SOJORI_JWT="..."
export SOJORI_LISTING_ID="..."
./scripts/smoke-api-dashboard-vs-orchestrator.sh
```

Services orchestrateur concernés : `src/services/listingsService.ts`, `mapApiListingToListingRecord.ts`, `dashboardService.ts`, etc.
