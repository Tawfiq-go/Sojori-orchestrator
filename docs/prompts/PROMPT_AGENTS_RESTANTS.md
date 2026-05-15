# 🤖 PROMPTS AGENTS 3-8 (VERSION CONCISE)

Les agents 3 à 8 suivent la même structure que Agent-Orchestration et Agent-Reservations.

---

## 🔒 SÉCURITÉ OBLIGATOIRE

Avant toute modification de route ou d'API, lire en entier :

`/Users/gouacht/sojori-production/SECURITY_RULES.md`

Rappels non négociables pour tous les agents :
- toutes les routes `srv-admin` sont protégées par défaut par middleware global
- ne jamais ajouter de routes publiques sauf webhooks externes / exceptions explicitement justifiées
- ajouter un contrôle de rôle explicite pour les routes admin-only sensibles
- toujours valider les données côté serveur
- ne jamais hardcoder de secrets

---

## 3️⃣ AGENT-CALENDRIER

**Nom** : `Agent-Calendrier`
**Backend** : srv-calendar (port 4006)
**Mission** : Connecter CalendarInventoryPage aux vraies APIs

### Routes backend à identifier
- GET /api/v1/calendar/:propertyId/:month
- PUT /api/v1/calendar/prices
- PUT /api/v1/calendar/availability
- GET /api/v1/pricing/suggestions (AI)

### Fichiers à créer
- `src/services/calendarService.ts`
- `src/types/calendar.types.ts`

### Fichiers à modifier
- `src/pages/CalendarInventoryPage.tsx` - Remplacer `generateDays()` par API call
- `src/components/MultiPropertyInventory.tsx` - Utiliser vraies données

### Points clés
- La UI existe déjà (CalendarInventoryPage)
- Remplacer le mock `generateDays()` par `calendarService.getMonth()`
- Implémenter bulk update (multi-selection jours)
- Connecter DayDetailPanel aux vraies données

---

## 4️⃣ AGENT-INBOX

**Nom** : `Agent-Inbox`
**Backend** : srv-chatbot (port 4000)
**Mission** : Créer système messagerie (WhatsApp + OTA)

### Routes backend à identifier
- GET /api/v1/messages
- GET /api/v1/messages/conversations
- GET /api/v1/messages/conversation/:id
- POST /api/v1/messages/send
- GET /api/v1/whatsapp/templates
- POST /api/v1/whatsapp/send-template

### Fichiers à créer
- `src/services/messagesService.ts`
- `src/types/messages.types.ts`
- `src/pages/WhatsAppGuestsPage.tsx`
- `src/pages/WhatsAppStaffPage.tsx`
- `src/pages/MessagesOTAPage.tsx`

### UI à créer
- Layout 2 colonnes (liste conversations + messages)
- Bulles de messages (reçu à gauche, envoyé à droite)
- Input envoi message
- Sélecteur templates WhatsApp
- Filtres (non lus, guests vs staff)

### Routes à ajouter
```tsx
<Route path="/communications/whatsapp-guests" element={<WhatsAppGuestsPage />} />
<Route path="/communications/whatsapp-staff" element={<WhatsAppStaffPage />} />
<Route path="/communications/messages-ota" element={<MessagesOTAPage />} />
```

---

## 5️⃣ AGENT-TASKS

**Nom** : `Agent-Tasks`
**Backend** : srv-task (port 4005)
**Mission** : Créer système gestion tâches

### Routes backend à identifier
- GET /api/v1/tasks
- POST /api/v1/tasks
- PUT /api/v1/tasks/:id
- DELETE /api/v1/tasks/:id
- PUT /api/v1/tasks/:id/status
- GET /api/v1/tasks/by-assignee/:userId
- GET /api/v1/team

### Fichiers à créer
- `src/services/tasksService.ts`
- `src/types/tasks.types.ts`
- `src/pages/TasksListPage.tsx`
- `src/pages/TasksTeamPage.tsx`
- `src/pages/TasksPlanningPage.tsx`

### UI à créer
- **Liste** : Tableau tâches (titre, assigné, deadline, status, priorité)
- **Team** : Cartes membres équipe + leurs tâches
- **Planning** : Vue Kanban (colonnes: todo, in_progress, done)

### Design
- Badges status : todo (default), in_progress (warning), done (success)
- Badges priorité : low, medium, high, urgent
- Avatars membres équipe
- Filtres (status, assigné, propriété, date)

### Routes à ajouter
```tsx
<Route path="/tasks/list" element={<TasksListPage />} />
<Route path="/tasks/team" element={<TasksTeamPage />} />
<Route path="/tasks/planning" element={<TasksPlanningPage />} />
```

---

## 6️⃣ AGENT-ANNONCES

**Nom** : `Agent-Annonces`
**Backend** : srv-listing (port 4001)
**Mission** : Créer gestion annonces/listings

### Routes backend à identifier
- GET /api/v1/listings
- POST /api/v1/listings
- PUT /api/v1/listings/:id
- DELETE /api/v1/listings/:id
- GET /api/v1/listings/:id/channels
- POST /api/v1/listings/:id/sync

### Fichiers à créer
- `src/services/listingsService.ts`
- `src/types/listings.types.ts`
- `src/pages/ListingsPage.tsx`
- `src/pages/ListingDetailPage.tsx`
- `src/pages/ChannelsPage.tsx`
- `src/pages/PricingPage.tsx`

### UI à créer
- **Listings** : Grille cartes (photo gradient, nom, ville, status)
- **Détail** : Formulaire complet (infos, photos, équipements, règles)
- **Canaux** : Status sync (Airbnb, Booking, Direct) avec icônes
- **Pricing** : Configuration tarifs (base, week-end, saisons)

### Design
- Grille 3 colonnes cartes (comme PROPERTIES existant)
- Badges status : active (success), inactive (default), draft (warning)
- Icônes canaux : 🏠 Airbnb, 🅱️ Booking, 📧 Direct

### Routes à ajouter
```tsx
<Route path="/catalogue/listings" element={<ListingsPage />} />
<Route path="/catalogue/listings/:id" element={<ListingDetailPage />} />
<Route path="/catalogue/channels" element={<ChannelsPage />} />
<Route path="/catalogue/pricing" element={<PricingPage />} />
```

---

## 7️⃣ AGENT-DASHBOARD ⚠️ SPÉCIAL

**Nom** : `Agent-Dashboard`
**Backend** : srv-admin (port 4002)
**Mission** : Réutiliser code de sojori-dashboard

### ⚠️ APPROCHE DIFFÉRENTE

**NE PAS créer from scratch !**

1. **Lire le code existant** :
   ```bash
   # Trouver le fichier Dashboard
   find /Users/gouacht/sojori-dashboard/src -name "*Dashboard*.tsx" -o -name "*Dashboard*.jsx"
   
   # Trouver le service API
   find /Users/gouacht/sojori-dashboard/src/services -name "*dashboard*"
   ```

2. **Copier la logique API** :
   - Copier `dashboardService.ts` (ou équivalent)
   - Copier les types
   - Copier la logique de fetch des KPIs

3. **Adapter le design** :
   - Remplacer les styles par Aurora Soft Light
   - Utiliser Panel, Badge, tokens from DashboardV2.components
   - Garder la même structure de données

### Routes backend attendues
- GET /api/v1/dashboard/stats
- GET /api/v1/dashboard/revenue
- GET /api/v1/dashboard/occupancy
- GET /api/v1/dashboard/recent-bookings
- GET /api/v1/dashboard/alerts

### Fichiers à créer
- `src/services/dashboardService.ts` (copier + adapter)
- `src/types/dashboard.types.ts` (copier)
- `src/pages/DashboardPage.tsx` (nouveau design Aurora)

### UI attendue
- KPIs en cartes (revenue, occupancy, bookings, avg rate)
- Charts (line chart revenue, bar chart occupancy)
- Table recent bookings
- Alertes/notifications
- Quick actions

---

## 8️⃣ AGENT-ANALYTICS ⚠️ SPÉCIAL

**Nom** : `Agent-Analytics`
**Backend** : srv-admin (port 4002)
**Mission** : Réutiliser code de sojori-dashboard

### ⚠️ APPROCHE DIFFÉRENTE

**NE PAS créer from scratch !**

1. **Lire le code existant** :
   ```bash
   # Trouver le fichier Analytics
   find /Users/gouacht/sojori-dashboard/src -name "*Analytics*.tsx" -o -name "*Analytics*.jsx"
   
   # Trouver le service API
   find /Users/gouacht/sojori-dashboard/src/services -name "*analytics*"
   ```

2. **Copier la logique API + Charts** :
   - Copier `analyticsService.ts`
   - Copier les types
   - Copier la configuration des charts (Recharts, Chart.js, etc.)
   - Copier la logique de filtres période

3. **Adapter le design** :
   - Remplacer les styles par Aurora Soft Light
   - Utiliser Panel pour encadrer les charts
   - Garder la même librairie de charts

### Routes backend attendues
- GET /api/v1/analytics/revenue
- GET /api/v1/analytics/occupancy
- GET /api/v1/analytics/performance
- GET /api/v1/analytics/channels
- GET /api/v1/analytics/guests
- GET /api/v1/analytics/export

### Fichiers à créer
- `src/services/analyticsService.ts` (copier + adapter)
- `src/types/analytics.types.ts` (copier)
- `src/pages/AnalyticsPage.tsx` (nouveau design Aurora)

### UI attendue
- Filtres période (7j, 30j, 3m, 1an, custom)
- Line chart revenue (évolution dans le temps)
- Bar chart occupation (par propriété)
- Pie chart channels (répartition sources)
- Table performance (par propriété)
- Bouton export CSV/PDF

---

## ✅ CHECKLIST STANDARD (pour agents 3-6)

Chaque agent from scratch suit cette checklist :

1. **Explorer backend**
   - [ ] Lire `/Users/gouacht/sojori-production/SECURITY_RULES.md` avant toute modif route/API
   - [ ] Lire routes dans `/Users/gouacht/sojori-production/apps/srv-[nom]/src/routes/`
   - [ ] Tester avec curl `http://localhost:[PORT]/api/v1/...`
   - [ ] Documenter format exact des données

2. **Créer service**
   - [ ] Créer `src/services/[nom]Service.ts`
   - [ ] Implémenter toutes les méthodes API
   - [ ] Gérer try/catch + erreurs

3. **Créer types**
   - [ ] Créer `src/types/[nom].types.ts`
   - [ ] Définir toutes les interfaces
   - [ ] Exporter types

4. **Créer pages**
   - [ ] Créer pages React dans `src/pages/`
   - [ ] Utiliser composants Aurora (Panel, Badge, etc.)
   - [ ] Gérer loading + error states
   - [ ] Afficher données

5. **Ajouter routes**
   - [ ] Import dans App.tsx
   - [ ] Ajouter <Route />

6. **Tester**
   - [ ] Backend up : `docker-compose up -d srv-[nom]`
   - [ ] Frontend : `pnpm dev --port 4174`
   - [ ] Toutes les fonctionnalités testées

---

## 🚨 RÈGLES COMMUNES

**Pour TOUS les agents** :

1. **Design Aurora Soft Light** :
   ```tsx
   import { tokens as t } from '../components/dashboard/DashboardV2.components';
   
   // Utiliser t.primary, t.text, t.bg1, t.border, etc.
   ```

2. **Gérer states** :
   ```tsx
   const [data, setData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   ```

3. **Try/catch systématique** :
   ```tsx
   try {
     setLoading(true);
     const data = await service.getData();
     setData(data);
     setError(null);
   } catch (err) {
     setError('Message erreur');
   } finally {
     setLoading(false);
   }
   ```

4. **TypeScript strict** :
   - ❌ JAMAIS `any`
   - ✅ TOUJOURS typer

5. **Security first** :
   - lire `SECURITY_RULES.md` avant toute modif route/API
   - ne jamais ajouter de route publique sauf webhook
   - toujours valider inputs + rôles côté serveur

---

**Chaque agent a la même structure ! Suivez l'exemple de PROMPT_AGENT_ORCHESTRATION.md** 🚀
