# 🧪 Tests Orchestration Legacy

## ⚡ Démarrage rapide

```bash
cd /Users/gouacht/Sojori-orchestrator
npm run dev
```

Ouvrir: **http://localhost:4175/admin/orchestrator?plan=SJ-4OQHVT0P**

---

## ✅ Checklist de test

### **1. Page principale**
- [ ] Page charge sans erreur console
- [ ] Pas d'erreur TypeScript/ESLint
- [ ] Loading spinner s'affiche puis disparaît
- [ ] Liste de réservations s'affiche

### **2. Cartes réservations**
- [ ] Cartes affichées horizontalement (scroll)
- [ ] Code réservation visible (SJ-XXXXXXX)
- [ ] Statut affiché (Active, Processing, etc.)
- [ ] Listing name visible
- [ ] Guest name visible avec 👤
- [ ] Dates affichées (Arrivée → Départ)
- [ ] Progress bar visible (X/Y events)
- [ ] Bouton "Force Execute All" présent (si events pending)
- [ ] Hover sur carte → effet scale
- [ ] Click sur carte → Sélection (border blue)

### **3. Timeline détaillée**
- [ ] Timeline s'affiche après sélection carte
- [ ] Séparateurs de jours visibles ("12 mai · J-3 · Réservation")
- [ ] 20+ événements affichés (si plan complet)
- [ ] Icônes événements visibles (✅, 📧, 👤, ⏰, etc.)
- [ ] Badges statuts visibles (Success, Warning, Error)
- [ ] États visuels différents:
  - [ ] ✅ Completed (vert)
  - [ ] ⏳ Pending (jaune/orange)
  - [ ] ℹ️ Info (bleu)
  - [ ] 🔮 Future (gris)
  - [ ] ⚠️ Critical/Late (rouge)

### **4. Événements messages**
- [ ] Template name visible
- [ ] Canal affiché (WhatsApp, Email, OTA)
- [ ] Statut envoi visible (Lu, Envoyé, Échec)
- [ ] Quote/Extrait message visible si présent
- [ ] Indicateur 72h WhatsApp présent:
  - [ ] 🟢 Disponible
  - [ ] 🟡 Trop tôt
  - [ ] 🔴 Retard
  - [ ] ⚫ Expiré
- [ ] Compteur relances visible (Retry 1/3, 2/3)
- [ ] Badge LM visible si rattrapage dernière minute

### **5. Événements timeslots**
- [ ] Type timeslot visible (Arrivée, Départ, Ménage)
- [ ] Status visible (Demandé, Sélectionné, Confirmé)
- [ ] Calendrier d'exécution visible
- [ ] Statuts calendrier corrects:
  - [ ] ✅ EXECUTED
  - [ ] ⏳ PENDING
  - [ ] ❌ FAILED
  - [ ] ⊘ SKIPPED
- [ ] Badge LM sur ligne correcte
- [ ] Prochain événement marqué avec →

### **6. Événements staff**
- [ ] Assignation staff visible
- [ ] Nom staff assigné affiché
- [ ] Compteur tentatives visible (J0 2/3, J+1 1/2)
- [ ] Liste staff contactés visible (si détails)
- [ ] Stratégie visible (Priority, Rotation)

### **7. Interactions**
- [ ] Click sur événement → Change sélection
- [ ] Click sur message → Ouvre dialog preview
- [ ] Preview message affiche:
  - [ ] Titre
  - [ ] Canal (WhatsApp/Email)
  - [ ] Template utilisé
  - [ ] Destinataire
  - [ ] Schedule/Date
  - [ ] Body complet message
  - [ ] Bouton Fermer
- [ ] Dialog ferme avec X ou Fermer

### **8. Drawers/Panels**
- [ ] Panel détails s'ouvre (si carte sélectionnée)
- [ ] Boutons Config/Audit visibles
- [ ] Toggle Config ↔ Audit fonctionne
- [ ] Accordion expand/collapse fonctionne

### **9. Actions**
- [ ] Bouton "Force Execute All" cliquable
- [ ] Confirmation dialog s'ouvre
- [ ] Bouton "Assigner staff" cliquable (si applicable)
- [ ] Bouton "Tester condition" cliquable (si applicable)
- [ ] Bouton "Rafraîchir" cliquable
- [ ] Refresh recharge données

### **10. Filtres**
- [ ] Filtres affichés en haut
- [ ] Filtre listing fonctionne
- [ ] Filtre status fonctionne
- [ ] Tri fonctionne (recent, oldest)
- [ ] Search par code réservation fonctionne
- [ ] Pagination visible (si >20 items)
- [ ] Changement page fonctionne

### **11. Légende**
- [ ] Légende couleurs visible en bas
- [ ] Symboles expliqués:
  - [ ] ✅ Exécuté
  - [ ] ❌ Échec
  - [ ] ⊘ Ignoré (barré)
  - [ ] LM = dernière minute
  - [ ] ⏳ En retard
  - [ ] → Prochain
  - [ ] ⧗ Estimé
  - [ ] ✓ Confirmé

### **12. Performance**
- [ ] Page charge en <2s
- [ ] Pas de lag au scroll
- [ ] Timeline render en <1s
- [ ] Animations fluides
- [ ] Pas de freeze UI

---

## 🐛 Erreurs potentielles à vérifier

### **Console**
```bash
# Ouvrir DevTools (F12) et vérifier:
- Pas d'erreur rouge
- Pas de warning d'import
- Pas d'erreur API 404/500
```

### **Network**
```bash
# Vérifier dans l'onglet Network:
- API calls vers /api/v1/orchestrator/reservations
- API calls vers /api/v1/orchestrator/plan/:id
- Tous retournent 200 OK
```

### **Erreurs d'import courantes**
```
❌ Cannot find module 'config/backendServer.config'
   → Vérifier /src/config/backendServer.config.js existe

❌ Cannot find module 'utils/dateFormatting'
   → Vérifier /src/utils/dateFormatting.js existe

❌ Cannot find module 'tasksNew/components/AssignStaffDialog'
   → Vérifier /src/features/tasksNew/components/AssignStaffDialog.jsx existe
```

---

## 📸 Screenshots attendus

### **1. Liste réservations**
```
┌───────────────────────────────────────────────────┐
│  SJ-ABC123     SJ-DEF456     SJ-GHI789           │
│  ⚡ Active     🔄 Processing ✅ Completed         │
│  Villa Nice    Apt Paris     Studio Lyon         │
│  👤 Sarah      👤 John       👤 Marie            │
│  📅 12→22 mai  📅 15→18 mai  📅 01→07 juin       │
│  ████████ 8/10 ██████░░ 6/8  ██████████ 12/12   │
└───────────────────────────────────────────────────┘
```

### **2. Timeline**
```
════════════════════════════════════════════════════
📅 12 mai · J-3 · Réservation
────────────────────────────────────────────────────
├─ ✅ 10:14 · il y a 3 jours
│  Réservation confirmée
│  [Auto] Source: Airbnb · €1,840
│
├─ ✨ 10:14 · +18s
│  Workflow orchestrateur déclenché
│  [AI] 23 tâches générées
│
├─ 📧 10:18 · +4 min
│  Message bienvenue envoyé
│  [WhatsApp] Template welcome-villa · EN · Lu
│  [🟢 Disponible] Retry 1/3
│  « Hi Sarah! 👋 Welcome to Villa Belvédère... »
│
└─ 📱 11:00 · +42 min
   Demande sélection créneau arrivée
   [Email] Template timeslot-arrival-request
   
   Calendrier: ✅ ⏳ ⧗ ⧗
════════════════════════════════════════════════════
```

---

## ✅ Résultat attendu

**Si tous les tests passent:**
- ✅ Migration 100% réussie
- ✅ Comportement IDENTIQUE au legacy
- ✅ Prêt pour amélioration design

**Si erreurs:**
- Vérifier MIGRATION_ORCHESTRATION_LEGACY.md section "Problèmes potentiels"
- Vérifier imports dans les fichiers
- Vérifier console/network pour détails erreur

---

**Happy testing! 🎉**
