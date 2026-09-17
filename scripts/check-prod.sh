#!/usr/bin/env bash
# Vérifie que la prod front (admin + app) sert un déploiement construit depuis un commit de origin/main.
# Sort en erreur sinon — à lancer avant de crier à la régression.
set -euo pipefail
SCOPE="sojori"
cd "$(dirname "$0")/.."
git fetch -q origin main
TOKEN="$(python3 - <<'PY'
import json,os
for p in ('~/Library/Application Support/com.vercel.cli/auth.json','~/.local/share/com.vercel.cli/auth.json'):
    p=os.path.expanduser(p)
    if os.path.exists(p):
        print(json.load(open(p)).get('token','')); break
PY
)"
TEAM="$(python3 -c "import json;print(json.load(open('.vercel/project.json'))['orgId'])")"
rc=0
for d in admin.sojori.com app.sojori.com; do
  DEP="$(vercel alias ls --scope "$SCOPE" 2>/dev/null | awk -v d="$d" '$2==d{print $1}' | head -1)"
  INFO="$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.vercel.com/v13/deployments/$DEP?teamId=$TEAM")"
  SHA="$(printf '%s' "$INFO" | python3 -c "import json,sys;j=json.load(sys.stdin);m=j.get('meta') or {};print(m.get('gitCommitSha') or '')")"
  ACTOR="$(printf '%s' "$INFO" | python3 -c "import json,sys;j=json.load(sys.stdin);m=j.get('meta') or {};print(m.get('actor') or j.get('source') or '?')")"
  if [ -n "$SHA" ] && git merge-base --is-ancestor "$SHA" origin/main 2>/dev/null; then
    echo "✅ $d → $DEP (commit ${SHA:0:9} ∈ main, $ACTOR)"
  else
    echo "❌ $d → $DEP : commit '${SHA:-inconnu}' hors main (acteur: $ACTOR) — redéployer avec scripts/deploy-prod.sh"; rc=1
  fi
done
exit $rc
