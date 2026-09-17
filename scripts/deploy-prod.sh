#!/usr/bin/env bash
# Déploiement PROD du front — depuis origin/main uniquement, jamais depuis l'arbre de travail.
#
# Pourquoi : le 16/09/2026 un `vercel --prod` lancé depuis l'arbre partagé (branche en retard,
# 7 364 fichiers uploadés dont .claude/worktrees/) a repris l'alias app.sojori.com avec un menu
# périmé, deux minutes après un déploiement correct. Ce script :
#   1. clone origin/main dans un dossier temporaire propre (rien de local ne s'y glisse) ;
#   2. pnpm install --frozen-lockfile, vercel build, vercel deploy --prebuilt --prod ;
#   3. pose EXPLICITEMENT les deux alias (admin.sojori.com est un alias manuel que
#      `vercel deploy --prod` ne met pas à jour) ;
#   4. vérifie que le bundle servi correspond au build.
# Usage : scripts/deploy-prod.sh            (refuse si origin/main a bougé pendant le build)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="sojori"
DOMAINS=(admin.sojori.com app.sojori.com)

command -v vercel >/dev/null || { echo "❌ vercel CLI absent" >&2; exit 1; }
[ -f "$REPO_ROOT/.vercel/project.json" ] || { echo "❌ .vercel/project.json absent (vercel link)" >&2; exit 1; }

cd "$REPO_ROOT"
git fetch -q origin main
MAIN_SHA="$(git rev-parse origin/main)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sojori-front-prod.XXXXXX")"
trap 'git worktree remove --force "$BUILD_DIR" >/dev/null 2>&1 || true' EXIT

echo "📦 checkout propre de origin/main (${MAIN_SHA:0:9}) → $BUILD_DIR"
git worktree add -q --detach "$BUILD_DIR" "$MAIN_SHA"
mkdir -p "$BUILD_DIR/.vercel"
cp .vercel/project.json "$BUILD_DIR/.vercel/project.json"
[ -f .env.local ] && cp .env.local "$BUILD_DIR/.env.local"

cd "$BUILD_DIR"
echo "📚 pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile --prefer-offline >/dev/null
echo "🔨 vercel build --prod"
vercel build --prod --scope "$SCOPE" --yes >/dev/null

# origin/main a-t-il bougé pendant le build ? On ne déploie pas un build déjà périmé.
git fetch -q origin main
[ "$(git rev-parse origin/main)" = "$MAIN_SHA" ] || { echo "❌ origin/main a changé pendant le build — relancer" >&2; exit 1; }

echo "🚀 vercel deploy --prebuilt --prod"
DEPLOY_OUT="$(vercel deploy --prebuilt --prod --yes --scope "$SCOPE" 2>&1)"
URL="$(printf '%s' "$DEPLOY_OUT" | grep -o 'https://sojori-orchestrator-[a-z0-9]*-sojori\.vercel\.app' | head -1)"
[ -n "$URL" ] || { printf '%s\n' "$DEPLOY_OUT" >&2; echo "❌ URL de déploiement introuvable" >&2; exit 1; }

for d in "${DOMAINS[@]}"; do
  vercel alias set "$URL" "$d" --scope "$SCOPE" >/dev/null
  echo "🔗 $d → $URL"
done

# Contrôle : le chunk du menu servi par chaque domaine est bien celui du build.
CHUNK="$(grep -l 'group:"Reports"' .vercel/output/static/assets/*.js | head -1 | xargs -n1 basename)"
for d in app.sojori.com; do
  if curl -sf --max-time 20 "https://$d/assets/$CHUNK" | grep -q 'group:"Reports"'; then
    echo "✅ $d sert le build ${MAIN_SHA:0:9}"
  else
    echo "❌ $d ne sert pas le chunk $CHUNK du build" >&2; exit 1
  fi
done
echo "✅ prod front = origin/main ${MAIN_SHA:0:9} ($URL)"
