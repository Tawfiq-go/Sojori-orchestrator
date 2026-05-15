# 📅 AGENT-CALENDRIER - Rapport de Mission

**Date**: 14 Mai 2026
**Agent**: Agent-Calendrier
**Backend**: srv-calendar (port 4006)
**Mission**: Connecter CalendarInventoryPage aux vraies APIs

---

## ✅ ÉTAPES COMPLÉTÉES

### 1️⃣ Exploration Backend (srv-calendar)

**Routes identifiées**:

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/v1/calendar/:listingId/calendar` | GET | Récupère calendrier pour un listing et une période |
| `/api/v1/calendar/update-calendar` | PUT | Met à jour prix, dispo, min/max nights (bulk) |
| `/api/v1/calendar/availability` | GET | Disponibilité multi-propriétés |
| `/api/v1/calendar/occupancy-rate` | GET | Taux d'occupation pour une période |
| `/api/v1/calendar/average-daily-rate` | GET | Prix moyen journalier (ADR) |
| `/api/v1/calendar/occupancy-rate-list` | GET | Taux d'occupation multi-listings |
| `/api/v1/calendar/roomtype-availability` | GET | Disponibilité par type de chambre |

**Modèle Calendar identifié** (`src/db/models/Calendar.ts`):

```typescript
interface CalendarAttrs {
  hostawayId: number;
  listingId: number;
  date: Date;
  isAvailable?: boolean;
  isProcessed?: boolean;
  status?: string;
  price?: number;
  minimumStay?: number;
  maximumStay?: number;
  closedOnArrival?: boolean;
  closedOnDeparture?: boolean;
  note?: string;
  countAvailableUnits?: number;
  availableUnitsToSell?: number;
  countPendingUnits?: number;
  countBlockingReservations?: number;
  countBlockedUnits?: number;
  desiredUnitsToSell?: number;
  reservations?: object[];
  sojoriId?: string | Schema.Types.ObjectId;
  ownerId?: string | Schema.Types.ObjectId;
}
```

---

### 2️⃣ Service créé (`src/services/calendarService.ts`)

**Méthodes implémentées**:

1. **`getMonthCalendar(params)`**
   - Récupère les jours du calendrier pour un listing
   - Params: `{ listingId, startDate, endDate }`
   - Retourne: `CalendarDay[]`

2. **`updateCalendar(params)`**
   - Met à jour le calendrier (prix, dispo, etc.)
   - Supporte bulk update multi-jours
   - Params: `{ listingId, startDate, endDate, price, minimumStay, maximumStay, isAvailable, note, status, days }`
   - Retourne: `CalendarDay[]`

3. **`getMultiPropertyAvailability(params)`**
   - Disponibilité pour plusieurs propriétés
   - Params: `{ listingIds[], startDate, endDate }`
   - Retourne: `Record<string, CalendarDay[]>`

4. **`getOccupancyRate(params)`**
   - Calcule le taux d'occupation
   - Params: `{ listingId, startDate, endDate }`
   - Retourne: `{ rate, bookedDays, totalDays }`

5. **`getAverageDailyRate(params)`**
   - Calcule le prix moyen journalier (ADR)
   - Params: `{ listingId, startDate, endDate }`
   - Retourne: `{ adr, totalRevenue, bookedDays }`

**Base URL**: Configurable via `VITE_API_BASE_URL` (défaut: `http://localhost:4006`)

---

### 3️⃣ Types créés (`src/types/calendar.types.ts`)

**Interfaces principales**:

1. **`CalendarReservation`**
   - Représente une réservation dans le calendrier
   - Tous les champs: arrivalDate, departureDate, guestName, totalPrice, etc.

2. **`CalendarDay`**
   - Représente un jour retourné par l'API
   - Mapping 1:1 avec le modèle MongoDB

3. **`CalendarMonthRequest/Response`**
   - Types pour récupérer le calendrier d'un mois

4. **`CalendarUpdateRequest/Response`**
   - Types pour mettre à jour le calendrier

5. **`DayCell`**
   - Type UI pour une cellule de jour dans le calendrier
   - Combine données API + calculs frontend

6. **`DayStatus`**
   - Type: `'available' | 'booked' | 'closed' | 'pending'`

7. **`BulkUpdateParams`**
   - Type pour la sélection multiple de jours

8. **`OccupancyStats` / `RevenueStats`**
   - Types pour les statistiques d'occupation et revenus

---

## 🔄 MODIFICATIONS À FAIRE (CalendarInventoryPage.tsx)

### Changements requis:

#### 1. Remplacer `generateDays()` par API call

**AVANT** (mock):
```typescript
const days = useMemo(() => generateDays(year, month), [year, month]);
```

**APRÈS** (API):
```typescript
const [days, setDays] = useState<DayCell[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const data = await calendarService.getMonthCalendar({
        listingId: propertyId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      // Transform API data to DayCell format
      const cells = transformCalendarDaysToCells(data, year, month);
      setDays(cells);
    } catch (err) {
      setError('Erreur lors du chargement du calendrier');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchCalendar();
}, [year, month, propertyId]);
```

#### 2. Ajouter fonction de transformation

```typescript
function transformCalendarDaysToCells(
  apiDays: CalendarDay[],
  year: number,
  month: number
): DayCell[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Monday=0
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells: DayCell[] = [];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Create map of API days by date
  const dayMap = new Map<string, CalendarDay>();
  apiDays.forEach(d => {
    const dateStr = new Date(d.date).toISOString().split('T')[0];
    dayMap.set(dateStr, d);
  });

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const d = new Date(year, month, dayNum);
    const dateStr = d.toISOString().split('T')[0];
    const wd = (d.getDay() + 6) % 7;

    const apiDay = dayMap.get(dateStr);

    // Determine status
    let status: DayStatus = 'available';
    let bookedBy = undefined;

    if (apiDay) {
      if (!apiDay.isAvailable) {
        status = 'closed';
      } else if (apiDay.reservations && apiDay.reservations.length > 0) {
        status = 'booked';
        const res = apiDay.reservations[0];
        bookedBy = {
          initials: (res.guestFirstName?.[0] || '') + (res.guestLastName?.[0] || ''),
          name: res.guestName || 'Guest',
          source: 'airbnb' as const, // TODO: detect source
        };
      }
    }

    cells.push({
      date: dateStr,
      day: dayNum,
      weekday: wd,
      inMonth,
      status,
      price: apiDay?.price || 0,
      minNights: apiDay?.minimumStay || 1,
      maxNights: apiDay?.maximumStay,
      checkInAllowed: !apiDay?.closedOnArrival,
      checkOutAllowed: !apiDay?.closedOnDeparture,
      note: apiDay?.note,
      bookedBy,
      isToday: isCurrentMonth && today.getDate() === dayNum && inMonth,
      raw: apiDay,
    });
  }

  return cells;
}
```

#### 3. Implémenter bulk update

```typescript
const handleBulkUpdate = async (updates: {
  price?: number;
  isAvailable?: boolean;
  minimumStay?: number;
  maximumStay?: number;
}) => {
  try {
    setLoading(true);

    // Convert selected dates to weekday names if all 7 days selected
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = selection.map(dateStr => {
      const d = new Date(dateStr);
      const wd = (d.getDay() + 6) % 7; // Monday=0
      return weekdays[wd];
    });

    // Determine date range
    const dates = selection.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0].toISOString().split('T')[0];
    const endDate = dates[dates.length - 1].toISOString().split('T')[0];

    await calendarService.updateCalendar({
      listingId: propertyId,
      startDate,
      endDate,
      price: updates.price || 0,
      minimumStay: updates.minimumStay || 1,
      maximumStay: updates.maximumStay || 30,
      isAvailable: updates.isAvailable ?? true,
      note: '',
      status: '',
      days: selectedDays.length === 7 ? weekdays : selectedDays,
    });

    // Reload calendar
    await fetchCalendar();

    toast.success('Calendrier mis à jour avec succès');
    setSelection([]);
  } catch (err) {
    toast.error('Erreur lors de la mise à jour');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
```

#### 4. Fetch stats avec API

```typescript
const fetchStats = async () => {
  try {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const [occupancy, adr] = await Promise.all([
      calendarService.getOccupancyRate({ listingId: propertyId, startDate, endDate }),
      calendarService.getAverageDailyRate({ listingId: propertyId, startDate, endDate }),
    ]);

    setStats({
      available: 30 - occupancy.bookedDays,
      booked: occupancy.bookedDays,
      closed: 0, // TODO: calculate from calendar
      occupancy: occupancy.rate,
      revenue: adr.totalRevenue,
      aiOpportunity: 0, // TODO: implement AI pricing suggestions
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
};
```

---

## 📋 CHECKLIST STANDARD

- [x] Explorer backend (routes, modèles)
- [x] Créer service (`calendarService.ts`)
- [x] Créer types (`calendar.types.ts`)
- [ ] Modifier `CalendarInventoryPage.tsx`:
  - [ ] Remplacer `generateDays()` par `calendarService.getMonthCalendar()`
  - [ ] Ajouter `transformCalendarDaysToCells()`
  - [ ] Implémenter `handleBulkUpdate()`
  - [ ] Implémenter `fetchStats()`
  - [ ] Ajouter loading/error states
  - [ ] Gérer les imports
- [ ] Tester backend: `docker-compose up -d srv-calendar`
- [ ] Tester frontend: vérifier loading, données, bulk update
- [ ] Vérifier sync avec canaux (si implémenté backend)

---

## 🔄 PROCHAINES ÉTAPES

**Pour compléter l'intégration** (nécessite implémentation):

1. **Tests avec backend réel**:
   ```bash
   # Démarrer srv-calendar
   cd /Users/gouacht/sojori-production
   docker-compose up -d srv-calendar

   # Vérifier le service
   curl http://localhost:4006/api/v1/calendar/[listingId]/calendar?startDate=2026-05-01&endDate=2026-05-31
   ```

2. **Modifier CalendarInventoryPage.tsx** avec les modifications ci-dessus

3. **Tester dans le navigateur**:
   - Navigation mois par mois
   - Sélection multiple jours (drag)
   - Bulk update prix/dispo
   - Statistiques d'occupation
   - Panel de détail jour

4. **Intégration AI pricing** (si API existe):
   - Route: `/api/v1/pricing/suggestions`
   - Afficher suggestions dans les cellules
   - Calculer le manque-à-gagner

5. **Sync canaux** (si API existe):
   - Bouton "Sync canaux" → trigger sync Airbnb/Booking
   - Afficher status sync par jour (ok/pending/error)

---

## 🚨 POINTS D'ATTENTION

1. **Backend doit être up**: srv-calendar port 4006
2. **Variables d'environnement**:
   ```env
   VITE_API_BASE_URL=http://localhost:4006
   ```
3. **Authentification**: Les routes nécessitent-elles un JWT ? (voir `authenticateJWT` middleware)
4. **Multi-propriétés**: Vue multi utilise des données mock, il faudra implémenter `getMultiPropertyAvailability`
5. **AI Pricing**: L'API `/api/v1/pricing/suggestions` n'est pas encore identifiée dans les routes

---

## 📊 RÉSULTAT ATTENDU

**AVANT** (mock):
- Fonction `generateDays()` génère des données fictives
- Aucune persistance
- Aucune synchronisation réelle

**APRÈS** (API):
- Données réelles depuis MongoDB via srv-calendar
- Bulk update fonctionne et persiste
- Stats réelles (occupation, ADR, revenus)
- Sync canaux (si API existe)
- Loading/error states

---

**FIN RAPPORT - AGENT-CALENDRIER**
Agent-Calendrier · 14 Mai 2026
