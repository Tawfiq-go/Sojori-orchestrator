# 🏠 AGENT 3 - AUDIT CATALOGUE

**AVANT DE COMMENCER** : Lis `/Users/gouacht/Sojori-orchestrator/docs/PROMPT_GENERIQUE_TOUS_AGENTS.md`

---

## 🎯 TON DOMAINE

Tu audites les pages **CATALOGUE** :

1. **Listings / Annonces** (properties, annonces)
2. **Pricing / Tarification**
3. **Channels / Canaux** (OTAs, distribution)
4. **Clients / CRM**

---

## 📂 FICHIERS À CHERCHER

### Ancien dashboard (`/Users/gouacht/sojori-dashboard/src/`)

Cherche ces mots-clés :
- `listing`, `property`, `annonce`
- `pricing`, `price`, `tarif`, `rate`
- `channel`, `ota`, `distribution`, `airbnb`, `booking`
- `client`, `customer`, `guest`, `crm`

**Exemples de fichiers possibles** :
- `components/ListingsList.jsx`
- `components/PropertyManager.jsx`
- `pages/Pricing.jsx`
- `views/ChannelManager.jsx`
- `components/ClientsCRM.jsx`

### Nouveau dashboard (`/Users/gouacht/Sojori-orchestrator/src/pages/`)

- `ListingsPage.tsx`
- `NewListingFormPage.tsx`
- `PricingPage.tsx`
- `ChannelsPage.tsx`
- `ClientsPage.tsx`

---

## 📋 CE QUE TU DOIS AUDITER

### PAGE 1 : LISTINGS

**Dans l'ancien, cherche** :
- Tableau listings : TOUTES les colonnes (nom, ville, capacité, prix, statut, etc.)
- Formulaire création/édition : TOUS les champs (description, équipements, règles, etc.)
- Boutons : Créer, Modifier, Archiver, Dupliquer, Exporter, etc.
- Filtres : Par ville, capacité, statut, propriétaire
- Stats : Total listings, actifs, inactifs, revenus moyens

**Compare avec nouveau** :
- `ListingsPage.tsx` (grid de cards)
- `NewListingFormPage.tsx` (formulaire 22 onglets)

### PAGE 2 : PRICING

**Dans l'ancien, cherche** :
- Règles de pricing : TOUTES (weekend, saison, événements, long séjour)
- Calendrier des prix : Vue par jour/semaine/mois
- Comparaison concurrence : colonnes
- AI suggestions : types de recommandations
- Boutons : Créer règle, Activer/Désactiver, Appliquer suggestion

**Compare avec nouveau** :
- `PricingPage.tsx`

### PAGE 3 : CHANNELS

**Dans l'ancien, cherche** :
- Liste OTAs : TOUTES (Airbnb, Booking, Expedia, Vrbo, etc.)
- Mapping listings : colonnes (listing interne, ID externe par OTA)
- Logs sync : colonnes (timestamp, OTA, action, statut, erreur)
- Config par OTA : champs (API key, commission, actif/inactif)
- Stats sync : succès/échecs, temps moyen

**Compare avec nouveau** :
- `ChannelsPage.tsx`

### PAGE 4 : CLIENTS (CRM)

**Dans l'ancien, cherche** :
- Tableau clients : TOUTES les colonnes (nom, email, tel, pays, total dépensé, etc.)
- Historique réservations par client : colonnes
- Communications par client : messages, notes
- Segmentation : VIP, nouveaux, inactifs
- Actions : Envoyer message, Créer résa, Marquer VIP, Exporter

**Compare avec nouveau** :
- `ClientsPage.tsx`

---

## 📊 RAPPORT À CRÉER

**Fichier** : `/Users/gouacht/Sojori-orchestrator/docs/AUDIT_AGENT_3_CATALOGUE.md`

**Structure** :
```markdown
# AUDIT AGENT 3 - CATALOGUE

## PAGE 1 : LISTINGS
[Ancien vs Nouveau vs Manquant]

## PAGE 2 : PRICING
[Ancien vs Nouveau vs Manquant]

## PAGE 3 : CHANNELS
[Ancien vs Nouveau vs Manquant]

## PAGE 4 : CLIENTS
[Ancien vs Nouveau vs Manquant]

## RÉSUMÉ
- XX colonnes manquantes
- XX filtres manquants
- XX boutons manquants
```

---

## ✅ CHECKLIST

- [ ] Cherché fichiers listings dans ancien
- [ ] Cherché fichiers pricing dans ancien
- [ ] Cherché fichiers channels dans ancien
- [ ] Cherché fichiers clients/CRM dans ancien
- [ ] Comparé avec nouveau (4 pages)
- [ ] Listé TOUT ce qui manque
- [ ] Créé rapport complet

---

**Fichier à livrer** : `AUDIT_AGENT_3_CATALOGUE.md`
