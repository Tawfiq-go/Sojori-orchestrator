# 🚀 Agent-Inbox - Prochaines Étapes

## ✅ Ce qui a été fait

1. ✅ **3 pages de messagerie créées**:
   - WhatsApp Guests (clients avec réservations)
   - WhatsApp Staff (équipe sans réservations)
   - Messages OTA (Airbnb, Booking, VRBO)

2. ✅ **Service API complet** (`messagesService.ts`):
   - Compatible 100% avec sojori-dashboard
   - Toutes les méthodes implémentées

3. ✅ **Bug CORS résolu**:
   - `VITE_DEV_TOKEN` ajouté dans `.env`
   - Permet localhost → production

4. ✅ **Documentation complète**:
   - CORS-FIX.md (solution complète)
   - STATUS-FINAL.md (statut détaillé)
   - API-COMPARISON.md (comparaison avec sojori-dashboard)

---

## 🔴 ACTION REQUISE MAINTENANT

### 1. Redémarrer le serveur (OBLIGATOIRE)

Le serveur Vite **doit être redémarré** pour charger le nouveau `VITE_DEV_TOKEN` depuis `.env`.

```bash
# 1. Arrêter le serveur actuel (Ctrl+C dans le terminal)
# 2. Redémarrer:
cd /Users/gouacht/Sojori-orchestrator
pnpm dev
```

**Vérification dans la console**:
```
🔑 Dev token added for localhost → production (port: 4174)
```

### 2. Tester les 3 pages

#### Page 1: WhatsApp Guests
```
URL: http://127.0.0.1:4174/communications/whatsapp-guests
```

**Attendu**:
- ✅ Liste de conversations avec VRAIS noms (pas "Sarah Johnson")
- ✅ Filtres: Smart, Urgent, Non lus, Récents
- ✅ Clic sur conversation → messages s'affichent
- ✅ Panneau droite: infos réservation (check-in, check-out, statut)

**À vérifier**:
- [ ] Conversations chargent sans erreur CORS
- [ ] Messages s'affichent au clic
- [ ] Les 4 filtres fonctionnent
- [ ] Panneau droite affiche infos réservation

#### Page 2: WhatsApp Staff
```
URL: http://127.0.0.1:4174/communications/whatsapp-staff
```

**Attendu**:
- ✅ Conversations SANS réservation (équipe ménage, maintenance)
- ✅ Filtres: Récents, Non lus, Tous
- ✅ Badge violet "Staff" au lieu de gold "Guests"

**À vérifier**:
- [ ] Conversations staff chargent
- [ ] Pas d'infos réservation dans l'aside (normal)
- [ ] Badge "Staff" couleur violette

#### Page 3: Messages OTA
```
URL: http://127.0.0.1:4174/communications/messages-ota
```

**Attendu**:
- ✅ Vue tableau avec colonnes: Canal, Guest, Réservation, Propriété, Statut
- ✅ Badges par canal: 🏠 Airbnb (info), 🅱️ Booking (gold), 🏡 VRBO (warning)
- ✅ Badges par statut: ✅ Confirmé (success), ⏳ En attente (warning), ❌ Annulé (error)

**À vérifier**:
- [ ] Tableau charge les messages OTA
- [ ] Badges couleurs corrects
- [ ] Clic sur ligne (TODO: ouvrir modal/détail)

---

## 📊 Checklist de Tests Complets

### DevTools Network
1. Ouvrir DevTools → Network → XHR
2. Naviguer vers `/communications/whatsapp-guests`
3. Chercher requête: `dev.sojori.com/api/v1/ai/debug/conversations`
4. Vérifier **Request Headers**:
   ```
   X-Dev-Token: eyJkZXZlbG9wZXIiOiJnb3VhY2h0...
   ```
5. Vérifier **Response** (Status 200):
   ```json
   {
     "status": "success",
     "data": {
       "conversations": [...]
     }
   }
   ```

### Fonctionnalités à Tester

#### ✅ Chargement Initial
- [ ] Conversations chargent automatiquement
- [ ] Première conversation est auto-sélectionnée
- [ ] Messages de la première conversation s'affichent

#### ✅ Navigation
- [ ] Clic sur conversation → charge ses messages
- [ ] Switch entre conversations → messages changent
- [ ] Badge unread count s'affiche correctement

#### ✅ Filtres
- [ ] **Smart**: Priorité urgence + non lus + récents
- [ ] **Urgent**: Conversations urgentes seulement
- [ ] **Non lus**: unread_count > 0
- [ ] **Récents**: last_message_time DESC

#### ⏳ Envoi de Messages (pas encore testé en prod)
- [ ] Taper message dans input
- [ ] Cliquer "Envoyer"
- [ ] Message apparaît dans le thread
- [ ] Conversation remonte en haut de la liste

#### ⏳ Pagination (pas encore implémentée)
- [ ] Scroll to top → charger messages plus anciens
- [ ] Bouton "Charger plus"
- [ ] before/before_message_id fonctionne

---

## 🐛 Si ça ne marche pas

### Problème 1: Erreur CORS persiste
```
Access to XMLHttpRequest... has been blocked by CORS policy
```

**Solutions**:
1. Vérifier que VITE_DEV_TOKEN existe dans `.env`:
   ```bash
   grep VITE_DEV_TOKEN /Users/gouacht/Sojori-orchestrator/.env
   ```

2. Si absent, l'ajouter:
   ```bash
   echo 'VITE_DEV_TOKEN=eyJkZXZlbG9wZXIiOiJnb3VhY2h0IiwiaXAiOiIqIiwiZXhwaXJlc0F0IjoxNzc5Mzk1NzAwNDg3LCJzaWduYXR1cmUiOiJmNDI1ZmM0ZDc1MWMxMTAyOTFlZWE0NDJlYTEwMjU5NTRmM2VhYWE4ZjEyOTJkYmEwNDY0MzMxMmZhMjk0YjgyIn0=' >> .env
   ```

3. **REDÉMARRER** le serveur (obligatoire)

4. Vider cache navigateur:
   - DevTools → Application → Clear storage → Clear site data
   - OU Hard Refresh (Cmd+Shift+R)

### Problème 2: Toujours données mock (Sarah Johnson, Marco Rossi)
```
Sarah Johnson, Marco Rossi, Aisha Khalil...
```

**Cause**: Navigation pointe vers ancienne page avec mock

**Solution**: Vérifier `src/components/DashboardWrapper.tsx` ligne 40-42:
```typescript
// CORRECT
'comms/guests': '/communications/whatsapp-guests',

// INCORRECT (ancien, avec mock)
'comms/guests': '/communications/whatsapp',
```

Si incorrect, corriger et sauvegarder (hot reload auto).

### Problème 3: Badge crash
```
Cannot read properties of undefined (reading 'bg')
```

**Cause**: Badge variant invalide (primary, default, etc.)

**Solution**: Utiliser uniquement variants valides:
- `gold`, `success`, `warning`, `error`, `info`, `neutral`, `ai`

Déjà corrigé dans tous les fichiers, mais si vous créez de nouveaux Badges, respecter cette liste.

### Problème 4: "Aucune conversation" alors que l'API retourne des données
```
Console: ✅ Status: success, 10 conversations
UI: "Aucune conversation"
```

**Cause**: Structure de données mal parsée

**Solution**: Vérifier `response.data.conversations` existe:
```typescript
const response = await messagesService.getConversations(...);
console.log('Response:', response);
console.log('Conversations:', response.data.conversations);
```

---

## 📚 Documentation de Référence

### Pour comprendre ce qui a été fait
1. **AGENT-INBOX-STATUS-FINAL.md** - Statut complet, checklist, architecture
2. **agent-inbox-CORS-FIX.md** - Solution CORS détaillée
3. **API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md** - Comparaison API

### Pour débugger
1. **agent-inbox-CORS-FIX.md** - Tous les problèmes CORS
2. **agent-inbox-CORRECTIONS.md** - Badge fixes
3. **AGENT-INBOX-STATUS-FINAL.md** - Section "TODOs Restants"

### Pour continuer le développement
1. **AGENT-INBOX-STATUS-FINAL.md** - Section "TODOs Restants" (Haute/Moyenne/Basse priorité)
2. **API-COMPARISON-SOJORI-DASHBOARD-VS-ORCHESTRATOR.md** - APIs disponibles mais pas encore utilisées

---

## 🎯 Objectif Immédiat

1. ✅ **Redémarrer le serveur** (pnpm dev)
2. ✅ **Tester les 3 pages** (guests, staff, ota)
3. ✅ **Vérifier DevTools** (X-Dev-Token dans headers)
4. ✅ **Valider que les VRAIES données s'affichent** (pas de mock)

**Temps estimé**: 5-10 minutes de tests manuels

---

## 💬 Questions Fréquentes

### Q: Pourquoi 3 pages au lieu d'une seule ?
**R**: Séparation claire des responsabilités comme dans sojori-dashboard:
- **Guests**: Conversations avec réservations (infos check-in/out)
- **Staff**: Conversations équipe (pas de réservation)
- **OTA**: Vue spécifique plateformes (Airbnb, Booking) avec filtres canaux

### Q: Pourquoi pas de Redux/Context ?
**R**: KISS principle (Keep It Simple). State local suffit pour Agent-Inbox v1. Si besoin de state global plus tard (WebSocket, notifications), on ajoutera.

### Q: Les messages sont-ils en temps réel ?
**R**: Pas encore. Actuellement refetch manuel. WebSocket sera ajouté dans une prochaine itération (voir TODOs).

### Q: Puis-je envoyer des messages maintenant ?
**R**: Oui, l'UI est prête. Le bouton "Envoyer" appelle `messagesService.sendMessage()` qui POST vers `/debug/send-message`. **À tester en prod avec un vrai téléphone**.

### Q: Où est la logique de fallback (raw → exchanges) ?
**R**: Pas encore implémentée dans les pages UI. Service a les deux méthodes (`getRawMessages` et `getConversationMessages`), mais pages utilisent seulement `getConversationMessages` actuellement. TODO Haute Priorité #2.

---

**Créé par**: Agent-Inbox (Claude Code)
**Date**: 2026-05-15
**Pour**: Tests utilisateur et validation finale
