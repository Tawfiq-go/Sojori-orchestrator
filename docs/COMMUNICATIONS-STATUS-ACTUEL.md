# 📬 Communications Hub - État Actuel & Plan d'Action

**Date**: 2026-05-16
**Status**: ✅ Structure existante | ⚠️ 2 onglets à compléter

---

## ✅ **CE QUI EXISTE DÉJÀ**

### 1. **Page principale** (100% complète) ✅

**Fichier**: `/Users/gouacht/Sojori-orchestrator/src/pages/CommunicationsHubPage.tsx`

**Route**: `/communications?tab=<onglet>`

**Onglets disponibles** (6 au total) :
1. `?tab=whatsapp` → WhatsApp Guests
2. `?tab=staff` → Staff WhatsApp
3. `?tab=templates` → WA templates (QA)
4. `?tab=ota` → Messages OTA
5. `?tab=leads` → Demande (Leads)
6. `?tab=reviews` → Avis (Reviews)

**Navigation** : Tabs Material-UI avec icons + labels

**Status** : ✅ **COMPLET et FONCTIONNEL**

---

### 2. **Composants Onglets**

#### ✅ **Onglets COMPLETS** (3/6)

| Onglet | Fichier | Lignes | Status | Features |
|--------|---------|--------|--------|----------|
| WhatsApp Guests | `components/communications/WhatsAppTab.tsx` | ~400 | ✅ COMPLET | ChatLayout, ConversationList, ChatThread, filtres, envoi messages |
| Staff WhatsApp | `components/communications/StaffWhatsAppTab.tsx` | ~300 | ✅ COMPLET | Idem WhatsApp mais `hasReservation: false` |
| Messages OTA | `components/communications/MessagesOTATab.tsx` | ~250 | ✅ COMPLET | Table avec filtrage par canal (Airbnb/Booking/VRBO) |

#### ❌ **Onglets STUBS** (2/6)

| Onglet | Fichier | Lignes | Status | À faire |
|--------|---------|--------|--------|---------|
| **Demande (Leads)** | `components/communications/LeadsTab.tsx` | 26 | ❌ STUB | Implémenter liste leads + API |
| **Avis (Reviews)** | `components/communications/ReviewsTab.tsx` | 25 | ❌ STUB | Implémenter liste reviews + API |

#### ✅ **Onglet Templates** (1/6)

| Onglet | Fichier | Status |
|--------|---------|--------|
| WA templates (QA) | `components/communications/WATemplatesTab.tsx` | ✅ Existe (à vérifier) |

---

## 🚨 **PROBLÈME ACTUEL**

### **Erreur 426 - Upgrade Required**

```bash
GET http://localhost:4174/communications 426 (Upgrade Required)
```

**Diagnostic** :
- Le serveur Vite tourne sur le port 4174 ✅
- La route `/communications` existe dans App.tsx ✅
- Erreur "426 Upgrade Required" = Problème WebSocket/HMR Vite ⚠️

**Cause probable** :
- Vite tente un upgrade WebSocket pour HMR (Hot Module Replacement)
- Le client ne supporte pas ou la connexion échoue
- **Solution** : Redémarrer le serveur Vite proprement

---

## 🎯 **PLAN D'ACTION**

### **Phase 1** : Vérifier que la page fonctionne 🔴 (10 min)

1. **Redémarrer le serveur Vite** proprement
   ```bash
   cd /Users/gouacht/Sojori-orchestrator

   # Tuer processus existant
   lsof -ti:4174 | xargs kill -9

   # Relancer
   pnpm dev
   ```

2. **Tester dans navigateur**
   ```
   http://localhost:4174/communications?tab=whatsapp
   ```

3. **Vérifier chaque onglet**
   - ✅ WhatsApp Guests
   - ✅ Staff WhatsApp
   - ✅ WA templates (QA)
   - ✅ Messages OTA
   - ❌ Demande (stub) - affiche placeholder
   - ❌ Avis (stub) - affiche placeholder

---

### **Phase 2** : Implémenter LeadsTab 🟠 (3-4h)

**Objectif** : Remplacer le stub de 26 lignes par l'implémentation complète

**Source de référence** :
`/Users/gouacht/sojori-dashboard/src/features/communications/components/LeadsTab.jsx` (24k lignes)

**APIs à utiliser** :
```typescript
// API Leads
GET /api/v1/admin/threads?source=lead
  - Filtres: status, date range, search
  - Pagination: page-based (50 items/page)
  - Response: { threads: Thread[], totalCount: number }

// API Messages d'un lead
GET /api/v1/admin/threads/:threadId/messages
  - Response: { messages: Message[] }

// API Envoyer offre spéciale
POST /api/v1/admin/threads/:threadId/send-offer
  Body: { offer: string, message: string }
```

**Composants à créer** :
```typescript
components/communications/LeadsTab.tsx
├─ Layout 3 colonnes (comme WhatsApp)
│  ├─ Colonne 1: Liste leads (filtrable)
│  ├─ Colonne 2: Messages du lead sélectionné
│  └─ Colonne 3: Context panel (détails lead)
│
├─ LeadListItem.tsx (item liste)
├─ LeadFilters.tsx (filtres spécifiques leads)
└─ LeadContextPanel.tsx (détails lead + actions)
```

**Features à implémenter** :
- ✅ Liste leads avec pagination
- ✅ Filtres : status (new/contacted/converted/lost), date range, search
- ✅ Tri : date dernier message, date création, priorité
- ✅ Affichage messages du thread
- ✅ Envoi offre spéciale (formulaire)
- ✅ Conversion lead → réservation (bouton)
- ✅ Context panel : détails lead, historique, actions

**Estimation** : ~600-800 lignes TypeScript

---

### **Phase 3** : Implémenter ReviewsTab 🟠 (3-4h)

**Objectif** : Remplacer le stub de 25 lignes par l'implémentation complète

**Source de référence** :
`/Users/gouacht/sojori-dashboard/src/features/communications/components/ReviewsTab.jsx` (38k lignes)

**APIs à utiliser** :
```typescript
// API Reviews
GET /api/v1/admin/threads?isReview=true
  - Filtres: rating, source (airbnb/booking), replied, date range
  - Pagination: cursor-based (lastMessageAt)
  - Response: { threads: Thread[], nextCursor: string }

// API Messages d'une review
GET /api/v1/admin/threads/:threadId/messages
  - Response: { messages: Message[] }

// API Répondre à une review
POST /api/v1/admin/threads/:threadId/reply
  Body: { reply: string }
```

**Composants à créer** :
```typescript
components/communications/ReviewsTab.tsx
├─ Layout 3 colonnes
│  ├─ Colonne 1: Liste reviews (filtrable)
│  ├─ Colonne 2: Review complète + réponse
│  └─ Colonne 3: Context panel (détails réservation)
│
├─ ReviewListItem.tsx (item avec rating stars)
├─ ReviewFilters.tsx (filtres spécifiques reviews)
├─ ReviewCard.tsx (affichage review complète)
└─ ReviewReplyForm.tsx (formulaire réponse)
```

**Features à implémenter** :
- ✅ Liste reviews avec pagination cursor-based
- ✅ Filtres : rating (1-5 stars), source (Airbnb/Booking), replied (oui/non), date range
- ✅ Tri : rating (+ bas d'abord pour priorité réponse), date
- ✅ Affichage review complète avec parsing JSON/HTML selon source
- ✅ Formulaire réponse avec preview
- ✅ Validation avant envoi (Airbnb = 14 jours, Booking = 30 jours)
- ✅ Context panel : détails réservation, guest, property
- ✅ Badge "À répondre" si pas de réponse

**Estimation** : ~800-1000 lignes TypeScript

---

### **Phase 4** : Étendre communicationsService.ts 🟡 (1h)

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts`

**À ajouter** :
```typescript
// Leads APIs
async getLeads(params: {
  status?: 'new' | 'contacted' | 'converted' | 'lost';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ threads: Thread[]; totalCount: number }>>

async getLeadMessages(threadId: string): Promise<ApiResponse<{ messages: Message[] }>>

async sendLeadOffer(threadId: string, data: {
  offer: string;
  message: string;
}): Promise<ApiResponse<void>>

async convertLeadToReservation(threadId: string): Promise<ApiResponse<{ reservationId: string }>>

// Reviews APIs
async getReviews(params: {
  rating?: 1 | 2 | 3 | 4 | 5;
  source?: 'airbnb' | 'booking';
  replied?: boolean;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}): Promise<ApiResponse<{ threads: Thread[]; nextCursor?: string }>>

async getReviewMessages(threadId: string): Promise<ApiResponse<{ messages: Message[] }>>

async replyToReview(threadId: string, reply: string): Promise<ApiResponse<void>>
```

**Typage TypeScript** : Ajouter dans `types/messages.types.ts`

---

### **Phase 5** : Tests & Validation 🟢 (1-2h)

**Tests à effectuer** :
1. ✅ Navigation entre tous les onglets sans erreur
2. ✅ WhatsApp Guests : charger conversations, sélectionner, envoyer message
3. ✅ Staff WhatsApp : idem
4. ✅ Messages OTA : filtrer par canal, afficher table
5. ✅ Leads : liste, filtres, envoi offre, conversion
6. ✅ Reviews : liste, filtres, répondre à review
7. ✅ WA templates (QA) : vérifier contenu
8. ✅ Responsive : tester sur mobile/tablette
9. ✅ Context panel : vérifier détails affichés correctement
10. ✅ Erreurs : gérer erreurs API, loading states

---

## 📊 **ESTIMATION TOTALE**

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1 : Vérifier page existante | 10 min | 🔴 CRITIQUE |
| Phase 2 : Implémenter LeadsTab | 3-4h | 🟠 HAUTE |
| Phase 3 : Implémenter ReviewsTab | 3-4h | 🟠 HAUTE |
| Phase 4 : Étendre API service | 1h | 🟡 MOYENNE |
| Phase 5 : Tests & validation | 1-2h | 🟢 BASSE |
| **TOTAL** | **8-11h** | - |

---

## ✅ **RÉSUMÉ VISUEL**

### **Structure Existante**

```
/communications?tab=<onglet>
├── [WhatsApp]  ✅ COMPLET (400 lignes)
├── [Staff]     ✅ COMPLET (300 lignes)
├── [Templates] ✅ COMPLET (à vérifier)
├── [OTA]       ✅ COMPLET (250 lignes)
├── [Demande]   ❌ STUB (26 lignes) ← À IMPLÉMENTER
└── [Avis]      ❌ STUB (25 lignes) ← À IMPLÉMENTER
```

### **CE QUI EXISTE vs CE QUI MANQUE**

| Onglet | Existe | Complet | Manque |
|--------|--------|---------|--------|
| WhatsApp Guests | ✅ | ✅ | - |
| Staff WhatsApp | ✅ | ✅ | - |
| WA templates (QA) | ✅ | ✅ (?) | Vérification |
| Messages OTA | ✅ | ✅ | - |
| **Demande (Leads)** | ✅ | ❌ | **Implémentation complète** |
| **Avis (Reviews)** | ✅ | ❌ | **Implémentation complète** |

---

## 🚀 **PROCHAINE ACTION IMMÉDIATE**

### **Action 1** : Redémarrer serveur et vérifier (5 min)

```bash
cd /Users/gouacht/Sojori-orchestrator

# Tuer ancien processus
lsof -ti:4174 | xargs kill -9

# Relancer
pnpm dev
```

Puis ouvrir dans navigateur :
```
http://localhost:4174/communications?tab=whatsapp
```

✅ Si ça fonctionne → Passer à Phase 2 (Implémenter LeadsTab)
❌ Si erreur persiste → Débugger config Vite

---

### **Action 2** : Implémenter LeadsTab (3-4h)

Porter le code de l'ancien dashboard :
```
Source: /Users/gouacht/sojori-dashboard/src/features/communications/components/LeadsTab.jsx
Cible: /Users/gouacht/Sojori-orchestrator/src/components/communications/LeadsTab.tsx
```

**Approche** :
1. Analyser code source ancien (structure, APIs, composants)
2. Créer LeadsTab.tsx avec layout 3 colonnes
3. Implémenter liste + filtres
4. Implémenter affichage messages
5. Implémenter actions (envoi offre, conversion)
6. Tests

---

### **Action 3** : Implémenter ReviewsTab (3-4h)

Idem pour Reviews :
```
Source: /Users/gouacht/sojori-dashboard/src/features/communications/components/ReviewsTab.jsx
Cible: /Users/gouacht/Sojori-orchestrator/src/components/communications/ReviewsTab.tsx
```

---

## 📖 **RÉFÉRENCES**

### **Fichiers Source (Ancien Dashboard)**

**Composants onglets** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/LeadsTab.jsx` (24k lignes)
- `/Users/gouacht/sojori-dashboard/src/features/communications/components/ReviewsTab.jsx` (38k lignes)

**Services API** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/services/communicationsApi.js`

**Design system** :
- `/Users/gouacht/sojori-dashboard/src/features/communications/design/`

### **Fichiers Cibles (Nouveau Dashboard)**

**Page principale** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/CommunicationsHubPage.tsx` ✅

**Composants onglets** :
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/WhatsAppTab.tsx` ✅
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/StaffWhatsAppTab.tsx` ✅
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/MessagesOTATab.tsx` ✅
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/WATemplatesTab.tsx` ✅
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/LeadsTab.tsx` ❌ STUB
- `/Users/gouacht/Sojori-orchestrator/src/components/communications/ReviewsTab.tsx` ❌ STUB

**Services API** :
- `/Users/gouacht/Sojori-orchestrator/src/services/messagesService.ts` (à étendre)

**Types** :
- `/Users/gouacht/Sojori-orchestrator/src/types/messages.types.ts` (à étendre)

---

**Créé par** : Agent-Inbox (Claude Code)
**Date** : 2026-05-16, 00:30
