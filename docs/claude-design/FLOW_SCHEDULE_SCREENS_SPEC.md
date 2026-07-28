# Spec écrans DATE & HEURE — Flow Conciergerie Partenaires

Companion de `PROMPT_WHATSAPP_CONCIERGERIE_PARTENAIRES.md`.  
Design-ready (pas de code). Tokens Sojori : papier `#FBFAF6`, or `#E6B022`, ink `#171410`, Geist + Instrument Serif. Pas de purple.

Payload DATA_EXCHANGE (clés schedule) : `activity_date` (`YYYY-MM-DD`), `activity_time` (`HH:mm`).

---

## 1. Écran DATE — `ACTIVITY_DATE`

**Screen ID :** `ACTIVITY_DATE`  
**Composant :** DatePicker Flow (fallback : champ date si DatePicker indisponible).  
**Clé :** `activity_date`

### Variantes `dateMode`

| Mode | Titre | Helper | Hint sous champ |
|------|-------|--------|-----------------|
| `from` | Date de l’expérience | Choisissez une date à partir du {minDate}. | Ouvert : {joursOuverts} |
| `sure` | Date souhaitée | Indiquez la date souhaitée — confirmation avec le partenaire. | Ouvert : {joursOuverts} |

- `{minDate}` = max(today + `minLeadDays`, `availableFrom`) formaté FR (`15 juil. 2026`).
- `{joursOuverts}` = libellé court depuis `weekdays` (ex. `Lun–Sam`, `Tous les jours`, `Ven & Sam`).
- Si `schedule.note` concerne le jour J : pied d’écran discret en ink secondaire (ex. « Départ 7h30 le jour J »).

### Microcopy FR — exemples

**`from` + weekdays `[1,2,3,4,5,6]` + minLeadDays `1`**
- Titre : *Date de l’expérience*
- Helper : *Choisissez une date à partir du 29 juil. 2026.*
- Hint : *Ouvert : Lun–Sam*
- Erreur jour fermé : *Cette date n’est pas disponible. Ouvert : Lun–Sam.*

**`sure` + weekdays `[]` (tous) + availableFrom `2026-08-01`**
- Titre : *Date souhaitée*
- Helper : *Indiquez la date souhaitée (confirmation partenaire).*
- Hint : *À partir du 1 août 2026 · Tous les jours*
- Pied : *La date sera confirmée par le partenaire.*

**`from` + weekdays `[5,6]` uniquement**
- Helper : *Choisissez une date à partir du 31 juil. 2026.*
- Hint : *Ouvert : Ven & Sam*
- Erreur : *Cette date n’est pas disponible. Ouvert : Ven & Sam.*

### CTA
- Primaire or : *Continuer* → `ACTIVITY_TIME`
- Secondaire ink : *Retour*

---

## 2. Écran HEURE — `ACTIVITY_TIME`

**Screen ID :** `ACTIVITY_TIME`  
**Clé :** `activity_time`  
**Afficher** `schedule.note` si présent (sous le champ / liste).

### Variantes `timeMode`

| Mode | UI | Titre | Helper |
|------|----|-------|--------|
| `window` | Saisie HH:mm (ou 2 champs H / min) | Heure souhaitée | Entre {windowStart} et {windowEnd}. |
| `slots` | RadioButtonsGroup ou Dropdown | Créneau | Choisissez un créneau. |

### Microcopy FR — exemples

**`window` — 09:00 → 18:00**
- Titre : *Heure souhaitée*
- Helper : *Entre 09:00 et 18:00.*
- Placeholder : *HH:mm* (ex. `14:30`)
- Note : *Départ 7h30 le jour J* (si `note`)
- Erreur hors fenêtre : *Choisissez une heure entre 09:00 et 18:00.*
- Erreur format : *Indiquez l’heure au format HH:mm (ex. 14:30).*

**`slots` — `['09:00','11:00','14:00']`**
- Titre : *Créneau*
- Helper : *Choisissez un créneau.*
- Options : `09:00` · `11:00` · `14:00`
- Erreur vide : *Sélectionnez un créneau pour continuer.*

**`window` étroite — 16:00 → 19:00 + note**
- Helper : *Entre 16:00 et 19:00.*
- Note : *Coucher de soleil — horaires variables selon la saison.*

### CTA
- Primaire or : *Continuer* → `CONFIRM`
- Secondaire : *Retour* → `ACTIVITY_DATE`

---

## 3. Screen IDs & clés (extrait schedule)

| Screen ID | Rôle | Clés émises / lues |
|-----------|------|--------------------|
| `ACTIVITY_DATE` | Choix date | `activity_date` |
| `ACTIVITY_TIME` | Choix heure | `activity_time` |
| `CONFIRM` | Récap | lit `activity_date`, `activity_time` (+ activité, formule, prix) |

Autres clés parcours (hors scope détail ici) : `activity_id`, `formule_label`, `formule_price_mad`.

---

## 4. Règles de validation (à faire respecter par le flow)

### Date (`activity_date`)
1. Obligatoire.
2. Format `YYYY-MM-DD`.
3. ≥ `max(today + minLeadDays, availableFrom)` — `minLeadDays` défaut `1` ; `availableFrom` vide = ignorer.
4. Jour de semaine ∈ `weekdays` ; si `weekdays` vide/`[]` → tous les jours OK.
5. Sinon → erreur inline + rappel des jours ouverts (ne pas avancer).

### Heure (`activity_time`)
1. Obligatoire.
2. Format `HH:mm` (24h).
3. `timeMode === 'window'` → `windowStart` ≤ heure ≤ `windowEnd` (inclus).
4. `timeMode === 'slots'` → heure ∈ `slots` uniquement (pas de saisie libre).
5. Sinon → erreur inline (ne pas avancer).

### Ordre
Date avant heure. Retour depuis HEURE ne doit pas vider la date déjà validée.

---

## 5. Confirmation — lignes date + heure (exemples)

Écran `CONFIRM` — bloc planning en ink, label secondaire, valeurs Geist ; prix / dispo « soumis à confirmation ».

**`from` + `window`**
```
Date     2 août 2026
Heure    14:30
```
Sous-ligne : *Prix et disponibilité soumis à confirmation.*

**`sure` + `slots`**
```
Date souhaitée     15 août 2026
Créneau            11:00
```
Sous-ligne : *Date et créneau à confirmer avec le partenaire.*

**Avec note planning**
```
Date     5 sept. 2026
Heure    09:00
```
Pied : *Départ 7h30 le jour J · confirmation partenaire.*

**Empty / erreur (rappel)**
- Pas d’activité ville : hors écrans DATE/HEURE.
- Date invalide / créneau hors fenêtre : rester sur l’écran concerné avec microcopy d’erreur ci-dessus.
