# 🧪 AGENT-INBOX - GUIDE DE TEST

**Date:** 2026-05-14
**Status:** ✅ Prêt pour tests

---

## 🔧 CORRECTION FINALE - Navigation fixée

### **Problème identifié**
La sidebar pointait vers `/communications/whatsapp` (CommsPage avec mock) au lieu de `/communications/whatsapp-guests` (WhatsAppGuestsPage avec API).

### **Correction appliquée**
```typescript
// DashboardWrapper.tsx - Ligne 40
'comms/guests': '/communications/whatsapp-guests', // ✅ Nouvelle page API
'comms/staff': '/communications/whatsapp-staff',   // ✅ Nouvelle page API
'comms/ota': '/communications/messages-ota',       // ✅ Nouvelle page API
```

---

## 🚀 DÉMARRER L'APPLICATION

### **1. Backend (Production)**
```bash
# L'API prod est déjà active
✅ https://dev.sojori.com/api/v1/ai/debug/conversations

# Pas besoin de démarrer srv-chatbot localement
```

### **2. Frontend (Sojori-orchestrator)**
```bash
cd /Users/gouacht/Sojori-orchestrator

# Vérifier configuration .env.local
cat .env.local
# Doit contenir:
# VITE_API_URL=https://dev.sojori.com
# VITE_DEV_TOKEN=your_dev_token_here

# Démarrer
pnpm dev --port 4174
```

### **3. Ouvrir le navigateur**
```
http://localhost:4174
```

---

## ✅ TESTS À EFFECTUER

### **TEST 1: Navigation sidebar → WhatsApp Guests**

1. **Cliquer sur** : `💬 WhatsApp Guests` dans la sidebar (section Communications)

2. **URL attendue** : `http://localhost:4174/communications/whatsapp-guests`

3. **Données attendues** :
   - ✅ **10 conversations** (données prod)
   - ✅ Noms réels : "tawfiq gouach", etc.
   - ✅ Numéros réservation : "SJ-4OQHVT0P", etc.
   - ✅ Listings : "Harcay CFC", etc.

4. **Vérification** :
   ```
   ❌ Si tu vois "Sarah Johnson", "Marco Rossi" → MAUVAISE PAGE (mock)
   ✅ Si tu vois "tawfiq gouach" → BONNE PAGE (API prod)
   ```

---

### **TEST 2: Sélectionner une conversation**

1. **Cliquer** sur une conversation dans la liste de gauche

2. **Résultat attendu** :
   - ✅ Thread de messages s'affiche au centre
   - ✅ Panneau latéral (aside) affiche :
     - Numéro réservation
     - Statut
     - Check-in/Check-out
     - Nom listing
     - Canal
     - Téléphone
     - Langue

3. **Vérification messages** :
   - ✅ Messages chargés depuis `/debug/messages/:phone`
   - ✅ Format : user message + AI response
   - ✅ Timestamps corrects
   - ✅ Séparateurs de jours ("Aujourd'hui", "Hier")

---

### **TEST 3: Filtres**

1. **Tester les filtres** :
   - ✨ Smart (défaut)
   - 🔴 Urgent
   - 📬 Non lus
   - 🕐 Récents

2. **Résultat attendu** :
   - ✅ Liste conversations mise à jour
   - ✅ Requête API avec `filter=...`
   - ✅ Nombre conversations affiché

---

### **TEST 4: Envoyer un message**

1. **Saisir un message** dans l'input en bas

2. **Appuyer** sur le bouton `→` ou touche Entrée

3. **Résultat attendu** :
   - ✅ Message envoyé via API `/debug/send-message`
   - ✅ Messages rechargés automatiquement
   - ✅ Nouveau message visible dans le thread

---

### **TEST 5: WhatsApp Staff**

1. **Cliquer** : `👷 WhatsApp Staff` dans la sidebar

2. **URL attendue** : `http://localhost:4174/communications/whatsapp-staff`

3. **Données attendues** :
   - ✅ Conversations sans réservation (`hasReservation=false`)
   - ✅ Filtres adaptés (recent, unread, all)

---

### **TEST 6: Messages OTA**

1. **Cliquer** : `📨 Messages OTA` dans la sidebar

2. **URL attendue** : `http://localhost:4174/communications/messages-ota`

3. **Données attendues** :
   - ✅ Table de conversations
   - ✅ Colonnes : Canal, Guest, Réservation, Propriété, Statut, Dernier message, Messages
   - ✅ Badges canaux : Airbnb, Booking, VRBO

---

## 🐛 DÉPANNAGE

### **Problème 1: Je vois toujours "Sarah Johnson" (mock)**

**Cause** : Tu es sur `/communications/whatsapp` (ancienne page)

**Solution** :
1. Vérifier l'URL dans la barre d'adresse
2. Doit être `/communications/whatsapp-guests`
3. Cliquer sur le lien sidebar à nouveau
4. Ou naviguer manuellement : `http://localhost:4174/communications/whatsapp-guests`

---

### **Problème 2: Erreur "Network Error" ou "401 Unauthorized"**

**Cause** : Problème d'authentification ou CORS

**Solution** :
1. Vérifier `.env.local` :
   ```bash
   VITE_API_URL=https://dev.sojori.com
   VITE_DEV_TOKEN=your_dev_token_here  # IMPORTANT pour localhost → prod
   ```

2. Vérifier dans DevTools → Network :
   - Header `X-Dev-Token` doit être présent
   - Header `Authorization: Bearer ...` doit être présent

3. Si pas de token :
   ```bash
   # Se connecter d'abord
   http://localhost:4174/login
   ```

---

### **Problème 3: Conversations vides ou "Aucune conversation"**

**Cause** : Problème filtre ou requête API

**Solution** :
1. Ouvrir DevTools → Console
2. Chercher erreurs rouges
3. Vérifier Network tab → Requête à `/debug/conversations`
4. Vérifier réponse API :
   ```json
   {
     "status": "success",
     "data": {
       "conversations": [...],
       "total": 10
     }
   }
   ```

---

### **Problème 4: Messages ne s'affichent pas**

**Cause** : Problème requête `/debug/messages/:phone`

**Solution** :
1. Vérifier DevTools → Network
2. Requête doit être : `GET /api/v1/ai/debug/messages/212664473257`
3. Vérifier réponse contient `messages` array
4. Vérifier Console pour erreurs

---

## 📊 DONNÉES PROD DISPONIBLES

### **Exemple conversation réelle**
```json
{
  "phone": "212664473257",
  "name": "tawfiq gouach",
  "reservation_id": "SJ-4OQHVT0P",
  "listing_id": "685d68bb158273002eb61d74",
  "listing_name": "Harcay CFC",
  "status": "Confirmed",
  "messages_count": 24,
  "last_message_time": "2026-05-14T10:00:06.233000",
  "unread_count": 0
}
```

### **Test API direct (curl)**
```bash
# Conversations
curl -s "https://dev.sojori.com/api/v1/ai/debug/conversations?limit=5" | jq .

# Messages
curl -s "https://dev.sojori.com/api/v1/ai/debug/messages/212664473257?limit=5" | jq .
```

---

## ✅ CHECKLIST DE TEST

- [ ] Naviguer vers WhatsApp Guests via sidebar
- [ ] Vérifier URL = `/communications/whatsapp-guests`
- [ ] Voir conversations prod (tawfiq gouach, etc.)
- [ ] Sélectionner une conversation
- [ ] Voir messages thread
- [ ] Voir panneau latéral (réservation, listing)
- [ ] Tester filtres (smart, urgent, unread, recent)
- [ ] Envoyer un message
- [ ] Naviguer vers WhatsApp Staff
- [ ] Naviguer vers Messages OTA
- [ ] Vérifier table OTA avec données

---

## 🎯 RÉSULTAT ATTENDU

**Après ces tests, tu dois voir :**
- ✅ 10 conversations réelles depuis prod
- ✅ Noms : "tawfiq gouach", etc. (PAS "Sarah Johnson")
- ✅ Réservations : "SJ-4OQHVT0P", etc.
- ✅ Listings : "Harcay CFC", etc.
- ✅ Messages chargés depuis API
- ✅ Envoi messages fonctionne
- ✅ Filtres fonctionnent
- ✅ Navigation sidebar correcte

---

**Si tu vois encore "Sarah Johnson" → Tu es sur la mauvaise page !**
**Vérifie l'URL : doit être `/communications/whatsapp-guests`** ✅
