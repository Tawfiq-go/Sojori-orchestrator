# 🎯 Prompts de Focalisation - Agents Individuels

Chaque agent reçoit d'abord le **PROMPT_GLOBAL_AGENTS.md**, puis son prompt de focalisation ci-dessous.

---

## 📋 AGENT 1 : AUTHENTIFICATION

```
Tu vas compléter le système d'authentification.

FICHIERS À VÉRIFIER/AMÉLIORER :
- /src/contexts/AuthContext.tsx
- /src/services/authService.ts
- /src/services/apiClient.ts
- /src/pages/LoginPage.tsx
- /src/components/ProtectedRoute.tsx
- /src/utils/authUtils.ts
- /src/config/authConfig.ts

RÉFÉRENCE ANCIEN DASHBOARD :
- /Users/gouacht/sojori-dashboard/src/redux/api/AuthApi.js
- /Users/gouacht/sojori-dashboard/src/utils/auth.utils.js
- /Users/gouacht/sojori-dashboard/src/config/auth.config.js

LoginPage - Complète :
✅ Formulaire email/password avec validation
✅ Affichage erreurs de login
✅ Loading state pendant authentification
✅ Redirection vers /orchestration après login réussi
✅ Design Material-UI cohérent avec le dashboard

AuthContext - Améliore :
✅ Gestion correcte du state (user, token, refreshToken, isAuthenticated, loading, error)
✅ Fonction login() qui appelle authService
✅ Fonction logout() qui nettoie les tokens
✅ Fonction checkAuth() pour valider le token au chargement
✅ Fonction updateToken() pour refresh automatique
✅ useEffect pour vérifier auth au montage

authService - Complète :
✅ login(credentials) → appel POST /api/v1/user/auth/login
✅ validateToken() → appel GET /api/v1/user/auth/valid-token-check
✅ activateWorkerAccount() → pour onboarding staff
✅ logout() → nettoie les tokens

apiClient - Crée (intercepteurs axios) :
✅ Request interceptor : ajoute token Bearer + x-refresh-token
✅ Response interceptor : détecte newToken et met à jour automatiquement
✅ Response interceptor : détecte 401 → retry avec refresh token
✅ Response interceptor : détecte forceLogout → redirige vers /login
✅ Basé sur /Users/gouacht/sojori-dashboard/src/redux/api/AuthApi.js lignes 16-99

ProtectedRoute - Améliore :
✅ Utilise useAuth() pour vérifier isAuthenticated
✅ Affiche <CircularProgress> pendant loading
✅ Redirige vers /login si non authentifié
✅ Affiche <Outlet /> si authentifié

authUtils - Complète :
✅ getToken() → lit cookie "token"
✅ getRefreshToken() → lit cookie "refreshToken"
✅ setTokens(token, refreshToken) → écrit cookies
✅ clearTokens() → supprime cookies
✅ isAppEmbeddedInIframe() → détecte si app en iframe

authConfig - Complète :
✅ API_URL: 'http://localhost:4005/api/v1/user/auth' (backend srv-user)
✅ LOGOUT_REDIRECT: '/login'
✅ COOKIE_MAX_AGE: 7 jours

IMPORTANT :
⚠️ Pour Phase 1 (MOCK), désactive les appels API réels :
- Crée un mode MOCK dans authService
- Si MOCK : simule le login avec email/password hardcodés
- Utilise : email="admin@sojori.com", password="admin123"
- Retourne un token fake et un user mock

⚠️ Pour Phase 2 (Production) :
- Active les vrais appels API vers http://localhost:4005
- Utilise les intercepteurs pour gérer refresh token
- Gère les erreurs réseau correctement

DONNÉES MOCK :
- User MOCK : { id: 1, email: 'admin@sojori.com', firstName: 'Admin', lastName: 'Sojori', role: 'owner' }
- Token fake : 'mock-jwt-token-12345'
- RefreshToken fake : 'mock-refresh-token-67890'

TESTS À FAIRE :
✅ Login avec credentials corrects → redirige vers /orchestration
✅ Login avec credentials incorrects → affiche erreur
✅ Logout → supprime tokens et redirige vers /login
✅ Accès page protégée sans auth → redirige vers /login
✅ Refresh de la page → garde l'auth (cookies persistants)

FORMAT DE RETOUR :
[Même format que les autres agents]
```

---

## 📋 AGENT 2 : INVENTORY + PRICING

```
Tu vas compléter 2 pages : InventoryPage et PricingPage.

PAGES À COMPLÉTER :
- /src/pages/InventoryPage.tsx (664 lignes actuellement)
- /src/pages/PricingPage.tsx (818 lignes actuellement)

InventoryPage - Ajoute :
✅ Clic sur cellule calendrier → Drawer avec détails (prix, statut, réservation si occupé)
✅ Filtres : par listing, par période (datepicker range)
✅ Vue zoom : jour/semaine/mois (toggle)
✅ Modal "Bloquer période" avec formulaire (listing, dates, raison)
✅ Stats header : taux d'occupation, nuits dispo, revenus projetés
✅ Boutons export (iCal, CSV)

PricingPage - Ajoute :
✅ Clic sur ligne → Drawer "Modifier prix"
✅ Bouton "Appliquer suggestion AI" (bulk)
✅ Graphique évolution prix (7/30/90 jours)
✅ Toggle activer/désactiver règles
✅ Clic sur règle → Modal "Éditer règle" avec formulaire
✅ Bouton "Créer nouvelle règle"
✅ Clic sur événement → Modal "Éditer événement"
✅ AICard avec 3-5 recommandations

DONNÉES MOCK :
- Inventaire : 90 jours × 8 listings = 720 cellules
- Pricing : 20 comparaisons, 10 règles, 5 événements

INSPIRATION :
- Regarde CalendarInventoryPage.tsx pour le calendrier
- Regarde TasksPage.tsx pour les modals/drawers
```

---

## 📋 AGENT 3 : CHANNELS + CLIENTS

```
Tu vas compléter 2 pages : ChannelsPage et ClientsPage.

PAGES À COMPLÉTER :
- /src/pages/ChannelsPage.tsx (710 lignes actuellement)
- /src/pages/ClientsPage.tsx (653 lignes actuellement)

ChannelsPage - Ajoute :
✅ Onglet Overview : Toggle connecté/déconnecté par OTA, statut sync, dernière sync
✅ Bouton "Configurer" → Modal config OTA
✅ Onglet Mapping : Recherche + filtres (OTA, statut), clic ligne → Drawer édition mapping
✅ Bouton "Auto-match" (AI), bulk actions
✅ Onglet Logs : Filtres (OTA, type, statut), recherche, clic → Drawer détails + stack trace
✅ Bouton "Retry" si échec
✅ Stats header : syncs 24h, taux succès, temps moyen

ClientsPage - Ajoute :
✅ Tri par colonne, recherche (nom/email/tel)
✅ Filtres avancés : statut (VIP/régulier/nouveau), source, pays, total dépensé, dernière résa
✅ Clic ligne → Drawer avec 4 onglets :
  - Profil (avatar, contact, préférences)
  - Réservations (historique)
  - Communications (timeline messages)
  - Notes (internes staff)
✅ Actions : envoyer message, nouvelle résa, marquer VIP, exporter PDF
✅ Segments rapides : VIP, nouveaux, inactifs, anniversaire
✅ Stats header : total clients, nouveaux ce mois, taux rétention, LTV moyen

DONNÉES MOCK :
- Channels : 30 mappings, 100 logs sync
- Clients : 50 clients avec historique complet

INSPIRATION :
- Regarde ReservationsPage.tsx pour le tableau + filtres
- Regarde TasksPage.tsx pour les drawers multi-onglets
```

---

## 📋 AGENT 4 : TEAM + PLANNING + STAFF WHATSAPP

```
Tu vas compléter 3 pages : TeamPage, PlanningPage, StaffWhatsAppPage.

PAGES À COMPLÉTER :
- /src/pages/TeamPage.tsx (380 lignes actuellement)
- /src/pages/PlanningPage.tsx (290 lignes actuellement)
- /src/pages/StaffWhatsAppPage.tsx (520 lignes actuellement)

TeamPage - Ajoute :
✅ Clic ligne → Drawer "Fiche Staff" avec 3 onglets (Profil, Planning, Performance)
✅ Bouton "Nouveau membre" → Modal formulaire
✅ Actions : modifier, désactiver, envoyer WhatsApp, voir planning
✅ Filtres : rôle, statut, disponibilité
✅ Stats header : staff actifs, occupés aujourd'hui, tâches en cours, rating moyen

PlanningPage - Ajoute :
✅ Navigation semaine précédente/suivante
✅ Toggle vue : jour/semaine/mois
✅ Clic tâche → Drawer détails
✅ Drag & drop tâches (réassigner jour/staff) - OPTIONNEL si trop complexe
✅ Bouton "Nouvelle tâche" → Modal formulaire (type, listing, date, assigné, durée, priorité, notes)
✅ Filtres : type, staff, property, statut
✅ Stats : tâches semaine, taux complétion, charge travail, alertes

StaffWhatsAppPage - Ajoute :
✅ Liste conversations avec avatar, preview message, timestamp, badge non lus
✅ Tri par date dernière activité
✅ Zone messages avec différenciation staff/vous, timestamps, status (envoyé/lu)
✅ Support images/documents
✅ Textarea + bouton "Envoyer"
✅ Bouton "Joindre fichier", templates rapides, emojis picker
✅ Actions : créer tâche depuis message, marquer important, recherche

DONNÉES MOCK :
- Team : 15 staff avec planning
- Planning : 180 tâches (7 jours × 15 staff)
- Staff WhatsApp : 200 messages sur 10 conversations

INSPIRATION :
- Regarde TasksPage.tsx pour le Kanban + Timeline
- Regarde CommsPage.tsx pour le ChatLayout
```

---

## 📋 AGENT 5 : REVIEWS + REQUESTS + OTA MESSAGES

```
Tu vas compléter 3 pages : ReviewsPage, RequestsPage, OTAMessagesPage.

PAGES À COMPLÉTER :
- /src/pages/ReviewsPage.tsx (402 lignes actuellement)
- /src/pages/RequestsPage.tsx (670 lignes actuellement)
- /src/pages/OTAMessagesPage.tsx (358 lignes actuellement)

ReviewsPage - Ajoute :
✅ Clic avis → Drawer détails complet (guest, texte, réponse, AI suggestion)
✅ Formulaire "Répondre", bouton "Utiliser suggestion AI"
✅ Filtres : source (Airbnb/Booking/etc), rating (1-5), property, statut (répondu/non), sentiment
✅ Actions : répondre, marquer important, générer AI, bulk actions
✅ Stats header : rating moyen, nouveaux ce mois, taux réponse, % positif
✅ Graphiques : évolution rating 30j, distribution notes, top keywords

RequestsPage - Ajoute :
✅ Toggle Table/Kanban fonctionnel
✅ Vue Table : tri, recherche, filtres (type, statut, priorité, date)
✅ Vue Kanban : 4 colonnes, drag & drop, counter par colonne
✅ Clic demande → Drawer avec 4 onglets (Détails, Timeline, Messages, Actions)
✅ Actions : assigner staff, créer tâche, envoyer message guest, marquer résolu, escalader
✅ Stats : demandes en cours, temps moyen résolution, taux satisfaction, types fréquents

OTAMessagesPage - Ajoute :
✅ Liste conversations avec badge OTA, nom guest, property, dates, preview, non lus
✅ Tri par date
✅ Messages groupés par jour, support images, différenciation guest/host
✅ Status messages (envoyé/lu/échec), bouton "Traduire"
✅ Textarea + bouton "Envoyer", templates réponses, AI suggestion, joindre fichiers
✅ Filtres : OTA, statut, property, date séjour
✅ Actions : marquer lu/non lu, important, créer tâche, recherche

DONNÉES MOCK :
- Reviews : 30 avis variés
- Requests : 50 demandes
- OTA Messages : 100 messages sur 20 conversations

INSPIRATION :
- Regarde ReservationsPage.tsx pour les filtres avancés
- Regarde TasksPage.tsx pour le Kanban drag & drop
- Regarde CommsPage.tsx pour le ChatLayout
```

---

## 📝 FORMAT DE RETOUR ATTENDU

Quand tu as fini, retourne-moi :

```markdown
# Agent X - [Nom des pages]

## ✅ Complété

### Page 1 : [NomPage.tsx]
- **Lignes** : XXX → YYY (+ZZZ lignes ajoutées)
- **Fonctionnalités ajoutées** :
  - [x] Feature 1
  - [x] Feature 2
  - [x] Feature 3
  - ...
- **Données MOCK** : XX entrées

### Page 2 : [NomPage.tsx]
- **Lignes** : XXX → YYY (+ZZZ lignes ajoutées)
- **Fonctionnalités ajoutées** :
  - [x] Feature 1
  - [x] Feature 2
  - ...
- **Données MOCK** : XX entrées

## 📊 Stats Totales
- **Lignes de code ajoutées** : +ZZZ
- **Interactions créées** : XX (drawers, modals, filtres)
- **Entrées MOCK** : XXX

## ⚠️ Problèmes Rencontrés
- Aucun / [Description du problème]

## ✅ Checklist Qualité
- [x] Toutes interactions fonctionnent
- [x] Stats calculées dynamiquement
- [x] Données MOCK réalistes (50+)
- [x] Design cohérent (Aurora Soft)
- [x] Code TypeScript sans erreurs
- [x] Responsive

## 🎯 Prêt pour Tests
Oui / Non (si non, pourquoi ?)
```

---

**Instructions Finales** :

1. Lis d'abord **PROMPT_GLOBAL_AGENTS.md** en entier
2. Lis ton prompt de focalisation ci-dessus
3. Consulte les pages de référence mentionnées (ReservationsPage, TasksPage, etc.)
4. Code ta page en ajoutant TOUTES les fonctionnalités listées
5. Teste que tout fonctionne (clics, filtres, modals)
6. Retourne-moi le rapport au format ci-dessus

🚀 **Bon courage !**
