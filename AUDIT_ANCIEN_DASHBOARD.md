# 🔍 AUDIT ANCIEN DASHBOARD - OrchestrationPlans

## 📍 Fichier Source
`/Users/gouacht/sojori-dashboard/src/features/ultimateDashboard/components/orchestration/NewWorkflowTimeline.jsx` (7269 lignes)

## 🏗️ Architecture Globale

### Structure des Composants

```
NewWorkflowTimeline (composant principal)
├── displayWorkflows.map() → WorkflowTimeline
    └── WorkflowTimeline (un par workflow/catégorie)
        └── OrchestrationWorkflowTimeline
            └── <div className="flex flex-col gap-1"> (COLONNE VERTICALE)
                ├── ActionCard (WhatsApp - config fenêtre)
                ├── ActionCard (RequestTimeslot / Registration / Declaration)
                ├── ActionCard (AssignStaff - staff)
                ├── ActionCard (DeadlineEscalation - deadline)
                └── ActionCard (SendNotification - notif finale)
```

### Types de Workflows

1. **ORCHESTRATION** (5 cartes verticales)
   - `CHOICE_ARRIVAL` / `CHOICE_DEPARTURE`
   - `CLEANING_FREE` / `CLEANING_PAID` / `CLEANING_SOJORI`
   - `DECLARATION_REGISTRATION`
   - `DECLARATION_ARRIVAL` / `DECLARATION_DEPARTURE`
   - `CLIENT_REQUEST`

2. **NOTIFICATION_ONLY** (1 carte)
   - Messages simples sans orchestration

## 🎴 Structure d'une ActionCard

### Props ActionCard
```javascript
<ActionCard
  cardId={`${workflow.workflowId}-whatsapp`}
  title="WhatsApp"
  icon="📱"
  statusIcon="🟢" // ou 🔴, 🟠, ⚪
  status="INFO" // ou "COMPLETED", "PENDING", "FAILED"
  cardBorderVariant="green" // ou "red", "orange", "gray"
  selectedCard={selectedCard}
  onSelectCard={onSelectCard}
  summary="Disponible" // Texte court
  reservationNumber={reservation?.reservationNumber}
  details={<Box>... contenu détaillé ...</Box>}
/>
```

### Icons par Type d'Action
- **📱** WhatsApp (fenêtre de disponibilité)
- **🎫** RequestTimeslot / Choix créneau
- **🔐** Registration / Declaration
- **👤** AssignStaff
- **⏰** Deadline Escalation
- **📨/🔔** SendNotification

### Status Icons
- **🟢** Disponible / Actif
- **🔴** Fenêtre terminée / Erreur / Retard
- **🟠** Trop tôt / En attente
- **⚪** Non défini
- **✅** Complété
- **⏳** En cours
- **ℹ️** Info

## 📊 Contenu Détaillé des Cartes

### 1. Carte WhatsApp (pour workflows avec mapping)
```
├─ statusIcon: 🟢 Disponible | 🔴 Fenêtre terminée | 🟠 Trop tôt
├─ summary: "Disponible" | "Fenêtre terminée" | "Trop tôt"
└─ details:
   ├─ Service: ✅ Activé | ❌ Désactivé
   ├─ Statut: 🟢 Disponible
   ├─ Fenêtre: 10/05 10:00 → 15/05 23:59
   └─ Reste: 2j 5h
```

### 2. Carte RequestTimeslot / Choix Créneau
```
├─ title: "Choisir arrivée" | "Départ" | "Ménage inclus"
├─ statusIcon: ✅ (si complété) | ⏳ (en cours) | 🔴 (retard)
├─ summary: "📨 ⏳ 10/05 2🔔" (date + nb relances)
│   "Relances client · en retard" (sous-titre)
└─ details:
   ├─ Template: "template_name"
   ├─ Trigger: J-3 à 11h
   ├─ Deadline: 12/05 23:59
   ├─ Créneaux disponibles: [liste]
   ├─ Relances planifiées: Calendrier avec dates
   │   ├─ 10/05 11:00 ✅ Envoyé
   │   ├─ 11/05 11:00 ⏳ Prévu
   │   └─ 12/05 11:00 LM ⏳ Relance LM
   ├─ Actions manuelles:
   │   ├─ [Dropdown heures] [Bouton "Envoyer relance"]
   │   └─ [Dropdown créneaux] [Bouton "Définir créneau"]
   └─ ▶ Config | ▶ Audit (expand buttons)
```

### 3. Carte Registration / Declaration
```
├─ title: "Registration" | "Déclarer arrivée" | "Déclarer départ"
├─ statusIcon: 🔐
├─ summary: "⏳ À déclarer · relances en retard" | "0V / 0D / 0N" (stats)
└─ details:
   ├─ Stats enregistrement: 2 validés, 1 brouillon, 0 manquant
   ├─ Template: "registration_reminder"
   ├─ Relances: J-3, J-2, J-1 à 11h, 16h (6 relances)
   ├─ Calendrier relances
   ├─ Actions manuelles:
   │   ├─ [Bouton "📱 Envoyer WhatsApp"]
   │   ├─ [Dropdown heure] [Bouton "✓ Déclarer arrivée (15h)"]
   │   └─ [Bouton "🎯 Exécuter enregistrement"]
   └─ ▶ Config | ▶ Audit
```

### 4. Carte AssignStaff
```
├─ title: "Staff"
├─ statusIcon: ✅ (si assigné) | ⏳ (en cours)
├─ summary: "⏳ 0/3 essais" | "Assigné: Mohamed"
└─ details:
   ├─ Stratégie: PRIORITY | ROUND_ROBIN
   ├─ Créneaux: J/J+1/J+2
   ├─ Tentatives:
   │   ├─ J · 1/3 · Staff A · Refusé (occupé)
   │   ├─ J · 2/3 · Staff B · Refusé (indisponible)
   │   └─ J+1 · 1/3 · Staff C · ⏳ En attente
   ├─ Staff assigné: Mohamed (accepté le 10/05)
   ├─ Actions manuelles:
   │   ├─ [Bouton "👤 Assigner manuellement"]
   │   └─ [Bouton "🔄 Auto-assign staff"]
   └─ ▶ Config | ▶ Audit
```

### 5. Carte Deadline Escalation
```
├─ title: "Deadline"
├─ statusIcon: ✅ (OK) | 🔴 (en retard)
├─ summary: "N/A" | "En retard"
│   "Deadline · en retard" (sous-titre)
└─ details:
   ├─ Type: TIMESLOT_CHOICE | STAFF_ASSIGNMENT
   ├─ Deadline: 12/05 23:59
   ├─ Escalade à: ADMIN | OWNER
   ├─ Historique:
   │   ├─ 10/05 11:00 ⏰ Deadline atteinte
   │   ├─ 10/05 11:01 🔔 Escalade ADMIN
   │   └─ 10/05 12:30 ✅ Résolu (manuel)
   └─ ▶ Config | ▶ Audit
```

### 6. Carte Notifications (admin/client)
```
├─ title: "Notifications"
├─ statusIcon: ℹ️
├─ summary: "Admin & Client"
└─ details:
   ├─ Type: DEADLINE_REACHED | STAFF_ASSIGNED
   ├─ Destinataires: Admin + Client
   ├─ Messages envoyés:
   │   ├─ 📧 Email admin - 10/05 11:01
   │   └─ 📱 WhatsApp client - 10/05 11:02
   └─ ▶ Config | ▶ Audit
```

## 🔄 États et Statuts

### Status Badge (chip en haut de carte)
```javascript
const getTechnicalPlanStatusChip = (status) => {
  if (status === 'COMPLETED') return { chipClass: 'bg-green-100 text-green-800', label: '✅' };
  if (status === 'PENDING') return { chipClass: 'bg-yellow-100 text-yellow-800', label: '⏳' };
  if (status === 'FAILED') return { chipClass: 'bg-red-100 text-red-800', label: '❌' };
  if (status === 'IN_PROGRESS') return { chipClass: 'bg-blue-100 text-blue-800', label: '🔵' };
  return { chipClass: 'bg-gray-100 text-gray-800', label: 'ℹ️' };
}
```

### Card Border Color
- **green**: Disponible, complété, OK
- **red**: Retard, erreur, fenêtre terminée
- **orange**: En attente, trop tôt
- **gray**: Neutre, info, non défini
- **purple**: Action en cours

## 📅 Calendrier de Relances

### Format Ligne Calendrier
```
📨 10/05 11:00 · 1🔔 · ✅ Envoyé WhatsApp (msg_12345)
📧 11/05 11:00 · 2🔔 · ⏳ Prévu
LM 📨 12/05 16:00 · 3🔔 · ⏳ Relance LM (rattrapage)
⊘ 13/05 11:00 · SKIPPED · Plus récent existe
```

### Badges Spéciaux
- **LM**: Last Minute (rattrapage de dernière minute)
- **⊘**: SKIPPED (sauté pour raison)
- **🔔**: Nombre de relances

## 🎯 Actions Manuelles

### Boutons Disponibles par Type

**RequestTimeslot:**
- `[Dropdown heure] [Bouton "Envoyer relance"]` → Force envoi immédiat
- `[Dropdown créneau] [Bouton "Définir créneau"]` → Marque créneau comme choisi

**Registration/Declaration:**
- `[Bouton "📱 Envoyer WhatsApp"]` → Force envoi message
- `[Dropdown heure] [Bouton "✓ Déclarer arrivée"]` → Marque comme déclaré
- `[Bouton "🎯 Exécuter enregistrement"]` → Crée tâches depuis guests

**AssignStaff:**
- `[Bouton "👤 Assigner manuellement"]` → Ouvre dialog sélection staff
- `[Bouton "🔄 Auto-assign staff"]` → Lance auto-assignation

**DeadlineEscalation:**
- Pas de boutons (automatique)

## 🔍 Expand Config/Audit

### Config Panel (▶ Config)
```json
{
  "trigger": "BEFORE_ARRIVAL",
  "timing": { "value": 3, "unit": "DAYS" },
  "preferredHours": "11-16",
  "templateId": "template_xxx",
  "channelPriority": "WHATSAPP_PRIORITY",
  "deadline": { "value": 1, "unit": "DAYS" },
  "reminders": [
    { "timing": { "value": 1, "unit": "DAYS" }, "condition": "NOT_RESPONDED" }
  ]
}
```

### Audit Panel (▶ Audit)
```
📜 Historique complet
├─ 10/05 11:00 · INITIAL_SENT · 📱 WhatsApp (msg_12345)
├─ 11/05 11:00 · REMINDED · 📧 Email (msg_12346)
├─ 12/05 11:00 · REMINDED · 📱 WhatsApp LM (msg_12347)
├─ 12/05 14:30 · TIMESLOT_SELECTED · Créneau 15h choisi par client
└─ 12/05 14:31 · COMPLETED · Workflow terminé
```

## 🎨 Styling Classes

### Layout Principal
```css
.flex.flex-col.gap-1 /* Mobile - colonnes verticales spacing réduit */
.md:gap-2.md:pb-2   /* Desktop - spacing normal */
```

### ActionCard Borders
```javascript
cardBorderVariant="green" → border-2 border-green-300
cardBorderVariant="red" → border-2 border-red-300
cardBorderVariant="orange" → border-2 border-orange-300
cardBorderVariant="gray" → border-2 border-gray-300
```

### Background Gradients
```css
from-green-50 to-emerald-50  /* Disponible */
from-red-50 to-rose-50        /* Erreur/Retard */
from-orange-50 to-amber-50    /* En attente */
from-gray-50 to-gray-50       /* Neutre */
from-purple-50 to-purple-50   /* Action */
```

## 📦 Données API

### Workflow Object
```typescript
{
  workflowId: string;
  category: string; // "arrival_choose", "registration"
  categoryDisplayLabel: string; // "Choisir arrivée"
  categoryType: "CHOICE_ARRIVAL" | "DECLARATION_REGISTRATION" | etc;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  timeslotCode: string;
  timeslotId: string | null;

  whatsappInfo?: {
    serviceEnabled: boolean;
    canRequestFrom: string; // ISO date
    canRequestUntil: string; // ISO date
  };

  registrationStats?: {
    adults: number;
    validated: number;
    draft: number;
    notRegistered: number;
    updatedAt: string;
  };

  declarationInfo?: {
    actualTime: string;
    confirmedBy: string;
    method: string;
    computedStatus: string;
    customerStatus?: string;
    updatedAt: string;
  };

  actions: {
    requestTimeslot?: {
      actionId: string;
      status: string;
      config: {...};
      deadline: string;
      scheduledExecutions: Array<{
        executionId: string;
        scheduledAt: string;
        status: "PENDING" | "EXECUTED" | "SKIPPED" | "FAILED";
        skippedReason?: string;
        messageId?: string;
        channel?: "whatsapp" | "email";
        certainty?: "LM" | "ESTIMATED";
        metadata?: { lastMinuteRecovery?: boolean };
      }>;
      execution?: {
        initialMessage?: {...};
        reminders: Array<...>;
        response?: {...};
      };
    };

    assignStaff?: {
      actionId: string;
      status: string;
      config: {...};
      execution: {
        attempts: Array<{
          day: string;
          attemptNumber: number;
          staffId: string;
          staffName: string;
          attemptedAt: string;
          status: string;
          respondedAt?: string;
          refusalReason?: string;
        }>;
        assignedStaff?: {
          staffId: string;
          staffName: string;
          assignedAt: string;
          acceptedAt?: string;
        };
      };
    };

    deadlineEscalation?: {
      actionId: string;
      status: string;
      config: {...};
      deadline: string;
      execution?: {
        deadlineReachedAt?: string;
        escalation?: {...};
        resolution?: {...};
      };
    };

    sendNotification?: {
      actionId: string;
      status: string;
      config: {...};
      scheduledFor: string;
      execution?: {
        messageId: string;
        sentAt: string;
        channel: string;
      };
    };
  };
}
```

## 🎯 TODO - Implémenter dans V2

### Priorité 1 - Structure
- [x] Colonnes verticales par workflow (flex-col)
- [ ] ActionCard component avec expand/collapse
- [ ] 5 types de cartes (WhatsApp, Timeslot, Staff, Deadline, Notif)
- [ ] Icons et status badges corrects
- [ ] Border colors selon état

### Priorité 2 - Contenu
- [ ] Afficher vraies données de chaque action
- [ ] Calendrier de relances avec dates
- [ ] Stats registration (validés/brouillons)
- [ ] Tentatives staff avec historique
- [ ] Historique deadline escalation

### Priorité 3 - Interactions
- [ ] Click carte → expand details
- [ ] Boutons "▶ Config" / "▶ Audit"
- [ ] Actions manuelles (envoyer relance, définir créneau, etc.)
- [ ] Dialogs (assign staff, condition check, etc.)

### Priorité 4 - Polish
- [ ] LM badges (Last Minute)
- [ ] SKIPPED reasons
- [ ] WhatsApp window status (disponible/terminée)
- [ ] Sous-titres ("Relances client · en retard")
- [ ] Format dates Casablanca timezone
