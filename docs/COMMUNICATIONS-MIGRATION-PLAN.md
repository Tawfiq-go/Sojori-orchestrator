# 📬 Plan de Migration - Communications Hub

**Date**: 2026-05-16
**De**: `sojori-dashboard` → **Vers**: `Sojori-orchestrator`
**Objectif**: Reproduire EXACTEMENT la page Communications avec tous ses onglets

---

## 🎯 ÉTAT ACTUEL

### ❌ **ERREUR ACTUELLE**
```
http://localhost:4174/communications
GET http://localhost:4174/communications 426 (Upgrade Required)
```

### ✅ **RÉFÉRENCE (ancien dashboard)**
```
https://dashboard.sojori.com/admin/Communications?tab=whatsapp
```

---

## 📊 MAPPING EXACT : Ancien → Nouveau

### **ANCIEN DASHBOARD** (`sojori-dashboard`)

**Fichier principal**: `/Users/gouacht/sojori-dashboard/src/features/communications/pages/CommunicationsHubPage.jsx`

**URL**: `/admin/Communications?tab=<onglet>`

**Onglets disponibles** (6 au total) :

| # | Onglet | URL Param | Composant | Status | Action |
|---|--------|-----------|-----------|--------|--------|
| 0 | **Unified** | `tab=unified` | `UnifiedCommunicationsTab.jsx` | ✅ Existe | ❌ **À SUPPRIMER** |
| 1 | **WhatsApp** | `tab=whatsapp` | `WhatsAppTabNew.jsx` (48k lignes) | ✅ Existe | ✅ **À PORTER** |
| 2 | **Staff WhatsApp** | `N/A` | `StaffWAChatPage.jsx` | ✅ Existe | ✅ **À PORTER** |
| 3 | **WA templates (QA)** | `N/A` | ? (non trouvé) | ❓ Inconnu | ⚠️ **À CLARIFIER** |
| 4 | **Messages OTA** | `tab=ota` | `OTAMessagesTab.jsx` (33k lignes) | ✅ Existe | ✅ **À PORTER** |
| 5 | **Demande** | `tab=leads` | `LeadsTab.jsx` (24k lignes) | ✅ Existe | ✅ **À PORTER** |
| 6 | **Avis** | `tab=reviews` | `ReviewsTab.jsx` (38k lignes) | ✅ Existe | ✅ **À PORTER** |

**Note**: **Staff WhatsApp** existe en tant que page SÉPARÉE (`/admin/StaffWhatsApp`), pas comme onglet dans Communications Hub.

---

### **NOUVEAU DASHBOARD** (`Sojori-orchestrator`)

**État actuel** (selon `AGENT-INBOX-DONE.md`) :

| Page | Route | Composant | Status |
|------|-------|-----------|--------|
| WhatsApp Guests | `/communications/whatsapp-guests` | `WhatsAppGuestsPage.tsx` | ✅ **CRÉÉ** |
| WhatsApp Staff | `/communications/whatsapp-staff` | `WhatsAppStaffPage.tsx` | ✅ **CRÉÉ** |
| Messages OTA | `/communications/messages-ota` | `MessagesOTAPage.tsx` | ✅ **CRÉÉ** |

**Manquants** :
- ❌ Onglet **Demande** (Leads)
- ❌ Onglet **Avis** (Reviews)
- ❌ **WA templates (QA)** (si nécessaire)
- ❌ Structure à onglets unifiée (actuellement 3 pages séparées)

---

## 🚨 PROBLÈME IDENTIFIÉ

### **Architecture Actuelle (Agent-Inbox)**
- **3 pages SÉPARÉES** avec routes distinctes :
  - `/communications/whatsapp-guests`
  - `/communications/whatsapp-staff`
  - `/communications/messages-ota`

### **Architecture Attendue (comme ancien dashboard)**
- **1 page UNIQUE** avec **onglets** :
  - `/communications?tab=whatsapp`
  - `/communications?tab=staff`
  - `/communications?tab=ota`
  - `/communications?tab=demande`
  - `/communications?tab=avis`

---

## 🎯 OBJECTIF FINAL

Reproduire **EXACTEMENT** la structure de l'ancien dashboard :

```
/communications?tab=<onglet>
├── Onglet 1: WhatsApp (guests)
├── Onglet 2: Staff WhatsApp
├── Onglet 3: WA templates (QA) [SI NÉCESSAIRE]
├── Onglet 4: Messages OTA
├── Onglet 5: Demande
└── Onglet 6: Avis
```

**Layout** : 3 colonnes (comme ancien) :
- **Colonne 1** : Liste conversations (filtrable)
- **Colonne 2** : Messages du thread sélectionné
- **Colonne 3** : Context panel (réservation/lead/review details)

---

## 📋 PLAN D'ACTION

### **PHASE 1 : Restructuration** 🔴 CRITIQUE

**Durée estimée** : 2-3h

1. **Créer page unifiée** `CommunicationsPage.tsx`
   - Router avec `?tab=<onglet>` (comme ancien)
   - Layout 3 colonnes (comme ancien)
   - Navigation par onglets (Material-UI Tabs)

2. **Migrer les 3 pages existantes en composants onglets**
   - `WhatsAppGuestsPage.tsx` → `WhatsAppGuestsTab.tsx`
   - `WhatsAppStaffPage.tsx` → `WhatsAppStaffTab.tsx`
   - `MessagesOTAPage.tsx` → `MessagesOTATab.tsx`

3. **Créer CommunicationsLayout.tsx**
   - 3 colonnes responsive
   - Context panel collapsible
   - Socket integration (temps réel)

### **PHASE 2 : Porter onglets manquants** 🟠 HAUTE

**Durée estimée** : 6-8h

4. **Créer LeadsTab.tsx** (Demande)
   - Source : `/Users/gouacht/sojori-dashboard/src/features/communications/components/LeadsTab.jsx`
   - API : `/api/v1/admin/threads?source=lead`
   - Estimation : ~600 lignes TypeScript

5. **Créer ReviewsTab.tsx** (Avis)
   - Source : `/Users/gouacht/sojori-dashboard/src/features/communications/components/ReviewsTab.jsx`
   - API : `/api/v1/admin/threads?isReview=true`
   - Estimation : ~800 lignes TypeScript

6. **[OPTIONNEL] Créer WATemplatesTab.tsx** (WA templates QA)
   - Si nécessaire (À CLARIFIER avec utilisateur)
   - API : `/api/v1/ai/flows/templates` (?)
   - Estimation : ~400 lignes TypeScript

### **PHASE 3 : Composants partagés** 🟡 MOYENNE

**Durée estimée** : 2-3h

7. **Créer composants modernes réutilisables**
   - `FilterBar.tsx` (filtres intelligents)
   - `ThreadListItem.tsx` (item liste conversation)
   - `ThreadHeader.tsx` (header gradient par plateforme)
   - `MessageBubble.tsx` (bulle message)
   - `EmptyState.tsx` (état vide)
   - `StatusChip.tsx` (chip status)

8. **Créer design system**
   - `theme.ts` (couleurs par plateforme)
   - `filters.ts` (logique filtrage)
   - `utils.ts` (helpers)

### **PHASE 4 : API Service** 🟢 BASSE

**Durée estimée** : 1-2h

9. **Étendre communicationsService.ts**
   - Ajouter endpoints Leads
   - Ajouter endpoints Reviews
   - Ajouter endpoints Templates (si nécessaire)
   - Typage TypeScript complet

10. **Tests et validation**
    - Tester chaque onglet
    - Vérifier filtres
    - Vérifier temps réel (sockets)
    - Vérifier responsive

---

## 📊 ESTIMATION TOTALE

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1 : Restructuration | 2-3h | 🔴 CRITIQUE |
| Phase 2 : Onglets manquants | 6-8h | 🟠 HAUTE |
| Phase 3 : Composants partagés | 2-3h | 🟡 MOYENNE |
| Phase 4 : API Service | 1-2h | 🟢 BASSE |
| **TOTAL** | **11-16h** | - |

---

## 🔍 INFORMATIONS TECHNIQUES

### **APIs Utilisées**

| Onglet | Endpoint | Service | Collection MongoDB |
|--------|----------|---------|-------------------|
| WhatsApp Guests | `/api/v1/admin/chat-inbox/conversations` | srv-chatbot | conversationMessages |
| Staff WhatsApp | `/api/v1/admin/chat-inbox/conversations?staff=true` | srv-chatbot | conversationMessages |
| Messages OTA | `/api/v1/admin/threads?source=reservation` | srv-reservations | threads |
| Demande (Leads) | `/api/v1/admin/threads?source=lead` | srv-reservations | threads |
| Avis (Reviews) | `/api/v1/admin/threads?isReview=true` | srv-reservations | threads |

### **Authentification**

- **Ancien** : JWT token (Authorization: Bearer)
- **Nouveau** : X-Dev-Token (configuré via VITE_DEV_TOKEN)

### **Socket Integration**

- **Ancien** : `useCommunicationsHubSocket` hook
- **Nouveau** : À implémenter (socket.io-client)

---

## 📖 RÉFÉRENCES

### **Fichiers Source (Ancien Dashboard)**

**Page principale** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/pages/CommunicationsHubPage.jsx`

**Composants onglets** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/UnifiedCommunicationsTab.jsx` (6k lignes)
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/WhatsAppTabNew.jsx` (48k lignes)
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/OTAMessagesTab.jsx` (33k lignes)
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/LeadsTab.jsx` (24k lignes)
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/ReviewsTab.jsx` (38k lignes)

**Staff WhatsApp (page séparée)** :
- `/Users/gouacht/sojori-dashboard/src/features/staffMessages/pages/StaffWAChatPage.jsx`

**Composants modernes (réutilisables)** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/modern/FilterBar.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/modern/ThreadListItem.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/modern/ThreadHeader.jsx`
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/modern/MessageBubble.jsx`

**Services API** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js` (387 lignes)

**Design system** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/design/theme.js`
- `/Users/gouacht/sojori-dashboard/src/features/communications/design/filters.js`
- `/Users/gouacht/sojori-dashboard/src/features/communications/design/utils.js`

### **Fichiers Cibles (Nouveau Dashboard)**

**Emplacement** : `/Users/gouacht/Sojori-orchestrator/src/`

**Structure proposée** :
```
src/
├── pages/
│   └── CommunicationsPage.tsx (NOUVEAU - page principale)
├── components/
│   └── communications/
│       ├── CommunicationsLayout.tsx
│       ├── tabs/
│       │   ├── WhatsAppGuestsTab.tsx (migrer depuis WhatsAppGuestsPage.tsx)
│       │   ├── WhatsAppStaffTab.tsx (migrer depuis WhatsAppStaffPage.tsx)
│       │   ├── MessagesOTATab.tsx (migrer depuis MessagesOTAPage.tsx)
│       │   ├── LeadsTab.tsx (NOUVEAU)
│       │   ├── ReviewsTab.tsx (NOUVEAU)
│       │   └── WATemplatesTab.tsx (OPTIONNEL)
│       ├── shared/
│       │   ├── FilterBar.tsx
│       │   ├── ThreadListItem.tsx
│       │   ├── ThreadHeader.tsx
│       │   ├── MessageBubble.tsx
│       │   ├── EmptyState.tsx
│       │   └── StatusChip.tsx
│       └── ReservationContextPanel.tsx
├── services/
│   └── communicationsService.ts (étendre existant)
├── types/
│   └── communications.types.ts (étendre existant)
└── utils/
    └── communications/
        ├── theme.ts
        ├── filters.ts
        └── utils.ts
```

---

## ❓ QUESTIONS À CLARIFIER

1. **WA templates (QA)** : Cet onglet est-il vraiment nécessaire ? Je ne l'ai pas trouvé dans l'ancien dashboard.
2. **Staff WhatsApp** : Doit-il être un **onglet** dans Communications ou rester une **page séparée** ?
3. **Unified** : Confirmez-vous que cet onglet doit être **supprimé** ?

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

### **Action Immédiate** :

**Option A** : Restructurer TOUT (11-16h)
- Créer structure à onglets
- Migrer les 3 pages existantes
- Ajouter Leads + Reviews
- Tests complets

**Option B** : Ajouter seulement Leads + Reviews (4-6h)
- Garder structure actuelle (3 pages séparées)
- Ajouter 2 nouvelles pages pour Leads et Reviews
- Pas de restructuration

### **Recommandation** :

✅ **Option A** (restructuration complète)
- Plus de travail initial MAIS architecture correcte
- Cohérence avec ancien dashboard
- Maintenance plus facile à long terme
- UX identique pour l'utilisateur

---

**Créé par** : Agent-Inbox (Claude Code)
**Date** : 2026-05-16
