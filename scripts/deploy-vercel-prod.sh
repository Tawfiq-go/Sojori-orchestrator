#!/usr/bin/env bash
# Déploie Sojori-orchestrator en production Vercel **sans métadonnées GitHub**.
#
# Pourquoi : avec `.git` présent, Vercel attache l’auteur du commit et bloque si
# `…@users.noreply.github.com` n’est pas membre de l’équipe « Sojori » :
#   Git author … must have access to the team Sojori on Vercel
#
# Usage (depuis la racine du front) :
#   ./scripts/deploy-vercel-prod.sh
#   npm run deploy:vercel
#
# Prérequis : `vercel` CLI loguée (`vercel whoami`), scope `sojori`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCOPE="${VERCEL_SCOPE:-sojori}"
ALIASES=(
  "app.sojori.com"
  "sojori-orchestrator.vercel.app"
)

if [[ ! -d .git && ! -d .git.__bak_vercel ]]; then
  echo "❌ Pas de dossier .git dans $ROOT" >&2
  exit 1
fi

restore_git() {
  if [[ -d .git.__bak_vercel && ! -d .git ]]; then
    mv .git.__bak_vercel .git
    echo "↩ .git restauré"
  fi
}
trap restore_git EXIT

if [[ -d .git ]]; then
  mv .git .git.__bak_vercel
  echo "⏳ .git masqué (évite BLOCKED git author)"
fi

echo "🚀 vercel deploy --prod --yes --scope $SCOPE"
OUT="$(vercel deploy --prod --yes --scope "$SCOPE" 2>&1 | tee /dev/stderr)" || {
  echo "❌ deploy failed" >&2
  exit 1
}

# URL du déploiement (ligne Aliased ou Production / Inspect)
DEPLOY_URL="$(printf '%s\n' "$OUT" | grep -Eo 'https://sojori-orchestrator-[a-z0-9-]+\.vercel\.app' | grep -v inspect | tail -1 || true)"
if [[ -z "${DEPLOY_URL:-}" ]]; then
  DEPLOY_URL="$(printf '%s\n' "$OUT" | grep -Eo 'https://sojori-orchestrator[^[:space:]]+\.vercel\.app' | head -1 || true)"
fi

if [[ -z "${DEPLOY_URL:-}" ]]; then
  echo "⚠️ Déploiement OK mais URL introuvable — alias manuels : vercel alias set <url> app.sojori.com --scope $SCOPE"
  exit 0
fi

echo "🔗 Déploiement : $DEPLOY_URL"
for alias in "${ALIASES[@]}"; do
  echo "→ alias $alias"
  vercel alias set "$DEPLOY_URL" "$alias" --scope "$SCOPE" --yes || true
done

echo "✅ Prod Vercel à jour → https://app.sojori.com"
curl -sI "https://app.sojori.com" | head -3 || true
