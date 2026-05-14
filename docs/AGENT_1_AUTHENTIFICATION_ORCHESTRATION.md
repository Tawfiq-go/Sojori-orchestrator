# 🔐 AGENT 1 - AUTHENTIFICATION & ORCHESTRATION

**MISSION** : Compléter le système d'authentification et les pages d'orchestration avec MOCK data

---

## 🎯 TON DOMAINE

Tu gères 2 sections principales :

### 1. **AUTHENTIFICATION**
- Login page
- Registration page
- Password reset
- Protected routes
- Auth context/state

### 2. **ORCHESTRATION (Section Pilotage)**
- Dashboard principal (`/dashboard`)
- Analytics (`/analytics`)
- Reports (`/reports`)

---

## 📂 FICHIERS À COMPLÉTER

### Authentification

**Fichiers existants** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/auth/LoginPage.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/pages/auth/RegisterPage.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/contexts/AuthContext.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/services/authService.ts`
- `/Users/gouacht/Sojori-orchestrator/src/components/DashboardWrapper.tsx`

**État actuel** :
- ✅ LoginPage existe (design fait)
- ✅ AuthContext existe (MOCK mode activé)
- ⚠️ Protected routes désactivées pour tests
- ❌ Registration page incomplète
- ❌ Password reset manquant

### Orchestration

**Fichiers à compléter** :
- `/Users/gouacht/Sojori-orchestrator/src/pages/DashboardPage.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/pages/AnalyticsPage.tsx`
- `/Users/gouacht/Sojori-orchestrator/src/pages/ReportsPage.tsx`

**Ancien dashboard à comparer** :
- `/Users/gouacht/sojori-dashboard/src/` (cherche : dashboard, analytics, reports, overview, stats)

---

## 📋 PARTIE 1 : AUTHENTIFICATION

### CE QUE TU DOIS FAIRE

#### 1. LoginPage (amélioration)

**Ancien dashboard - Cherche dans** `/Users/gouacht/sojori-dashboard/src/` :
- Formulaire login : TOUS les champs (email, password, remember me, etc.)
- Validation : messages d'erreur, règles
- Boutons : Login, Forgot password, Register
- Features : Social login (Google, Facebook?), 2FA?

**Nouveau - Compléter** `LoginPage.tsx` :
- Vérifier tous les champs sont présents
- Ajouter validation front-end avec messages d'erreur clairs
- Ajouter bouton "Forgot password" fonctionnel
- Ajouter lien vers Register
- MOCK : Accepter n'importe quel email/password et connecter user

#### 2. RegisterPage (créer/compléter)

**Ancien dashboard - Cherche** :
- Formulaire inscription : TOUS les champs
  - Email, Password, Confirm password
  - Nom, Prénom
  - Téléphone
  - Entreprise/Property name?
  - CGU checkbox
  - Newsletter checkbox?

**Nouveau - Créer** `RegisterPage.tsx` :
- Design cohérent avec LoginPage (même style Material-UI v9)
- Formulaire avec TOUS les champs de l'ancien
- Validation : email format, password strength, match passwords
- MOCK : Sauvegarder dans localStorage et rediriger vers dashboard

#### 3. Password Reset (créer)

**Créer** `ForgotPasswordPage.tsx` et `ResetPasswordPage.tsx` :
- ForgotPassword : formulaire email → MOCK envoie email
- ResetPassword : formulaire new password + confirm → MOCK change password
- Messages de confirmation
- Lien retour vers login

#### 4. Protected Routes (réactiver)

**Fichier** : `DashboardWrapper.tsx` ou créer `ProtectedRoute.tsx`

**Logique MOCK** :
```typescript
// Si user dans AuthContext → Afficher page
// Sinon → Redirect vers /login
// MOCK : Check localStorage.getItem('mockUser')
```

#### 5. Auth Context (compléter)

**Fichier** : `AuthContext.tsx`

**Features à ajouter** :
- `login(email, password)` → MOCK return user
- `register(userData)` → MOCK create user
- `logout()` → MOCK clear
- `resetPassword(email)` → MOCK
- `updateProfile(data)` → MOCK
- État : `user`, `isAuthenticated`, `isLoading`

**MOCK User Object** :
```typescript
{
  id: 'mock-user-1',
  email: 'admin@sojori.com',
  firstName: 'Admin',
  lastName: 'Sojori',
  role: 'admin', // admin, owner, staff
  phone: '+33 6 12 34 56 78',
  company: 'Sojori Demo',
  avatar: 'https://i.pravatar.cc/150?img=1'
}
```

---

## 📋 PARTIE 2 : ORCHESTRATION (PAGES PILOTAGE)

### PAGE 1 : DASHBOARD PRINCIPAL

**Ancien dashboard - Cherche dans** `/Users/gouacht/sojori-dashboard/src/` :
- Fichiers : `Dashboard.jsx`, `Overview.jsx`, `Home.jsx`

**Ce que tu dois lister** :
- **KPI Cards** : TOUS les chiffres affichés
  - Total réservations (mois en cours)
  - Revenus du mois (€)
  - Taux d'occupation (%)
  - ADR (Average Daily Rate)
  - RevPAR
  - Guests ce mois
  - Properties actives
  - Rating moyen
  - etc.

- **Graphiques** :
  - Revenus par jour/semaine/mois (line chart)
  - Réservations par source (pie chart : Airbnb, Booking, Direct)
  - Taux d'occupation par property (bar chart)
  - Check-ins/Check-outs aujourd'hui (calendar view)
  - Top properties par revenus (ranking)

- **Widgets** :
  - Prochains check-ins (5 prochains)
  - Prochains check-outs (5 prochains)
  - Tâches urgentes (5)
  - Messages non lus (liste)
  - Avis récents (3 derniers)
  - Alertes/Notifications (liste)

- **Filtres** :
  - Période : Aujourd'hui, Semaine, Mois, Année, Custom
  - Par property (multi-select)

**Nouveau - Compléter** `DashboardPage.tsx` :
- Créer MOCK data pour TOUS les KPIs
- Ajouter TOUS les graphiques avec react-chartjs-2 ou recharts
- Ajouter TOUS les widgets
- Design : Grid responsive Material-UI

### PAGE 2 : ANALYTICS

**Ancien dashboard - Cherche** :
- Fichiers : `Analytics.jsx`, `Stats.jsx`, `Reports.jsx`

**Ce que tu dois lister** :
- **Rapports disponibles** :
  - Performance par property (tableau comparatif)
  - Évolution revenus (graphique temps)
  - Analyse sources réservations (breakdown OTAs)
  - Saisonnalité (heatmap par mois)
  - Durée moyenne séjour
  - Lead time moyen
  - Taux d'annulation
  - Guest demographics (pays, âge, etc.)

- **Filtres avancés** :
  - Date range picker
  - Comparaison périodes (vs année précédente, vs mois précédent)
  - Par property
  - Par source OTA
  - Export : PDF, CSV, Excel

**Nouveau - Créer** `AnalyticsPage.tsx` :
- TOUS les rapports avec MOCK data
- Graphiques interactifs
- Filtres fonctionnels
- Export buttons (MOCK download)

### PAGE 3 : REPORTS

**Ancien dashboard - Cherche** :
- Fichiers : `Reports.jsx`, `Export.jsx`

**Ce que tu dois lister** :
- **Types de rapports** :
  - Rapport financier (revenus, commissions, net owner)
  - Rapport occupancy
  - Rapport maintenance (tâches, coûts)
  - Rapport staff (heures, performance)
  - Rapport guests (satisfaction, reviews)

- **Génération** :
  - Sélection type rapport
  - Sélection période
  - Sélection properties
  - Format : PDF, Excel, CSV
  - Envoi par email (checkbox)
  - Planification automatique (hebdo, mensuel)

**Nouveau - Créer** `ReportsPage.tsx` :
- Interface génération rapports
- Preview rapport (MOCK)
- Liste rapports générés (historique MOCK)
- Download buttons

---

## 📊 MOCK DATA À CRÉER

### Fichiers à créer

**`/Users/gouacht/Sojori-orchestrator/src/data/mockAuth.ts`** :
```typescript
export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@sojori.com',
    password: 'admin123', // MOCK only
    firstName: 'Admin',
    lastName: 'Sojori',
    role: 'admin',
    // ... autres champs
  },
  // ... 5-10 users
];
```

**`/Users/gouacht/Sojori-orchestrator/src/data/mockDashboard.ts`** :
```typescript
export const mockKPIs = {
  totalReservations: 234,
  monthlyRevenue: 45380,
  occupancyRate: 87.4,
  adr: 142,
  revpar: 124,
  // ... tous KPIs
};

export const mockRevenueChart = [
  { date: '2025-05-01', revenue: 1200, bookings: 8 },
  { date: '2025-05-02', revenue: 1500, bookings: 10 },
  // ... 30 jours
];

export const mockSourcesPieChart = [
  { source: 'Airbnb', value: 45, revenue: 20000 },
  { source: 'Booking.com', value: 30, revenue: 13500 },
  { source: 'Direct', value: 15, revenue: 6800 },
  { source: 'Vrbo', value: 10, revenue: 4500 },
];

// ... autres datasets
```

**`/Users/gouacht/Sojori-orchestrator/src/data/mockAnalytics.ts`** :
```typescript
// Données pour graphiques analytics
```

---

## 🎨 DESIGN GUIDELINES

### Material-UI v9 (sx props)

```typescript
import { Box, Card, Typography, Grid } from '@mui/material';

// KPI Card
<Card sx={{ p: 3, borderRadius: 2 }}>
  <Typography variant="h6" color="text.secondary">
    Total Réservations
  </Typography>
  <Typography variant="h3" color="primary.main" sx={{ mt: 1 }}>
    234
  </Typography>
  <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
    +12% vs mois dernier
  </Typography>
</Card>
```

### Graphiques

Utilise **recharts** (déjà installé) :
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
```

### Couleurs (Aurora Soft Light)

```typescript
primary: '#e6b022', // Gold
secondary: '#8b5cf6', // Purple
success: '#10b981', // Green
error: '#ef4444', // Red
warning: '#f59e0b', // Orange
```

---

## ✅ CHECKLIST

### Authentification
- [ ] LoginPage amélioré avec toutes features
- [ ] RegisterPage créé et complet
- [ ] ForgotPasswordPage créé
- [ ] ResetPasswordPage créé
- [ ] AuthContext complet avec toutes méthodes MOCK
- [ ] Protected routes réactivées
- [ ] MOCK users créés (5-10)
- [ ] LocalStorage pour persistence

### Dashboard Principal
- [ ] Cherché ancien dashboard
- [ ] Listé TOUS les KPIs
- [ ] Listé TOUS les graphiques
- [ ] Listé TOUS les widgets
- [ ] Créé MOCK data complet
- [ ] Implémenté tous KPI cards
- [ ] Implémenté tous graphiques
- [ ] Implémenté tous widgets
- [ ] Ajouté filtres période/property

### Analytics
- [ ] Cherché ancien dashboard
- [ ] Listé tous rapports analytics
- [ ] Créé MOCK data analytics
- [ ] Implémenté tous graphiques
- [ ] Implémenté filtres avancés
- [ ] Ajouté export buttons

### Reports
- [ ] Cherché ancien dashboard
- [ ] Listé tous types rapports
- [ ] Créé interface génération
- [ ] Créé preview MOCK
- [ ] Créé historique MOCK
- [ ] Ajouté download/email options

---

## 📤 LIVRABLES

1. **Code complet** :
   - Pages auth complètes et fonctionnelles (MOCK)
   - Pages orchestration complètes avec MOCK data
   - Protected routes fonctionnelles

2. **MOCK Data** :
   - `mockAuth.ts` (users)
   - `mockDashboard.ts` (KPIs, charts)
   - `mockAnalytics.ts` (analytics data)

3. **Documentation** :
   - Créer `/Users/gouacht/Sojori-orchestrator/docs/IMPLEMENTATION_AGENT_1_AUTH_ORCHESTRATION.md`
   - Documenter :
     - Ce qui a été implémenté
     - MOCK data structure
     - Comment tester (logins, navigation)
     - Ce qui manque (si quelque chose)

---

## 🚨 RÈGLES IMPORTANTES

### DO ✅

- ✅ Comparer EXACTEMENT avec ancien dashboard
- ✅ N'oublie AUCUN KPI, AUCUN graphique de l'ancien
- ✅ MOCK data réaliste (pas juste des zéros)
- ✅ Design cohérent avec Material-UI v9 (sx props)
- ✅ Tout doit être fonctionnel en MOCK mode
- ✅ Protected routes doivent marcher (redirect login si non connecté)
- ✅ LocalStorage pour persistence session

### DON'T ❌

- ❌ Ne connecte AUCUNE vraie API backend (Phase 3)
- ❌ N'oublie aucun élément de l'ancien dashboard
- ❌ Pas de Tailwind (Material-UI sx uniquement)
- ❌ Pas de données vides (toujours MOCK data)
- ❌ Pas de console.errors

---

## 🎯 PRIORITÉS

### 🔴 HAUTE (Must have)
1. Login fonctionnel avec MOCK
2. Protected routes fonctionnelles
3. Dashboard principal avec TOUS les KPIs
4. Dashboard principal avec graphiques principaux

### 🟠 MOYENNE (Should have)
1. Register page complète
2. Password reset
3. Analytics page complète
4. Tous les widgets dashboard

### 🟡 BASSE (Nice to have)
1. Reports page
2. Social login (design uniquement)
3. 2FA (design uniquement)

---

**Questions ?** Commence par explorer `/Users/gouacht/sojori-dashboard/src/` pour voir exactement ce qui existe dans l'ancien !

Bon courage ! 🚀
