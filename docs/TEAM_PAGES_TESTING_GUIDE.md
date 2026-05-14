# Guide de test - Pages Team, Planning & Staff WhatsApp

## Démarrage rapide

```bash
cd /Users/gouacht/Sojori-orchestrator
npm run dev
```

Ouvrir: http://localhost:5173

## Pages à tester

### 1. TeamPage - `/tasks/team`

#### Tests de base
- [ ] Vérifier affichage 4 stats cards
- [ ] Vérifier tableau avec 15 staff membres
- [ ] Vérifier photos avatars chargées

#### Tests filtres
- [ ] Taper "Fatima" dans recherche → 1 résultat
- [ ] Sélectionner role "Femme de menage" → 5 résultats
- [ ] Sélectionner statut "Inactif" → 1 résultat (Omar Benali)
- [ ] Sélectionner statut "En conge" → 1 résultat (Sanaa Idrissi)
- [ ] Combiner filtres: "Maintenance" + recherche "Youssef" → 1 résultat

#### Tests visuels
- [ ] Disponibilités Lun-Dim affichées (badges verts/gris)
- [ ] Barre progression tâches animée
- [ ] Note qualité avec étoiles
- [ ] Badges role colorés (bleu=menage, orange=maintenance, etc.)
- [ ] Badges statut (vert=actif, rouge=inactif, jaune=conge)

#### Tests interactions
- [ ] Cliquer bouton "Ajouter membre" → Modal s'ouvre
- [ ] Fermer modal
- [ ] Hover sur ligne → Background change
- [ ] Cliquer icônes Edit/Planning → Console log (pas encore implémenté)

#### Données attendues
- Total: 15 staff
- Actifs: 13
- Taux completion: ~90%
- Qualité moyenne: 4.6

---

### 2. PlanningPage - `/tasks/planning`

#### Tests de base
- [ ] Vérifier affichage 4 stats cards
- [ ] Vérifier calendrier grille Staff x Jours
- [ ] Vérifier header avec dates (Lun 14/5, Mar 15/5, etc.)

#### Tests navigation
- [ ] Cliquer ⬅️ → Semaine -1 affiché
- [ ] Cliquer ➡️ → Semaine +1 affiché
- [ ] Vérifier badge semaine (ex: "Semaine -1", "Cette semaine", "Semaine +2")

#### Tests filtres
- [ ] Sélectionner "Fatima El Amrani" → Voir seulement ses tâches
- [ ] Sélectionner type "Menage" → Voir seulement tâches 🧹
- [ ] Combiner: "Mohamed Alaoui" + "Transport" → Voir ses transports uniquement
- [ ] Réinitialiser filtres → Toutes les tâches

#### Tests cellules
- [ ] Hover sur tâche → Tooltip avec détails
- [ ] Vérifier couleurs:
  - Gris = Pending
  - Orange = In progress
  - Vert = Completed
- [ ] Vérifier icônes: 🧹 🔧 🚗 🚪 🔑 🛒

#### Tests performance
- [ ] Scroll horizontal fluide
- [ ] Changement semaine < 100ms
- [ ] Filtres instantanés

#### Données attendues
- 180 tâches total sur 30 jours
- Répartition sur 15 staff
- Mix statuts (pending/in_progress/completed)

---

### 3. StaffWhatsAppPage - `/communications/staff`

#### Tests layout
- [ ] Vérifier 3 colonnes (Liste | Thread | Infos)
- [ ] Vérifier largeurs: 320px | flex | 280px

#### Tests onglets
- [ ] Cliquer "Individuels" → 15 conversations
- [ ] Cliquer "Groupes" → 5 groupes
- [ ] Vérifier badges unread (ex: "2" sur Tous les staff)

#### Tests liste conversations
- [ ] Taper "Fatima" dans recherche → 1 résultat
- [ ] Vérifier photos avatars
- [ ] Vérifier indicateurs online (point vert)
- [ ] Vérifier dernier message tronqué
- [ ] Vérifier horodatages (14:30, Hier 16:00, 12 mai)

#### Tests thread messages
- [ ] Cliquer conversation → Messages chargés
- [ ] Vérifier bulles gauche (staff) et droite (vous)
- [ ] Vérifier metadata: heure + ✓ sent / ✓✓ delivered
- [ ] Groupes: Vérifier nom expéditeur au-dessus message
- [ ] Scroll → Messages plus anciens en haut

#### Tests panel infos
- [ ] Conversation individuelle → Photo + nom + role + téléphone
- [ ] Groupe → Icône + nom + liste membres avec photos

#### Tests input message
- [ ] Taper texte → Input actif
- [ ] Cliquer "Envoyer" → Console log (pas encore implémenté)
- [ ] Appuyer Enter → Même effet

#### Tests broadcast
- [ ] Cliquer "Broadcast" → Modal s'ouvre
- [ ] Cocher 3 staff → Compteur affiche "(3)"
- [ ] Taper message
- [ ] Cliquer "Envoyer" → Console log + modal se ferme
- [ ] Bouton désactivé si 0 sélectionné ou message vide

#### Données attendues
- 15 conversations individuelles
- 5 groupes:
  - Tous les staff (15 membres)
  - Equipe Menage (5)
  - Equipe Maintenance (4)
  - Equipe Chauffeurs (3)
  - Equipe Conciergerie (3)
- 200+ messages total

---

## Checklist complète

### TeamPage
- [x] 4 stats cards
- [x] 15 staff membres
- [x] Filtres recherche + role + statut
- [x] Disponibilités Lun-Dim
- [x] Stats tâches + barre
- [x] Qualité étoiles
- [x] Badges role/statut
- [x] Modal ajouter membre

### PlanningPage
- [x] 4 stats cards
- [x] Calendrier grille Staff x Jours
- [x] Navigation semaines
- [x] Filtres staff + type
- [x] Cellules tâches colorées
- [x] Tooltips détails
- [x] Légende codes couleur
- [x] 180 tâches mock

### StaffWhatsAppPage
- [x] Layout 3 colonnes
- [x] Onglets Individuels/Groupes
- [x] Liste 15 conversations + 5 groupes
- [x] Thread messages bulles
- [x] Panel infos
- [x] Recherche conversations
- [x] Modal broadcast
- [x] 200+ messages mock

---

## Bugs à signaler

Si vous rencontrez:
- Layout cassé → Vérifier console (erreurs import)
- Photos manquantes → Connexion internet requise (pravatar.cc)
- Filtres ne marchent pas → Vérifier console (erreurs JS)
- Build échoue → Normal (erreurs dans autres fichiers, pas nos pages)

---

## Screenshots recommandés

Pour documentation:

1. **TeamPage**
   - Vue d'ensemble avec stats + tableau
   - Zoom sur disponibilités Lun-Dim
   - Filtres actifs

2. **PlanningPage**
   - Vue semaine complète
   - Zoom cellules avec tâches
   - Modal tooltip

3. **StaffWhatsAppPage**
   - Vue 3 colonnes
   - Thread messages
   - Modal broadcast

---

## Console logs

Pendant les tests, vérifier console:

```javascript
// TeamPage
Sending message: ... // Input message

// PlanningPage
// (pas de console logs)

// StaffWhatsAppPage
Sending message: ... // Input message
Broadcasting to: [...] Message: ... // Broadcast
```

---

## Performance attendue

- **TeamPage**: Filtres instantanés (< 10ms)
- **PlanningPage**: Navigation semaines < 100ms
- **StaffWhatsAppPage**: Switch conversations < 50ms

---

## Notes

- Mode MOCK: Pas de persistence (refresh = reset)
- Données MOCK: Toujours les mêmes 15 staff / 180 tâches / 200+ messages
- Console logs: Actions futures (send message, broadcast, etc.)

---

**Prêt pour tests** ✅
