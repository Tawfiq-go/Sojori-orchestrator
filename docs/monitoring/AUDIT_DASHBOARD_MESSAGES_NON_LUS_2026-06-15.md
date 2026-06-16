# Audit Dashboard — Messages Non Lus

**Date** : 2026-06-15
**Demandeur** : Owner
**Problème rapporté** : Les messages non lus ne sont pas affichés correctement dans le dashboard

---

## 🎯 Objectif

Vérifier si le compteur "Messages non lus" du dashboard affiche correctement les threads non lus visibles dans `/communications?tab=ota`.

---

## 📊 Architecture Actuelle

### Frontend
- **Page** : `/dashboard` (`src/pages/DashboardPage.tsx`)
- **Source données** : `dashboardService.getSnapshot()`
- **Champ affiché** : `snapshot.unreadMessages[]`

### Backend
- **API** : `GET /dashboard/overview` (srv-admin)
- **Retour attendu** :
  ```json
  {
    "success": true,
    "unreadMessages": [
      {
        "id": "...",
        "from": "Guest Name",
        "preview": "Message preview...",
        "timestamp": "2026-06-15T10:00:00Z",
        "channelType": "ota|whatsapp|...",
        "listingName": "..."
      }
    ]
  }
  ```

### Page Référence
- **URL** : `/communications?tab=ota`
- **Source** : Threads WhatsApp / OTA avec `unreadCount > 0`

---

## 🔍 Points à Vérifier

### 1. Backend `/dashboard/overview`
- [ ] L'API retourne-t-elle les threads non lus ?
- [ ] Les critères de "non lu" correspondent-ils à `/communications?tab=ota` ?
- [ ] Filtre par owner/listing correct ?

### 2. Frontend Dashboard
- [ ] Les données sont-elles bien récupérées depuis l'API ?
- [ ] Le mapping `snapshot.unreadMessages` est-il correct ?
- [ ] Logs console : que retourne l'API ?

### 3. Comparaison Communications
- [ ] Compter manuellement les threads non lus dans `/communications?tab=ota`
- [ ] Comparer avec le dashboard

---

## 🧪 Plan de Test

### Test 1 : Logs Console Dashboard
1. Ouvrir `/dashboard` avec DevTools
2. Chercher dans Console : `[Sojori Orchestrator] DashboardPage`
3. Noter : `snapshot.unreadMessages.length`

### Test 2 : Vérifier API Backend
1. Ouvrir DevTools → Network
2. Filter par `/dashboard/overview`
3. Regarder la réponse JSON → `unreadMessages[]`

### Test 3 : Comparer avec /communications
1. Ouvrir `/communications?tab=ota`
2. Compter threads avec badge "non lu"
3. Comparer avec dashboard

---

## 🐛 Bugs Potentiels

### Hypothèse 1 : L'API ne retourne rien
**Symptôme** : `unreadMessages: []` même s'il y a des threads non lus
**Cause** : Backend ne query pas correctement les threads
**Fix** : Vérifier la logique backend dans srv-admin

### Hypothèse 2 : Filtre owner incorrect
**Symptôme** : Les messages d'autres owners s'affichent
**Cause** : Pas de filtre `ownerId` dans la query
**Fix** : Ajouter filtre owner dans la query backend

### Hypothèse 3 : Critère "non lu" différent
**Symptôme** : Dashboard affiche X, Communications affiche Y
**Cause** : Définition de "non lu" incohérente
**Fix** : Aligner les 2 sources sur le même critère (ex : `thread.unreadCount > 0`)

---

## 🛠️ Actions Immédiates

1. **Ajouter logs détaillés** :
   ```typescript
   // src/services/dashboardService.ts ligne 463
   console.log('[Dashboard] unreadMessages from API:', {
     count: unreadMessages.length,
     messages: unreadMessages.map(m => ({
       id: m.id,
       from: m.from,
       channelType: m.channelType
     }))
   });
   ```

2. **Tester avec un owner spécifique** :
   - Se connecter comme owner
   - Ouvrir `/dashboard`
   - Ouvrir `/communications?tab=ota`
   - Comparer les compteurs

3. **Audit backend** (si problème confirmé) :
   - Vérifier route `/dashboard/overview` dans srv-admin
   - Vérifier la query MongoDB pour `unreadMessages`
   - Ajouter logs backend

---

## 📝 Résultat Attendu

✅ Dashboard affiche le **même nombre** de messages non lus que `/communications?tab=ota`
✅ Les messages affichés correspondent aux mêmes threads
✅ Filtre par owner/listing fonctionnel

---

## 🔄 Prochaines Étapes

1. Ajouter logs console (frontend)
2. Tester avec owner réel
3. Si bug confirmé → auditer backend
4. Corriger + tester
5. Documenter la fix

---

**Statut** : 🔄 En cours d'audit
**Priorité** : P1 (fonctionnalité critique pour owners)
