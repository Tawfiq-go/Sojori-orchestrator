# Migration Orchestration V2 - Nouvelles Fonctionnalités

**Date**: 20 mai 2026
**Status**: ✅ Complété (Phase 2)
**PR**: En attente

---

## 🎯 Objectif

Migrer les fonctionnalités manquantes de l'ancien dashboard `sojori-dashboard` vers le nouveau design `sojori-orchestration` pour retrouver la même expérience utilisateur.

**Phase 2** : Ajout de renderers Config/Audit spécifiques par type de workflow (notification, registration, timeslot, staff, createTask, declareArrival, etc.)

---

## ✨ Fonctionnalités Ajoutées

### 1. **Boutons Config/Audit Expansibles** ✅ HAUTE PRIORITÉ

**Fichier**: `src/components/orchestration/WorkflowTimeline.jsx`

**Changements**:
- Ajout de boutons **Config** (orange) et **Audit** (bleu) dans `SubStepDetails`
- Design fidèle à l'ancien dashboard:
  - Boutons côte à côte avec icônes ▶/▼
  - Fond coloré pour les sections dépliées:
    - Config: `#fff3e0` avec bordure `#fb8c00`
    - Audit: `#e3f2fd` avec bordure `#2196f3`
  - Taille 15px, padding 12px, font-weight 700
- Animation `so-fade-in` lors du dépliement
- État local avec `useState` pour gérer l'expansion

**Avant**:
```jsx
{sub.config && Object.keys(sub.config).length > 0 && (
  <>
    <SectionH>Config</SectionH>
    {Object.entries(sub.config).map(...)}
  </>
)}
```

**Après**:
```jsx
{(hasConfig || hasAudit) && (
  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
      {/* Bouton Config */}
      <button onClick={() => setConfigExpanded(!configExpanded)}>
        <span>{configExpanded ? '▼' : '▶'}</span>
        <span>Config</span>
      </button>
      {/* Bouton Audit */}
      <button onClick={() => setAuditExpanded(!auditExpanded)}>
        <span>{auditExpanded ? '▼' : '▶'}</span>
        <span>Audit</span>
      </button>
    </div>
    {/* Contenus dépliables avec fond coloré */}
  </div>
)}
```

---

### 2. **Contenu Détaillé des Messages** ✅ HAUTE PRIORITÉ

**Fichier**: `src/components/orchestration/WorkflowTimeline.jsx`

**Changements**:
- Fonction `RemindersList` améliorée avec état local `expandedReminder`
- Affichage du contenu complet des messages:
  - **Sujet** (subject)
  - **Template** utilisé
  - **Contenu du message** (messageContent) avec scroll si > 200px
  - **Destinataire** (sentTo)
- Design avec fond `#f8f9fa`, bordure gauche bleue `3px solid var(--info)`
- Click sur une relance pour déplier/replier le contenu
- Label "📅 Programmé" pour les messages programmés

**Nouvelles propriétés de reminder supportées**:
- `r.messageContent` - Corps du message
- `r.subject` - Sujet de l'email
- `r.template` - Template utilisé
- `r.sentTo` - Destinataire
- `r.scheduled` - Date de programmation

**Exemple de rendu**:
```
✓ Mar 19/05 à 20:00   📧   ⚡
  ▼ Sujet: Bienvenue à Sojori
     Template: welcome_email_v2
     Contenu:
     ┌─────────────────────────────┐
     │ Bonjour {firstName},        │
     │ Nous sommes ravis de vous...│
     └─────────────────────────────┘
     Destinataire: guest@example.com
```

---

### 3. **Page Audit Trail Globale** ✅ MOYENNE PRIORITÉ

**Nouveau fichier**: `src/components/orchestration/AuditTrailView.jsx`

**Architecture**:
- **Panneau gauche** (350px):
  - Input de recherche
  - Liste des réservations scrollable
  - Sélection avec highlight orange `#fff3e0`
- **Panneau droit** (flex):
  - Header avec numéro de réservation + dates
  - Timeline visuelle avec:
    - Ligne verticale grise
    - Dots colorés par type d'événement
    - Icônes: ✅ completed, ❌ cancelled, 🔄 updated, 📨 sent, 📧 email, 📱 whatsapp
    - Timestamp et description
  - Détails JSON de l'audit avec pretty-print

**API utilisées**:
- `GET /api/v1/orchestrator/reservations?limit=100`
- `GET /api/v1/orchestrator/audit-trail/{reservationNumber}`
- `GET /api/v1/orchestrator/audit-trail/{reservationNumber}/timeline`

**Intégration dans les onglets**:
- Fichier modifié: `src/components/orchestration/OrchestrationViewWithTabs.jsx`
- Nouvel onglet: **"Audit Trail"** (index 2)
- Route: `?tab=audit`

**Structure des onglets mise à jour**:
```
0: Plans (OrchestrationView)
1: Chronologie (ChronologieView)
2: Audit Trail (AuditTrailView) ← NOUVEAU
3: Événement (placeholder)
4: Daily Ops (placeholder)
5: Configuration (ConfigurationView)
```

---

## 📊 Comparaison Ancien vs Nouveau

| Fonctionnalité | Ancien Dashboard | Nouveau (Après Migration) | Status |
|---------------|------------------|---------------------------|--------|
| Boutons Config/Audit | ✅ Boutons ▶/▼ expansibles | ✅ Identique | ✅ |
| Fond coloré Config/Audit | ✅ Orange/Bleu | ✅ Identique | ✅ |
| Contenu messages | ✅ Corps complet | ✅ Identique | ✅ |
| Page Audit globale | ✅ Vue dédiée | ✅ Onglet dédié | ✅ |
| Timeline événements | ✅ Material UI Timeline | ✅ Custom timeline | ✅ |
| Label "Messages programmés" | ✅ | ✅ Label "📅 Programmé" | ✅ |
| Recherche réservations | ✅ | ✅ | ✅ |

---

## 🚀 Déploiement

### Fichiers Modifiés/Créés

**Phase 1**:
```
src/components/orchestration/
├── WorkflowTimeline.jsx              (modifié - boutons Config/Audit + contenu messages)
├── OrchestrationViewWithTabs.jsx     (modifié - ajout onglet Audit Trail)
└── AuditTrailView.jsx                (nouveau - vue globale audit)
```

**Phase 2** (Renderers par type):
```
src/components/orchestration/
├── WorkflowTimeline.jsx              (modifié - intégration renderConfigByType)
└── WorkflowConfigAuditRenderers.jsx  (nouveau - renderers spécifiques par type)
```

**Documentation**:
```
docs/
└── ORCHESTRATION_MIGRATION_V2.md (ce fichier)
```

### Commandes de Test Local
```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
# Ouvrir http://localhost:4174/orchestration?tab=audit
```

### Commandes de Déploiement
```bash
# Build
cd /Users/gouacht/Sojori-orchestrator
pnpm build

# Vérifier le build
ls -lh dist/

# Déployer sur Vercel ou serveur de prod
# (selon le processus de déploiement configuré)
```

---

## ✅ Checklist de Test

- [ ] Tester boutons Config/Audit sur plusieurs workflows
- [ ] Vérifier dépliement du contenu des messages
- [ ] Tester la page Audit Trail globale
- [ ] Vérifier la recherche de réservations
- [ ] Tester la timeline d'événements
- [ ] Vérifier le responsive sur mobile
- [ ] Tester les animations (so-fade-in)
- [ ] Vérifier l'intégration avec les API backend

---

## 📝 Notes Techniques

### Design Tokens Utilisés
```css
var(--bg-sub)      /* Fond sections dépliées */
var(--border)      /* Bordures */
var(--success)     /* Vert pour succès */
var(--error)       /* Rouge pour erreurs */
var(--warning)     /* Orange pour avertissements */
var(--info)        /* Bleu pour informations */
var(--text-h)      /* Texte headers */
var(--text-muted)  /* Texte secondaire */
```

### Animations CSS
```css
.so-fade-in        /* Animation d'apparition */
```

### Polices
```css
font-family: "Geist Mono", monospace  /* Code et timestamps */
font-family: "Geist", system-ui       /* Texte principal */
```

---

## 🆕 Phase 2 : Renderers Spécifiques par Type

### **Nouveau Fichier : `WorkflowConfigAuditRenderers.jsx`**

Ce fichier contient des fonctions de rendu Config spécifiques pour chaque type de workflow, reproduisant fidèlement la logique de l'ancien dashboard.

#### **Types Supportés**:

1. **`notification` / `sendEmail` / `sendWhatsApp`**
   - Sections: ⚙️ Règle + 📨 Canal & Message
   - Affiche: Moment, Condition, Rappels, Heures envoi, Canal, Source réelle, Message

2. **`registration` / `requestRegistration`**
   - Section: 🔐 Configuration Registration
   - Affiche: Type de formulaire, Deadline, Champs requis, Fréquence relances

3. **`timeslot` / `requestTimeslot`**
   - Section: 🎫 Configuration Timeslot
   - Affiche: Type de tâche, Créneaux disponibles, Durée, Deadline choix, Relances

4. **`staff` / `assignStaff`**
   - Section: 👤 Configuration Staff
   - Affiche: Mode d'assignation, Tentatives max, Critères, Stratégie fallback

5. **`createTask`**
   - Section: 📋 Configuration Tâche
   - Affiche: Type de tâche, Priorité, Assigné à, Date d'échéance

6. **`declareArrival`**
   - Section: ✈️ Configuration Arrivée
   - Affiche: Fenêtre d'arrivée, Confirmation requise, Notifier le staff

7. **Fallback Générique**
   - Pour les types non reconnus, affiche la structure notification + config générique

#### **Fonction Principale**:
```javascript
renderConfigByType(workflowType, actionType, config)
```

Cette fonction route automatiquement vers le bon renderer en fonction du type détecté.

---

## 🔜 Améliorations Futures (Optionnelles)

- [ ] Ajouter filtres avancés dans Audit Trail (par date, type d'événement)
- [ ] Export CSV/JSON de l'audit trail
- [ ] Notifications temps réel des nouveaux événements
- [ ] Graphiques statistiques par type d'événement
- [ ] Comparaison d'audit entre deux réservations
- [ ] Recherche full-text dans le contenu des messages
- [ ] Renderers Audit spécifiques par type (actuellement générique)

---

## 📚 Références

- Issue GitHub: (à créer)
- Design Figma: (si disponible)
- Documentation API: `/api/v1/orchestrator/audit-trail`
- Ancien dashboard: `/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/`

---

**Auteur**: Claude Code
**Reviewer**: @gouacht
**Date de révision**: En attente
