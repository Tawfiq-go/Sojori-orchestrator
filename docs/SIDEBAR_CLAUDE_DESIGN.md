# Sidebar — maquette Claude Design

**Lien maquette :** https://claude.ai/design/p/019de9f5-e604-7677-a6d5-71e8f8e3e62a?file=site%2FSojori+Sidebar.html&via=share

## Implémentation code

| Fichier | Rôle |
|---------|------|
| `src/config/navConfig.ts` | Structure NAV (groupes, items, `roles`) — **Orchestration section dédiée** |
| `src/hooks/useSidebarNav.ts` | Filtre sidebar par rôle |
| `src/components/dashboard/DashboardV2.components.jsx` | `AppSidebar` consomme `useSidebarNav` |
| `src/config/navRoutes.ts` | Mapping id → route (`NAV_TO_ROUTE`) |
| `src/components/DashboardWrapper.tsx` | Import `NAV_TO_ROUTE`, `getActivePathFromUrl` |

## Pour aligner sur la maquette HTML

1. Maquette HTML locale : `docs/design/Sojori-Sidebar.html` (export Claude Design)
2. Ajuster `navConfig.ts` (libellés, ordre, nouveaux items) — mettre à jour `navRoutes.ts` en parallèle
3. Style visuel Atelier 2026 : tokens dans `AppSidebar` (glass, gradients) — comparer avec le HTML exporté

## Contrainte produit

- **Orchestration** = groupe à part (Plans séjour, Config workflows, Messages WA)
- **Tâches** = exécution opérationnelle uniquement
- **1 sidebar** adaptive (SuperAdmin / Owner / Worker), pas 3 maquettes séparées
