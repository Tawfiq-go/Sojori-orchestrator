# Indépendance du dépôt Sojori Orchestrator

## Principe

Ce dépôt est une **application front autonome**. La suppression ou l’absence du repo **sojori-dashboard** ne doit pas être requise pour développer, builder ou déployer Sojori Orchestrator.

## Règles

1. **Imports** : uniquement des chemins relatifs à `src/` ou des alias définis dans `vite.config.ts` (`@/`, `config/`, etc.). Interdit : `import … from '/Users/…'`, `…/sojori-dashboard/…`, URL `file:`.
2. **Configuration** : `src/config/` (ex. `authConfig.ts`, `backendServer.config`). Pas de fichier de config lu hors du repo en build.
3. **Nouveaux modules** : tout fichier nécessaire à une feature doit être **ajouté ou déplacé dans ce dépôt**, pas référencé depuis un clone du dashboard.

## Vérification rapide

```bash
cd /path/to/Sojori-orchestrator
# Aucun import ne doit cibler un chemin absolu ou sojori-dashboard dans src/
grep -R "sojori-dashboard\|/Users/" src --include="*.{ts,tsx,js,jsx}" || true
```

Des mentions historiques peuvent subsister dans `docs/` ou des commentaires ; elles ne doivent pas être des imports exécutables.

## Renommage récent

La page shell `/admin/orchestrator` s’appelle **`OrchestrationReservationsPage`** (`src/pages/OrchestrationReservationsPage.tsx`). L’ancien nom `OrchestrationViewLegacy` a été retiré pour éviter la confusion « dépendance au legacy ».
