# Prompt Claude Design — Flow WhatsApp Conciergerie (Partenaires Sojori)

## Contexte produit

Sojori Orchestrator (PM/owners) + WhatsApp guest chatbot.
Un listing a un **toggle** pour les expériences J3 :

| Mode | Label UI owner | Comportement guest WA |
|------|----------------|------------------------|
| `own` | Ma conciergerie | Catalogue `customServices` du listing |
| `partner` | Partenaires Sojori | Activités partenaires plateforme filtrées par **ville de chaque activité** |

- Owner **ne choisit pas** le partenaire.
- Partenaire peut être **global** ; **chaque activité** a `cityIds` (+ `schedule`).
- Aujourd’hui : NOMMOS (Marrakech). Transport & courses = own (hors scope).

## Objectif

Designer le **flow WhatsApp** (écrans + microcopy FR) pour expériences partenaires, avec **date + heure** selon la config `schedule` de chaque activité.

Design system : papier `#FBFAF6`, or `#E6B022`, ink `#171410`, Geist + Instrument Serif.

---

## Schedule par activité (backend déjà prévu)

```ts
schedule: {
  dateMode: 'from' | 'sure'
  // from  = guest choisit une date ≥ max(today+minLeadDays, availableFrom)
  // sure  = « date sure » : même calendrier, microcopy « date à confirmer avec le partenaire »

  weekdays: number[]  // 1=lun … 7=dim ; [] = tous les jours

  timeMode: 'window' | 'slots'
  windowStart?: 'HH:mm'   // ex. 09:00 — si window
  windowEnd?: 'HH:mm'     // ex. 18:00
  slots?: string[]        // ex. ['09:00','11:00','14:00'] — si slots

  minLeadDays?: number    // défaut 1
  availableFrom?: 'YYYY-MM-DD' | ''
  note?: string           // ex. « Départ 7h30 le jour J »
}
```

Exposé dans le snapshot :
`customServices[].schedule` (+ `availability.schedule` pour compat).

---

## Parcours écrans à designer

1. **Entrée menu** — J3 Expériences.
2. **Teasers images** (hors flow) — ≤3 photos + caption → ouverture flow.
3. **Catalogue** — titre, catégorie, « dès X MAD », badge jours/horaires courts (ex. « Lun–Sam · 9h–18h »).
4. **Détail activité** — description, formules, note planning, CTA.
5. **Choix formule**.
6. **Date de l’activité** *(NOUVEAU — obligatoire)*  
   - Date picker / input date WhatsApp Flow.  
   - Respecter `weekdays`, `minLeadDays`, `availableFrom`.  
   - Microcopy selon `dateMode` :  
     - `from` → « Choisissez une date à partir du … »  
     - `sure` → « Indiquez la date souhaitée (confirmation partenaire) ».  
   - Jour fermé → message d’erreur inline + jours ouverts.
7. **Heure de l’activité** *(NOUVEAU — obligatoire)*  
   - `window` → saisie heure libre dans [windowStart, windowEnd] **ou** slider / champs HH:mm + validation.  
   - `slots` → RadioButtonsGroup / Dropdown des créneaux uniquement.  
   - Afficher `schedule.note` si présent.
8. **Confirmation** — activité + formule + **date** + **heure** + prix indicatif + dispo.
9. **Empty / erreurs** — pas d’activité ville ; date invalide ; créneau hors fenêtre.

---

## Données snapshot (extrait)

```
concierge.conciergeSource: 'own' | 'partner'
concierge.customServices[]: {
  id, name, description, category, images, formules[],
  whatsapp?, source: 'partner',
  schedule: { dateMode, weekdays, timeMode, windowStart, windowEnd, slots, minLeadDays, availableFrom, note }
}
listing.city / cityId
```

Payload DATA_EXCHANGE attendu (à spécifier dans le design) :
`activity_id`, `formule_label`, `formule_price_mad`, `activity_date` (YYYY-MM-DD), `activity_time` (HH:mm).

---

## Contraintes Meta / WhatsApp

- Un seul Flow générique (catalogue dynamique).
- Images hors flow.
- Screens natifs Flow ; FR d’abord.
- Pas de calendrier inventé hors composants Flow — utiliser DatePicker / composants supportés ; documenter fallback si besoin.

---

## Livrables

1. Mockups mobile des écrans 1–9 (surtout **Date** et **Heure** pour window vs slots).
2. Microcopy FR + variantes `dateMode` / `timeMode`.
3. Spec Flow JSON : screen ids, data keys, règles de validation.
4. Exemple résumé confirmation avec date+heure.
5. Note owner : admin configure le schedule sur chaque activité (Partenaires → Conciergerie · services).

## Hors scope

- Notif WA partenaire, commission, transport/grocery partenaires.

## Ton

Concierge luxe discret Marrakech ; « prix / date soumis à confirmation ». Or Sojori, pas purple AI.
