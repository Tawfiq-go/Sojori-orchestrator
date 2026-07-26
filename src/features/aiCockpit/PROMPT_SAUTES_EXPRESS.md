# Prompt agent Cockpit — sauts « exprès » (pas des bugs)

Copie-colle ce bloc à l’agent Cockpit / IA ops.

---

## Situation

Sur les plans orchestration (surtout **Choisir départ** + **Instructions départ**), le backend applique des garde-fous plateforme (G1 / G1b / G2) indépendants de la config PM :

1. **G1 — départ jamais avant l’arrivée**  
   Relances `departure_choose` calées avant que le guest soit « là » (avant le lendemain du jour d’arrivée) → **reportées** à la **veille du départ** (séjour 1 nuit → jour d’arrivée **18:00**).

2. **Regroupement**  
   Si plusieurs relances retombent sur le **même créneau** → une seule reste `en_attente`, les autres passent `saute` avec reason `regroupe_veille_depart`.

3. **G1b — Instructions départ**  
   Le message planifié `departure_instructions` suit **la même logique** (recaler / regrouper). Ce n’est **pas** un blocage d’envoi : on décale pour envoyer au bon moment, ou on saute un doublon.

4. **Doublons `plan.messages` (`msg_relance_*`)**  
   Les relances guest vivent aussi en copie dans `plan.messages`. Si la séquence est déjà `saute` / `fait` mais le message reste `en_attente`, le Cockpit affichait à tort **« Message planifié en retard »**.  
   → Ces `msg_relance_*` sont **exclus** du Day Plan (la vérité = séquence 🔔). Les fantômes sont synchronisés (`intentionalSkip`) avec la séquence.

Champs à lire sur chaque relance / message :
- `status: saute`
- `reason` machine (`regroupe_veille_depart`, `reporte_avant_arrivee`, `date_passee_creation`, …)
- `intentionalSkip: true` (ou reason ∈ liste plateforme ci-dessous)

Raisons **plateforme / exprès** (NE PAS traiter comme bug) :
- `regroupe_veille_depart`
- `reporte_avant_arrivee`
- `decale_collision_arrivee`
- `date_passee_creation`
- `no_body`
- `remplace_par_lm`

## Direction

- Une relance **sautée exprès** = **comportement voulu** anti-doublon / anti-spam / court séjour.  
- Elle **ne doit pas** :
  - faire monter une alerte « bug / échec / relances cassées »
  - compter dans « relances épuisées sans réponse » comme un échec d’envoi
  - pousser une action humaine urgente **seulement** parce qu’elle est `saute`
- Elle **doit** :
  - s’afficher **« sautée exprès · &lt;motif&gt; »** (neutre, pas rouge erreur)
  - laisser la relance / message **conservé(e)** (reportée ou déjà envoyée) porter le vrai suivi
- **Instructions départ** : si `fait` → OK ; si `reporte_avant_arrivee` → encore à venir au bon créneau ; si `regroupe_veille_depart` → doublon volontairement sauté.

## Correction attendue (comportement agent / UI)

Quand tu analyses un plan ou le Day Plan Cockpit :

1. Si `status === 'saute'` **et** (`intentionalSkip` **ou** reason plateforme) → conclure **« OK plateforme »**, pas « anomalie ».
2. Ne pas recommander « renvoyer la relance sautée » sauf demande explicite PM.
3. Pour un séjour 1 nuit / last-minute : expliquer en une phrase que J-2 et J-1 se **regroupent** sur la veille (souvent 18:00 jour d’arrivée).
4. Réserver les alertes `attention` / « ! » aux vrais problèmes : heure non choisie **et** plus aucune relance `en_attente`, départ non déclaré en retard, ménage non assigné, message **non** intentional encore `en_attente` en retard, etc.

### Exemple (réel)

Résa 1 nuit, Choisir départ :
- Relance #1 → `reporte_avant_arrivee` → prévue 18:00 jour d’arrivée  
- Relance #2 → `saute` + `regroupe_veille_depart` → **sautée exprès** (doublon)  
- Instructions départ → envoyées / recalées selon G1b  

→ Verdict agent : **normal**, pas de bug.
