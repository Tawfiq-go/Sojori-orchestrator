# 🎯 PROMPT AMÉLIORATION - PAGE CHRONOLOGIE ORCHESTRATION

## Contexte

Je travaille sur un dashboard property management (Sojori) et j'ai besoin d'améliorer la page **Chronologie d'orchestration** qui affiche tous les événements d'une réservation.

**Technologie:** React + MUI v9 + Emotion CSS-in-JS

---

## 📊 ÉTAT ACTUEL vs ATTENDU

### Version actuelle (simplifiée)
- Seulement 5 événements affichés
- Manque de détails et de contexte
- Pas assez d'états visuels (COMPLETED, PENDING, INFO, ERROR)
- Manque d'indicateurs de fenêtre d'action
- Pas de relances/essais visibles

### Version cible (comme l'ancien dashboard)
**Événements complets à afficher:**

#### 12 mai · J-3 (Réservation)
```
✓ 10:14 Réservation confirmée [COMPLETED]
  Auto · Airbnb · ID HMXY42TZ8K · €1,840

✨ 10:14 (+18s) Workflow orchestrateur déclenché [COMPLETED]
  AI · 23 tâches générées · Villa Belvédère Long séjour

📧 10:18 (+4min) Message bienvenue envoyé [COMPLETED]
  WhatsApp · welcome-villa · 🇬🇧 EN · Lu il y a 2min
  "Hi Sarah! 👋 Welcome to Villa Belvédère..."
```

#### 13 mai · J-2
```
📱 14:30 Enregistrement voyageur envoyé [INFO]
  WhatsApp · registration-form-link · Fenêtre: Disponible
  Expiration: 14 mai 23:59

📱 19:45 Sarah a complété l'enregistrement [COMPLETED]
  Form · Passeport scanné · Données vérifiées ✓
```

#### 14 mai · J-1
```
🔐 09:00 Code d'accès généré [COMPLETED]
  Auto · Code: 4829* · Villa Belvédère
  Envoi prévu: 15 mai 14:00

🎫 10:00 Déclaration police programmée [PENDING]
  Deadline: 15 mai 18:00 · Statut: En attente données
```

#### 15 mai · Check-in (AUJOURD'HUI)
```
🔐 14:00 Code accès envoyé [COMPLETED]
  WhatsApp · access-code · Code: 4829* · Lu il y a 30min

🛬 16:14 Sarah a effectué son check-in [COMPLETED] ⭐ CRITIQUE
  Auto · QR + GPS · ID + photo · Vidéo welcome vue 2 fois

📧 18:00 Déclaration police envoyée [COMPLETED]
  API · Préfecture · Statut: Accepté ✓

🧹 19:00 Ménage de fin programmé [PENDING]
  Assigné: Marie Dupont · Check-out prévu: 22 mai 11:00
```

#### 16 mai · J+1
```
📧 10:00 Message feedback demandé [PENDING]
  Envoi prévu: Demain 10:00 · Template: midstay-feedback
```

#### 17 mai · J+2
```
📧 10:00 Message mid-stay programmé [FUTURE]
  Template midstay-villa · Personnalisation AI
  Fenêtre: Trop tôt (J-2)
```

#### 22 mai · Check-out
```
📧 08:00 Rappel check-out programmé [FUTURE]
  WhatsApp · checkout-reminder · Envoi: 22 mai 08:00

🛫 11:00 Check-out prévu [FUTURE]
  Deadline · QR code · Vidéo checkout à filmer

🧹 12:00 Ménage complet programmé [FUTURE]
  Assigné: Marie Dupont · Durée estimée: 3h

📧 14:00 Message merci programmé [FUTURE]
  Template: thank-you-villa · Délai: +3h après checkout
```

#### 23 mai · J+1 post-checkout
```
📧 10:00 Demande avis Airbnb programmée [FUTURE]
  Template: request-review-airbnb · Fenêtre: Trop tôt (J-1)
```

---

## 🎨 DESIGN SYSTEM À UTILISER

### Palette
```javascript
const tokens = {
  // Backgrounds
  bg1: '#ffffff',
  bg2: '#fbfaf6',

  // Borders
  border: 'rgba(0,0,0,0.06)',

  // Text
  text1: '#0c0a09',
  text2: '#57534e',
  text3: '#78716c',
  text4: '#a8a29e',

  // Status colors
  success: '#10b981',
  successTint: 'rgba(16,185,129,0.10)',

  warning: '#f59e0b',
  warningTint: 'rgba(245,158,11,0.10)',

  error: '#ef4444',
  errorTint: 'rgba(239,68,68,0.10)',

  info: '#06b6d4',
  infoTint: 'rgba(6,182,212,0.10)',

  ai: '#8b5cf6',
  aiTint: 'rgba(139,92,246,0.10)',

  gold: '#e6b022',
  goldTint: 'rgba(230,176,34,0.10)',
};
```

### Composants existants
```javascript
// Timeline
<OrchestrationTimeline>
  <TLEvent
    time={<><strong>10:14</strong> · il y a 3 jours</>}
    icon="✓"
    iconBg={tokens.successTint}
    iconColor={tokens.success}
    title="Réservation confirmée"
    badge={<Badge variant="success">Auto</Badge>}
    meta="Détails..."
    quote="Citation optionnelle"
    critical={false} // Marqueur visuel important
    future={false}   // État futur (grisé)
  />
</OrchestrationTimeline>

// Day separator
<TLDayLabel>15 mai · Check-in</TLDayLabel>

// Badges
<Badge variant="success">Auto</Badge>
<Badge variant="ai">AI</Badge>
<Badge variant="info">WhatsApp</Badge>
<Badge variant="warning">Retard</Badge>
<Badge variant="error">Erreur</Badge>
```

---

## 🎯 DEMANDES PRÉCISES

### 1. Enrichir les événements
Ajoute **TOUS les événements** listés ci-dessus avec:
- États visuels clairs: COMPLETED ✓, PENDING ⏳, INFO ℹ️, FUTURE 📅, ERROR ❌
- Indicateurs de fenêtre: "Disponible", "Trop tôt", "Retard"
- Relances et essais (ex: "2ème relance", "Essai 1/3")
- Citations pour messages WhatsApp

### 2. Améliorer les états visuels

**COMPLETED:**
- Icon background: `tokens.successTint`
- Icon color: `tokens.success`
- Badge: `<Badge variant="success">Auto</Badge>`

**PENDING:**
- Icon background: `tokens.warningTint`
- Icon color: `tokens.warning`
- Badge: `<Badge variant="warning">En attente</Badge>`

**INFO:**
- Icon background: `tokens.infoTint`
- Icon color: `tokens.info`
- Badge: `<Badge variant="info">Info</Badge>`

**FUTURE (pas encore arrivé):**
- Icon background: `tokens.bg2`
- Icon color: `tokens.text4`
- Opacité réduite sur le texte
- Prop `future={true}` sur `<TLEvent>`

**CRITICAL (événement important):**
- Bordure gauche dorée
- Icône ⭐ ou marqueur visuel
- Prop `critical={true}` sur `<TLEvent>`

### 3. Ajouter métadonnées riches

Pour chaque événement, inclure:
- **Timestamp précis**: "10:14", "+4min", "dans 2 jours"
- **Source/Type**: Auto, AI, WhatsApp, API, Manual
- **Détails contextuels**: ID, codes, templates, statuts
- **Fenêtre d'action** si applicable: "Disponible", "Trop tôt (J-2)", "Retard de 3h"
- **Relances/Essais** si applicable: "2ème relance", "Essai 2/3"

### 4. Grouper par jours avec séparateurs

Utilise `<TLDayLabel>` pour:
```javascript
<TLDayLabel>12 mai · J-3 · Réservation</TLDayLabel>
<TLDayLabel>13 mai · J-2</TLDayLabel>
<TLDayLabel>15 mai · Check-in · AUJOURD'HUI</TLDayLabel>
<TLDayLabel>22 mai · Check-out</TLDayLabel>
```

### 5. Panel latéral (Résumé)

Conserver le panel "Résumé séjour" avec:
- Statut workflow
- Avancement (X/23 tâches)
- Prochaine action (date + heure)
- Anomalies détectées
- Revenu net

Ajouter un **AI Card** avec:
- Recommandations contextuelles
- Suggestions d'actions
- Alertes proactives

---

## 📝 CODE À GÉNÉRER

**Génère le code complet de `OrchestrationPage.tsx`** avec:
1. Tous les événements listés ci-dessus
2. États visuels appropriés (COMPLETED, PENDING, INFO, FUTURE, CRITICAL)
3. Badges et métadonnées enrichis
4. Séparateurs de jours
5. Panel latéral résumé
6. AI Card avec suggestions

**Format attendu:**
```typescript
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, OrchestrationTimeline, TLEvent, TLDayLabel,
  AICard, Badge, Revenue,
  btnGhostSx, btnAiSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography } from '@mui/material';

export function OrchestrationPage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Chronologie']}>
      {/* ... code ici ... */}
    </DashboardWrapper>
  );
}
```

---

## ✅ CRITÈRES DE SUCCÈS

- [ ] 20+ événements affichés (du J-3 au J+1 post-checkout)
- [ ] 5 états visuels distincts (COMPLETED, PENDING, INFO, FUTURE, CRITICAL)
- [ ] Indicateurs de fenêtre visibles ("Disponible", "Trop tôt", "Retard")
- [ ] Relances/essais affichés quand pertinent
- [ ] Séparateurs de jours clairs
- [ ] Panel résumé avec stats
- [ ] AI Card avec recommandations
- [ ] Code TypeScript compilable sans erreur
- [ ] Design cohérent avec le reste du dashboard (tokens, spacing, typo)

---

## 🎨 INSPIRATION VISUELLE

**Référence:** Timeline GitHub, Linear, Notion

**Style:**
- Ligne verticale continue à gauche
- Icônes circulaires colorées
- Timestamps à droite de l'icône
- Métadonnées en police plus petite, grise
- Citations en bloc indentées
- Espacement généreux entre événements (16-20px)

---

## 🚨 CONTRAINTES IMPORTANTES

1. **Utiliser UNIQUEMENT les composants déjà existants** dans `DashboardV2.components.jsx`:
   - `<OrchestrationTimeline>`
   - `<TLEvent>`
   - `<TLDayLabel>`
   - `<Badge>`
   - `<Panel>`
   - `<AICard>`

2. **Ne PAS créer de nouveaux composants** - tout doit s'appuyer sur l'existant

3. **Respecter le design system** (tokens, palette, spacing)

4. **Code TypeScript propre** sans any, avec types explicites

5. **Responsive** - fonctionne sur desktop et mobile

---

## 📌 NOTES ADDITIONNELLES

- L'ancien dashboard affichait cette timeline sur `http://localhost:3000/admin/orchestrator`
- C'est la page la PLUS IMPORTANTE du dashboard - elle montre toute l'intelligence du système
- Les owners doivent voir en un coup d'œil l'état d'avancement de chaque réservation
- Les couleurs et badges doivent permettre une lecture rapide (rouge = problème, vert = OK, bleu = info, orange = en attente)

---

**Question finale pour Claude Design:**

Peux-tu générer le code complet de `OrchestrationPage.tsx` avec tous les événements, états visuels et métadonnées détaillés ci-dessus, en utilisant les composants existants `<TLEvent>`, `<TLDayLabel>`, etc. ?

Le rendu doit être professionnel, facile à scanner visuellement, et montrer clairement l'état d'avancement de la réservation.
