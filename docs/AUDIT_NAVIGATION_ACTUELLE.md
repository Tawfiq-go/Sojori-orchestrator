# 🔍 AUDIT NAVIGATION DASHBOARD SOJORI-ORCHESTRATOR

## ✅ Ce qui a été implémenté (6 pages)

### Pages existantes:
1. **ReservationsPage** (/reservations)
   - Liste des réservations avec table
   - Stats: 23 actives, €18,420 revenu, 87% occupation, 4.92 note
   - Filtres: Statut, Confirmées, Source, Dates
   - ✅ Fonctionne

2. **CalendarPage** (/calendar)
   - Vue Gantt 21 jours
   - 5 propriétés
   - Bookings color-coded
   - ✅ Fonctionne

3. **TasksPage** (/tasks)
   - Kanban: À faire, En cours, À valider, Terminé
   - Tâches ménage, maintenance, check-in
   - ✅ Fonctionne

4. **OrchestrationPage** (/orchestration/timeline/1234)
   - Chronologie événements
   - Timeline par réservation
   - Résumé séjour + AI suggestions
   - ✅ Fonctionne

5. **CommsPage** (/communications/whatsapp)
   - Liste conversations
   - Thread WhatsApp
   - AI suggestions
   - ✅ Fonctionne

6. **ListingsPage** (/listings)
   - Grid annonces
   - Cards avec photos, stats (OCC, ADR, RV/MO)
   - Channels badges
   - ✅ Fonctionne

---

## ❌ PROBLÈMES IDENTIFIÉS

### 1. Navigation incorrecte dans sidebar

**ACTUEL (DashboardV2.components.jsx - ligne 78-101):**
```javascript
export const NAV = [
  { group: 'Pilotage', items: [
    { id: 'home', label: "Vue d'ensemble", icon: '⌂' },
    { id: 'orchestration', label: 'Orchestration', icon: '✨', badge: 'AI', sub: [
      { id: 'orchestration/timeline', label: '› Chronologie' },
      { id: 'orchestration/events', label: '› Événements' },
      { id: 'orchestration/config', label: '› Configuration' },
    ]},
    { id: 'calendar', label: 'Calendrier', icon: '📅' },
  ]},
  { group: 'Activité', items: [
    { id: 'reservations', label: 'Réservations', icon: '🎫', badge: '23' },
    { id: 'tasks', label: 'Tâches', icon: '✅', badge: '7' },
    { id: 'comms', label: 'Communications', icon: '💬', badge: '3', badgeRed: true },
    { id: 'requests', label: 'Demandes', icon: '📝', badge: '2' },
    { id: 'reviews', label: 'Avis', icon: '⭐' },
  ]},
  { group: 'Catalogue', items: [
    { id: 'listings', label: 'Annonces', icon: '🏠', badge: '42' },
    { id: 'pricing', label: 'Tarification dynamique', icon: '📈' },
    { id: 'channels', label: 'Canaux', icon: '🔗' },
    { id: 'clients', label: 'Clients', icon: '👥' },
  ]},
];
```

**ATTENDU selon le brief PROMPT_CLAUDE_DESIGN_DASHBOARD_V2_OWNER.md:**

### Structure correcte:

#### 🎯 Pilotage
- Orchestration (avec sous-menu: Chronologie, Événements, Configuration)
- **❌ Pas de "Vue d'ensemble"** (marqué comme "à refaire" dans le brief)
- **❌ "Calendrier" ne devrait PAS être ici**

#### 📊 Réservations (groupe dédié)
- **Calendrier** (vue multi-propriétés) ← devrait être ICI
- **Inventaire/Disponibilités** (gestion des disponibilités) ← MANQUE
- Liste réservations (table)
- Séjour (détail réservation) ← MANQUE
- Demandes (pending bookings)

#### ✅ Tâches & Opérations
- Liste (kanban/table)
- Équipe (staff assignments) ← MANQUE
- Calendrier planning ← MANQUE
- Staff WhatsApp ← MANQUE

#### 💬 Communications Hub
- WhatsApp Guests
- Staff WhatsApp (équipe interne) ← MANQUE
- Messages OTA (Airbnb/Booking) ← MANQUE

#### 📋 Autres
- Demandes (service guests)
- Avis (reviews)

#### 🏠 Catalogue
- Annonces (listings)
- Tarification dynamique
- Gestion des Canaux
- Clients

---

## 🔴 PAGES MANQUANTES CRITIQUES

1. **Inventaire/Disponibilités** (Calendrier inventaire)
2. **Réservation - Séjour** (détail d'une résa)
3. **Tâches - Équipe** (staff assignments)
4. **Tâches - Calendrier planning**
5. **Tâches - Staff WhatsApp**
6. **Communications - Staff WhatsApp**
7. **Communications - Messages OTA**
8. **Demandes** (page dédiée)
9. **Avis** (page dédiée)
10. **Tarification Dynamique**
11. **Gestion des Canaux**
12. **Clients**

---

## 🎯 PRIORITÉS DE CORRECTION

### P0 - URGENT (Structure navigation)
- ❌ Supprimer "Vue d'ensemble" de Pilotage
- ❌ Déplacer "Calendrier" de Pilotage → groupe "Réservations"
- ✅ Créer groupe "Réservations" avec: Calendrier, Inventaire, Liste, Séjour, Demandes
- ✅ Restructurer "Tâches & Opérations" avec sous-sections
- ✅ Restructurer "Communications Hub" avec 3 onglets

### P1 - Important (Contenu pages)
- Le **Calendrier actuel** est correct (Gantt multi-propriétés)
- Mais il doit être dans le groupe "Réservations", pas "Pilotage"
- La page **Réservations actuelle** montre une liste → renommer en "Liste réservations"

### P2 - Moyen terme (Pages manquantes)
- Implémenter les 12 pages manquantes listées ci-dessus

---

## 📊 COMPARAISON ATTENDU vs RÉEL

| Section | Attendu | Actuel | Status |
|---------|---------|--------|--------|
| **Pilotage** | Orchestration uniquement | + Vue d'ensemble + Calendrier | ❌ Incorrect |
| **Réservations** | Groupe dédié avec Calendrier, Inventaire, Liste, Séjour | Juste "Réservations" dans Activité | ❌ Manque groupe |
| **Tâches** | Sous-sections: Liste, Équipe, Planning, Staff WA | Juste "Tâches" | ❌ Manque sous-sections |
| **Communications** | 3 onglets: Guests WA, Staff WA, OTA | Juste "Communications" | ❌ Manque onglets |
| **Annonces** | OK | OK | ✅ |

---

## 📝 NOTES

- Le design et l'implémentation des 6 pages existantes sont **corrects**
- Le problème principal est **l'architecture de navigation**
- Il faut **réorganiser la sidebar** selon la logique métier
- Les pages manquantes peuvent être ajoutées progressivement (P2)
