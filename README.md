# Sojori Orchestrator

Application **Vite + React** pour le pilotage Sojori (orchestration, réservations, tâches, communications, etc.).

## Autonomie du dépôt

- **Tout le code source** est sous ce dépôt (`src/`). Il n’y a **aucune** dépendance de build ou d’import vers le dépôt `sojori-dashboard` ni vers des chemins absolus machine.
- Les **APIs** consommées sont celles de l’infra Sojori (`VITE_API_URL`, microservices), pas un autre front.
- L’ancien dashboard peut être retiré du poste de dev **sans** casser ce projet, tant que les variables d’environnement et les secrets d’API restent configurés.

Pour le détail : [docs/INDEPENDANCE.md](docs/INDEPENDANCE.md).

## Commandes

```bash
pnpm install
pnpm dev          # dev (voir port dans vite.config.ts)
pnpm exec vite build   # bundle prod (sans tsc si besoin)
pnpm run build    # tsc + vite build
npm run deploy:vercel  # prod Vercel (évite BLOCKED git author)
```

> **Vercel** : ne pas lancer `vercel --prod` avec `.git` si l’auteur du commit est un email
> `noreply.github.com` hors équipe Sojori — utiliser `npm run deploy:vercel`
> (`scripts/deploy-vercel-prod.sh`).

## Orchestration (réservations + timeline)

Composants : `src/features/orchestration/`. Page shell : `src/pages/OrchestrationReservationsPage.tsx`. Routes : `/admin/orchestrator`, `/orchestrator`, `/orchestration/legacy` (alias conservé pour les liens existants).
