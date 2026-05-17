#!/bin/bash

# Script pour packager l'inbox pour Claude Design
# Crée un ZIP avec tous les fichiers nécessaires

OUTPUT_DIR="/Users/gouacht/Downloads/claude-inbox-design-handoff"
ZIP_NAME="claude-inbox-design-$(date +%Y%m%d-%H%M%S).zip"

echo "📦 Création du package pour Claude Design..."

# Créer dossier temporaire
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "✅ Dossier temporaire créé: $OUTPUT_DIR"

# Copier les composants inbox
echo "📄 Copie des composants inbox..."
mkdir -p "$OUTPUT_DIR/src/components/unified-inbox"
cp /Users/gouacht/Sojori-orchestrator/src/components/unified-inbox/*.tsx "$OUTPUT_DIR/src/components/unified-inbox/"

# Copier les tabs communications
echo "📄 Copie des tabs communications..."
mkdir -p "$OUTPUT_DIR/src/components/communications"
cp /Users/gouacht/Sojori-orchestrator/src/components/communications/WhatsAppTabV2.tsx "$OUTPUT_DIR/src/components/communications/"
cp /Users/gouacht/Sojori-orchestrator/src/components/communications/StaffWhatsAppTabV2.tsx "$OUTPUT_DIR/src/components/communications/"
cp /Users/gouacht/Sojori-orchestrator/src/components/communications/MessagesOTATabV2.tsx "$OUTPUT_DIR/src/components/communications/"

# Copier les types
echo "📄 Copie des types..."
mkdir -p "$OUTPUT_DIR/src/types"
cp /Users/gouacht/Sojori-orchestrator/src/types/unifiedInbox.types.ts "$OUTPUT_DIR/src/types/"
cp /Users/gouacht/Sojori-orchestrator/src/types/tasks.types.ts "$OUTPUT_DIR/src/types/"
cp /Users/gouacht/Sojori-orchestrator/src/types/messages.types.ts "$OUTPUT_DIR/src/types/" 2>/dev/null || true

# Copier le design system (tokens)
echo "📄 Copie du design system..."
mkdir -p "$OUTPUT_DIR/src/components/dashboard"
cp /Users/gouacht/Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx "$OUTPUT_DIR/src/components/dashboard/" 2>/dev/null || true

# Copier la documentation
echo "📄 Copie de la documentation..."
mkdir -p "$OUTPUT_DIR/docs"
cp /Users/gouacht/Sojori-orchestrator/docs/CLAUDE_DESIGN_HANDOFF_INBOX.md "$OUTPUT_DIR/docs/"
cp /Users/gouacht/Sojori-orchestrator/docs/TASKS_INTEGRATION_INBOX.md "$OUTPUT_DIR/docs/"
cp /Users/gouacht/Sojori-orchestrator/docs/INBOX_RESPONSIVE_HEIGHT.md "$OUTPUT_DIR/docs/"
cp /Users/gouacht/Sojori-orchestrator/docs/FINAL_CLAUDE_DESIGN_CONFORMITY.md "$OUTPUT_DIR/docs/"

# Créer un README dans le zip
echo "📝 Création du README..."
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# 📦 Unified Inbox - Package pour Claude Design

**Date**: 2026-05-17
**Mission**: Redesign moderne de l'inbox

## 📂 Structure du Package

```
.
├── README.md                          ← Ce fichier
├── docs/
│   ├── CLAUDE_DESIGN_HANDOFF_INBOX.md  ← 🔥 LIRE EN PREMIER!
│   ├── TASKS_INTEGRATION_INBOX.md      ← Détails techniques tâches
│   ├── INBOX_RESPONSIVE_HEIGHT.md      ← Fix scroll et hauteur
│   └── FINAL_CLAUDE_DESIGN_CONFORMITY.md ← Conformité design actuel
└── src/
    ├── components/
    │   ├── unified-inbox/              ← Composants principaux
    │   │   ├── InboxLayout.tsx         ← Container 3 colonnes
    │   │   ├── ThreadsList.tsx         ← Liste conversations (gauche)
    │   │   ├── ConversationThread.tsx  ← Messages + input (centre)
    │   │   └── ConversationDetails.tsx ← Panel détails + tâches (droite)
    │   ├── communications/             ← Tabs utilisant l'inbox
    │   │   ├── WhatsAppTabV2.tsx
    │   │   ├── StaffWhatsAppTabV2.tsx
    │   │   └── MessagesOTATabV2.tsx
    │   └── dashboard/
    │       └── DashboardV2.components.jsx ← Design system (tokens)
    └── types/
        ├── unifiedInbox.types.ts       ← Types Thread, Message, etc.
        └── tasks.types.ts              ← Types tâches

```

## 🎯 Mission

Redesigner l'inbox pour en faire une interface **ultra-moderne et professionnelle**.

**Priorités**:
1. 🔥 **Tâches** - Design actuellement très basique!
2. 💬 **Messages** - Bulles et status indicators
3. 📋 **ThreadsList** - Hiérarchie visuelle
4. 🎨 **Global** - Cohérence et élégance

## 📖 Par où commencer?

1. **Lire** `docs/CLAUDE_DESIGN_HANDOFF_INBOX.md` (complet!)
2. **Parcourir** les composants dans `src/components/unified-inbox/`
3. **Analyser** les types disponibles dans `src/types/`
4. **Designer** et générer les nouveaux composants

## 🎨 Design System Actuel

Tokens dans `DashboardV2.components.jsx`:
- Primary: `#F59E0B` (amber/or Sojori)
- Backgrounds: `#0A0908`, `#1A1817`, `#2A2726`
- Text: `#FAFAF9`, `#E7E5E4`, `#A8A29E`, `#78716C`

Font: Geist (sans), Geist Mono (mono)

## ✅ Déjà Implémenté

- ✅ Structure 3 colonnes fixe
- ✅ Scroll indépendant par zone
- ✅ Hauteur responsive (calc(100vh - 200px))
- ✅ Status messages animés (✓, ✓✓, ✓✓ bleu)
- ✅ Integration tâches (fetch parallèle)

## 🎨 À Améliorer

- [ ] Design visuel moderne (tous composants)
- [ ] Hiérarchie information claire
- [ ] Micro-animations
- [ ] **Tâches: design professionnel!**
- [ ] Quick templates plus beaux
- [ ] Input bar moderne

## 🚀 Inspirations

- Linear (tâches)
- Intercom (messages)
- Front (inbox)
- Superhuman (speed)
- Notion (hiérarchie)

## 📝 Livrables Attendus

1. Composants redesignés (code TypeScript + MUI)
2. Nouvelles animations/transitions CSS
3. Documentation des changements
4. Screenshots/mockups si possible

## ⚠️ Contraintes

- Garder structure 3 colonnes
- Respecter dark mode (tokens actuels)
- TypeScript + Material-UI
- Garder champs de données existants

---

**Go!** Fais quelque chose d'incroyable! 🚀
EOF

echo "✅ README créé"

# Créer le ZIP
echo "🗜️  Création du ZIP..."
cd /Users/gouacht/Downloads
zip -r "$ZIP_NAME" "claude-inbox-design-handoff" -q

echo ""
echo "✅ =========================================="
echo "✅ PACKAGE CRÉÉ AVEC SUCCÈS!"
echo "✅ =========================================="
echo ""
echo "📦 Fichier: /Users/gouacht/Downloads/$ZIP_NAME"
echo "📏 Taille: $(du -h "/Users/gouacht/Downloads/$ZIP_NAME" | cut -f1)"
echo ""
echo "📂 Contenu:"
find "$OUTPUT_DIR" -type f | wc -l | xargs echo "   Fichiers:"
echo ""
echo "🎯 Prochaine étape:"
echo "   1. Envoyer le ZIP à Claude Design"
echo "   2. Lui demander de lire CLAUDE_DESIGN_HANDOFF_INBOX.md"
echo "   3. Récupérer les composants redesignés"
echo "   4. Intégrer dans le projet"
echo ""
echo "✨ Prêt pour un design incroyable!"
echo ""
