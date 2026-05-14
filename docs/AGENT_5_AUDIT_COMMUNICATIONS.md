# 💬 AGENT 5 - AUDIT COMMUNICATIONS

**AVANT DE COMMENCER** : Lis `/Users/gouacht/Sojori-orchestrator/docs/PROMPT_GENERIQUE_TOUS_AGENTS.md`

---

## 🎯 TON DOMAINE

Tu audites les pages **COMMUNICATIONS** :

1. **WhatsApp Guests** (messages clients)
2. **WhatsApp Staff** (messages équipe)
3. **OTA Messages** (messages plateformes)
4. **Reviews / Avis** (gestion des avis)
5. **Requests / Demandes** (demandes spéciales)

---

## 📂 FICHIERS À CHERCHER

### Ancien dashboard (`/Users/gouacht/sojori-dashboard/src/`)

Cherche ces mots-clés :
- `whatsapp`, `message`, `chat`, `conversation`
- `review`, `avis`, `rating`, `note`
- `request`, `demande`, `special request`
- `ota`, `airbnb message`, `booking message`
- `communication`, `inbox`

**Exemples de fichiers possibles** :
- `components/WhatsAppMessages.jsx`
- `components/GuestChat.jsx`
- `components/StaffChat.jsx`
- `pages/Reviews.jsx`
- `components/ReviewsManager.jsx`
- `views/Requests.jsx`
- `components/OTAInbox.jsx`

### Nouveau dashboard (`/Users/gouacht/Sojori-orchestrator/src/pages/`)

- `WhatsAppGuestsPage.tsx`
- `WhatsAppStaffPage.tsx`
- `OTAMessagesPage.tsx`
- `ReviewsPage.tsx`
- `RequestsPage.tsx`

---

## 📋 CE QUE TU DOIS AUDITER

### PAGE 1 : WHATSAPP GUESTS

**Dans l'ancien, cherche** :
- Liste conversations : TOUTES les colonnes (guest, property, dernier message, timestamp, statut, non lus)
- Zone messages : affichage (qui parle, timestamp, status delivered/read, images/docs)
- Fonctionnalités : Envoyer texte, Joindre image/PDF, Templates rapides, Emojis
- Actions spéciales : Créer réservation depuis chat, Marquer important, Archiver
- Filtres : Par property, par statut (répondu/non répondu), par date
- Recherche dans messages : full-text search
- Stats : Messages non lus, temps de réponse moyen, satisfaction

**Compare avec nouveau** :
- `WhatsAppGuestsPage.tsx`

### PAGE 2 : WHATSAPP STAFF

**Dans l'ancien, cherche** :
- Liste staff : colonnes (nom, rôle, dernier message, statut online/offline)
- Zone messages : même fonctionnalités que guests
- Groupes : création/gestion de groupes staff
- Diffusion : envoi message à tous
- Actions : Assigner tâche depuis message, Partager planning
- Intégrations : Notifications push, sons
- Stats : Messages par staff, taux de lecture

**Compare avec nouveau** :
- `WhatsAppStaffPage.tsx`

### PAGE 3 : OTA MESSAGES

**Dans l'ancien, cherche** :
- Liste messages par OTA : TOUTES les colonnes (OTA, guest, property, sujet, date, lu/non lu)
- Filtres : Par OTA (Airbnb, Booking, Expedia, etc.), par property, par statut
- Actions : Répondre, Marquer lu, Archiver, Créer réservation depuis message
- Modèles de réponses : pré-remplissages
- Sync status : dernière synchro par OTA, erreurs
- Stats : Messages non lus par OTA, temps de réponse

**Compare avec nouveau** :
- `OTAMessagesPage.tsx`

### PAGE 4 : REVIEWS

**Dans l'ancien, cherche** :
- Tableau avis : TOUTES les colonnes (guest, property, rating, date, source OTA, commentaire, réponse, statut)
- Filtres : Par rating (1-5 étoiles), par property, par OTA, par statut (répondu/non répondu)
- Formulaire réponse : champs (texte réponse, templates, langue)
- Actions : Répondre, Signaler problème, Marquer favori, Exporter
- Stats : Rating moyen global, rating par property, rating par OTA, évolution dans le temps
- Graphiques : Tendance ratings, distribution étoiles

**Compare avec nouveau** :
- `ReviewsPage.tsx`

### PAGE 5 : REQUESTS

**Dans l'ancien, cherche** :
- Tableau demandes : TOUTES les colonnes (guest, property, type demande, date, statut, assigné à, priorité)
- Types de demandes : Early check-in, Late checkout, Extra bed, Cleaning, Transport, Grocery, Custom
- Filtres : Par type, par statut (pending/approved/rejected), par property, par date
- Formulaire traitement : champs (réponse, prix additionnel, notes internes)
- Actions : Approuver, Rejeter, Assigner staff, Créer tâche associée
- Stats : Demandes en attente, taux d'acceptation, revenus additionnels

**Compare avec nouveau** :
- `RequestsPage.tsx`

---

## 📊 RAPPORT À CRÉER

**Fichier** : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_5_COMMUNICATIONS.md`

**Structure** :
```markdown
# AUDIT AGENT 5 - COMMUNICATIONS

## PAGE 1 : WHATSAPP GUESTS
[Ancien vs Nouveau vs Manquant]

## PAGE 2 : WHATSAPP STAFF
[Ancien vs Nouveau vs Manquant]

## PAGE 3 : OTA MESSAGES
[Ancien vs Nouveau vs Manquant]

## PAGE 4 : REVIEWS
[Ancien vs Nouveau vs Manquant]

## PAGE 5 : REQUESTS
[Ancien vs Nouveau vs Manquant]

## RÉSUMÉ
- XX colonnes manquantes
- XX filtres manquants
- XX boutons manquants
```

---

## ✅ CHECKLIST

- [ ] Cherché fichiers WhatsApp/messages dans ancien
- [ ] Cherché fichiers reviews dans ancien
- [ ] Cherché fichiers requests/demandes dans ancien
- [ ] Cherché fichiers OTA messages dans ancien
- [ ] Comparé avec nouveau (5 pages)
- [ ] Listé TOUT ce qui manque
- [ ] Créé rapport complet

---

**Fichier à livrer** : `AUDIT_AGENT_5_COMMUNICATIONS.md`
