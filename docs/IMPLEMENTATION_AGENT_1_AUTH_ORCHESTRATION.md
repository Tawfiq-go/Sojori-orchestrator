# Agent 1 - Authentication & Orchestration

## Ce qui a ete implemente

### Authentification mock
- `src/pages/LoginPage.tsx`
  - Validation email/mot de passe
  - Remember me
  - Lien forgot password
  - Lien register
  - Boutons demo accounts
  - Boutons social login mock (UI only)
- `src/pages/RegisterPage.tsx`
  - Prenom, nom, email, telephone, entreprise/property name
  - Password + confirm password
  - Checkbox CGU
  - Checkbox newsletter
  - Validation front-end complete
- `src/pages/ForgotPasswordPage.tsx`
  - Envoi mock du lien de reset
- `src/pages/ResetPasswordPage.tsx`
  - Nouveau mot de passe + confirmation
  - Mise a jour mock du mot de passe
- `src/contexts/AuthContext.tsx`
  - `login`
  - `register`
  - `logout`
  - `resetPassword`
  - `completePasswordReset`
  - `updateProfile`
  - `checkAuth`
- `src/services/authService.ts`
  - Service 100% mock, sans backend reel
  - Session persistante
- `src/components/ProtectedRoute.tsx`
  - Protection reactivee
  - Redirection `/login` si non connecte

### Pilotage
- `src/pages/DashboardPage.tsx`
  - KPI cards
  - Revenue trend
  - Channel distribution
  - Occupancy par property
  - Check-ins / check-outs
  - Widgets check-ins, check-outs, urgent tasks, unread messages, reviews, alerts
- `src/pages/AnalyticsPage.tsx`
  - KPI analytics
  - Evolution revenus
  - Analyse sources reservations
  - Saisonnalite
  - Guest demographics
  - Buckets duree de sejour / lead time
  - Tableau performance par property
- `src/pages/ReportsPage.tsx`
  - Generateur mock de rapports
  - Selection type / periode / format / planning
  - Option envoi email
  - Preview mock
  - Historique des rapports generes

### Routing / navigation
- `src/App.tsx`
  - Ajout routes publiques:
    - `/register`
    - `/forgot-password`
    - `/reset-password`
  - Ajout routes protegees:
    - `/dashboard`
    - `/analytics`
    - `/reports`
  - Redirection par defaut vers `/dashboard`
- `src/components/DashboardWrapper.tsx`
  - Integration du user mock courant
  - Bouton logout branche
  - Navigation mise a jour
- `src/components/dashboard/DashboardV2.components.jsx`
  - Ajout Dashboard / Analytics / Reports dans la section Pilotage
  - Bouton deconnexion dans le footer sidebar

## Structure des mock data

### `src/data/mockAuth.ts`
- 6 utilisateurs seedes
- persistance users dans `localStorage`
- persistance session user dans `localStorage`
- persistance reset email dans `localStorage`
- generation de faux tokens

### `src/data/mockDashboard.ts`
- KPIs business
- revenue chart
- source distribution
- occupancy par property
- top properties
- check-in / check-out flow
- widgets listes (tasks, messages, reviews, alerts)

### `src/data/mockAnalytics.ts`
- KPIs analytics
- performance par property
- revenus compares
- saisonnalite
- source breakdown
- demographics
- stay length / lead time distributions
- templates de rapports
- historique de rapports
- preview de rapports

## Comment tester

1. Lancer l’app:
   - `pnpm dev`
2. Tester le login:
   - `admin@sojori.com` / `admin123`
   - ou n’importe quel email valide + mot de passe >= 3 caracteres
3. Verifier la protection:
   - ouvrir `/dashboard` sans session -> redirection `/login`
4. Tester l’inscription:
   - creer un compte via `/register`
   - verifier la redirection vers `/dashboard`
5. Tester reset password:
   - `/forgot-password`
   - puis `/reset-password`
6. Parcourir les pages Pilotage:
   - `/dashboard`
   - `/analytics`
   - `/reports`
   - `/orchestration`

## Notes / limites
- Les pages auth et pilotage sont en mode mock uniquement.
- Les boutons export / email / social login sont des actions mock UI.
- `pnpm exec tsc -b --pretty false` montre encore des erreurs TypeScript pre-existantes ailleurs dans le repo, mais plus sur les fichiers Agent 1 modifies.
- `pnpm lint` remonte aussi de nombreuses erreurs legacy hors perimetre Agent 1.
