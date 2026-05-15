# 🤖 PROMPT AGENT-RESERVATIONS

**Nom de l'agent** : `Agent-Reservations`
**Mission** : Intégrer les APIs réservations dans le dashboard
**Durée estimée** : 2-3h

---

## 🎯 TA MISSION

Tu es **Agent-Reservations**, spécialisé dans l'intégration des APIs de gestion des réservations.

**Objectif** : Connecter les pages réservations aux APIs backend pour :
- Afficher la liste complète des réservations (tableau)
- Afficher la vue séjour (calendrier multi-propriétés avec blocs réservations)
- Créer/Modifier/Annuler des réservations
- Filtrer par dates, propriétés, statuts

---

## 📋 CONTEXTE

**Backend** :
- Service : `srv-reservations` (port 4007)
- Path : `/Users/gouacht/sojori-production/apps/srv-reservations`
- URL local : `http://localhost:4007`

**Frontend** :
- Path : `/Users/gouacht/Sojori-orchestrator`
- Design : Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
- Stack : Vite 8 + React 18 + TypeScript + MUI v9

**Pages existantes à connecter** :
- ✅ `src/pages/ReservationSejourPage.tsx` (Vue calendrier avec mock data)
- ❌ `src/pages/ReservationsListPage.tsx` (À créer)

---

## 🔍 ÉTAPE 1 : EXPLORER LE BACKEND

### 1.1 Lire les routes API

```bash
# Explorer les routes backend
cat /Users/gouacht/sojori-production/apps/srv-reservations/src/routes/*.ts

# Ou avec grep pour voir toutes les routes
grep -r "router\\.get\\|router\\.post\\|router\\.put\\|router\\.delete" /Users/gouacht/sojori-production/apps/srv-reservations/src/routes/
```

### 1.2 Routes attendues

Tu dois identifier et documenter :
- `GET /api/v1/reservations` - Liste toutes les réservations
- `GET /api/v1/reservations/:id` - Détail réservation
- `POST /api/v1/reservations` - Créer réservation
- `PUT /api/v1/reservations/:id` - Modifier réservation
- `DELETE /api/v1/reservations/:id` - Annuler réservation
- `GET /api/v1/reservations/by-property/:propertyId` - Par propriété
- `GET /api/v1/reservations/calendar` - Données pour calendrier

### 1.3 Format des données backend

Documente le format exact (exemple) :
```typescript
interface Reservation {
  _id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry?: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  nights: number;
  guests: number;
  amount: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  source: 'airbnb' | 'booking' | 'direct' | 'other';
  bookingRef?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔧 ÉTAPE 2 : CRÉER LE SERVICE API

### 2.1 Créer le fichier service

**Fichier** : `src/services/reservationsService.ts`

```typescript
import axios from 'axios';
import type { Reservation, ReservationInput, CalendarData } from '../types/reservations.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4007';

export const reservationsService = {
  async getReservations(filters?: {
    startDate?: string;
    endDate?: string;
    propertyId?: string;
    status?: string;
  }): Promise<Reservation[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.propertyId) params.append('propertyId', filters.propertyId);
      if (filters?.status) params.append('status', filters.status);

      const response = await axios.get(`${API_URL}/api/v1/reservations?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reservations:', error);
      throw error;
    }
  },

  async getReservation(id: string): Promise<Reservation> {
    const response = await axios.get(`${API_URL}/api/v1/reservations/${id}`);
    return response.data;
  },

  async createReservation(data: ReservationInput): Promise<Reservation> {
    const response = await axios.post(`${API_URL}/api/v1/reservations`, data);
    return response.data;
  },

  async updateReservation(id: string, data: Partial<ReservationInput>): Promise<Reservation> {
    const response = await axios.put(`${API_URL}/api/v1/reservations/${id}`, data);
    return response.data;
  },

  async cancelReservation(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/v1/reservations/${id}`);
  },

  async getReservationsByProperty(propertyId: string): Promise<Reservation[]> {
    const response = await axios.get(`${API_URL}/api/v1/reservations/by-property/${propertyId}`);
    return response.data;
  },

  async getCalendarData(startDate: string, endDate: string): Promise<CalendarData> {
    const response = await axios.get(
      `${API_URL}/api/v1/reservations/calendar?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },
};
```

---

## 📝 ÉTAPE 3 : CRÉER LES TYPES TYPESCRIPT

### 3.1 Créer le fichier types

**Fichier** : `src/types/reservations.types.ts`

```typescript
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type ReservationSource = 'airbnb' | 'booking' | 'direct' | 'other';

export interface Reservation {
  _id: string;
  propertyId: string;
  propertyName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry?: string;
  guestFlag?: string; // emoji flag
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  nights: number;
  guests: number;
  amount: number;
  currency: string;
  status: ReservationStatus;
  source: ReservationSource;
  bookingRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationInput {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  amount: number;
  currency?: string;
  status?: ReservationStatus;
  source?: ReservationSource;
  bookingRef?: string;
  notes?: string;
}

export interface CalendarData {
  properties: PropertyCalendarData[];
}

export interface PropertyCalendarData {
  id: string;
  name: string;
  city: string;
  photoColor: 'gold' | 'blue' | 'purple' | 'green' | 'pink';
  occupancyPct: number;
  monthRevenue: string;
  bookedRanges: [number, number][];
  closedDays?: number[];
  reservations: ReservationBlock[];
}

export interface ReservationBlock {
  id: string;
  guestName: string;
  guestFlag?: string;
  amount: string;
  startDay: number; // day index
  endDay: number; // day index (inclusive)
  status: 'confirmed' | 'pending';
}
```

**IMPORTANT** : Adapter ces types selon ce que tu trouves dans le backend !

---

## 🎨 ÉTAPE 4A : CRÉER LA PAGE LISTE RÉSERVATIONS

### 4.1 Créer ReservationsListPage.tsx

**Fichier** : `src/pages/ReservationsListPage.tsx`

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, Select, MenuItem, TextField, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge, btnPrimarySx, btnGhostSx, tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { reservationsService } from '../services/reservationsService';
import type { Reservation, ReservationStatus } from '../types/reservations.types';

export function ReservationsListPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await reservationsService.getReservations();
      setReservations(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des réservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler cette réservation ?')) return;
    try {
      await reservationsService.cancelReservation(id);
      loadReservations();
    } catch (err) {
      alert('Erreur lors de l\'annulation');
    }
  };

  // Filtrer les réservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (propertyFilter !== 'all' && r.propertyId !== propertyFilter) return false;
      if (searchTerm && !r.guestName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [reservations, statusFilter, propertyFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const totalRevenue = reservations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + r.amount, 0);

    return { total: reservations.length, confirmed, pending, totalRevenue };
  }, [reservations]);

  // Liste propriétés uniques pour filtre
  const properties = useMemo(() => {
    const unique = new Map<string, string>();
    reservations.forEach(r => unique.set(r.propertyId, r.propertyName));
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [reservations]);

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Liste']}>
      <PageHeader
        title="Réservations"
        desc="Gérez toutes vos réservations"
        actions={
          <Button sx={btnPrimarySx} onClick={() => alert('Créer réservation (TODO)')}>
            ➕ Nouvelle réservation
          </Button>
        }
      />

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Panel title="Total" desc={String(stats.total)} sx={{ flex: 1 }} />
        <Panel title="Confirmées" desc={String(stats.confirmed)} sx={{ flex: 1 }} />
        <Panel title="En attente" desc={String(stats.pending)} sx={{ flex: 1 }} />
        <Panel title="Revenue" desc={`€${stats.totalRevenue.toLocaleString()}`} sx={{ flex: 1 }} />
      </Stack>

      {/* Filtres */}
      <Panel sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Rechercher guest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">Tous statuts</MenuItem>
            <MenuItem value="confirmed">Confirmées</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="cancelled">Annulées</MenuItem>
            <MenuItem value="completed">Terminées</MenuItem>
          </Select>
          <Select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Toutes propriétés</MenuItem>
            {properties.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Panel>

      {/* Loading */}
      {loading && (
        <Panel>
          <Typography sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
            Chargement...
          </Typography>
        </Panel>
      )}

      {/* Error */}
      {error && (
        <Panel>
          <Typography sx={{ textAlign: 'center', py: 4, color: t.error }}>
            {error}
          </Typography>
        </Panel>
      )}

      {/* Table */}
      {!loading && !error && (
        <Panel>
          <TableContainer component={Paper} elevation={0} sx={{ border: 'none' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: t.bg2 }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>GUEST</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>PROPRIÉTÉ</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>CHECK-IN</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>CHECK-OUT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>NUITS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>MONTANT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>STATUT</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>SOURCE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
                      Aucune réservation trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map(r => (
                    <TableRow key={r._id} sx={{ '&:hover': { bgcolor: t.bg2 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {r.guestName} {r.guestFlag}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: t.text3 }}>
                          {r.guestEmail}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.propertyName}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
                        {new Date(r.checkIn).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
                        {new Date(r.checkOut).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
                        {r.nights}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, fontFamily: 'Geist Mono' }}>
                        {r.currency === 'EUR' ? '€' : r.currency}{r.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === 'confirmed' ? 'success' :
                            r.status === 'pending' ? 'warning' :
                            r.status === 'cancelled' ? 'error' : 'default'
                          }
                          size="small"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        {r.source === 'airbnb' ? '🏠' : r.source === 'booking' ? '🅱️' : '📧'} {r.source}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" sx={{ ...btnGhostSx, fontSize: 11 }}>
                            👁️
                          </Button>
                          <Button size="small" sx={{ ...btnGhostSx, fontSize: 11 }}>
                            ✏️
                          </Button>
                          {r.status !== 'cancelled' && (
                            <Button
                              size="small"
                              sx={{ ...btnGhostSx, fontSize: 11, color: t.error }}
                              onClick={() => handleCancel(r._id)}
                            >
                              ❌
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Panel>
      )}
    </DashboardWrapper>
  );
}
```

---

## 🎨 ÉTAPE 4B : CONNECTER LA VUE SÉJOUR

### 4.2 Modifier ReservationSejourPage.tsx

**Fichier** : `src/pages/ReservationSejourPage.tsx`

**Remplacer le mock data par de vraies données API** :

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, Panel, tokens as t } from '../components/dashboard/DashboardV2.components';
import { MultiPropertyInventory } from '../components/MultiPropertyInventory';
import type { PropertyRow } from '../components/MultiPropertyInventory';
import { reservationsService } from '../services/reservationsService';

export function ReservationSejourPage() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(2026, 4, 11); // 12 mai 2026
      const endDate = new Date(2026, 5, 1); // 1er juin 2026

      const data = await reservationsService.getCalendarData(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setProperties(data.properties);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement du calendrier');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Vue Séjour']}>
      <PageHeader
        title="Vue Séjour"
        desc="Calendrier des réservations par propriété"
      />

      {loading && (
        <Panel>
          <Typography sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
            Chargement...
          </Typography>
        </Panel>
      )}

      {error && (
        <Panel>
          <Typography sx={{ textAlign: 'center', py: 4, color: t.error }}>
            {error}
          </Typography>
        </Panel>
      )}

      {!loading && !error && (
        <MultiPropertyInventory
          startDate={new Date(2026, 4, 11)}
          days={21}
          properties={properties}
          showPrices={false} // Pas de prix, juste réservations
          onCellClick={(propertyId, dayIdx) => {
            alert(`Clic sur ${propertyId} jour ${dayIdx + 12} mai`);
          }}
        />
      )}
    </DashboardWrapper>
  );
}
```

---

## 🔗 ÉTAPE 5 : AJOUTER LES ROUTES

### 5.1 Modifier App.tsx

**Fichier** : `src/App.tsx`

Remplacer :
```tsx
<Route path="/reservations/list" element={<div>Liste Réservations</div>} />
```

Par :
```tsx
<Route path="/reservations/list" element={<ReservationsListPage />} />
```

Et ajouter l'import :
```tsx
import { ReservationsListPage } from './pages/ReservationsListPage';
```

**Note** : ReservationSejourPage est déjà importé et configuré

---

## ✅ ÉTAPE 6 : TESTER

### 6.1 Démarrer le backend

```bash
cd /Users/gouacht/sojori-production
docker-compose -f docker-compose-v2.yml up -d srv-reservations
```

### 6.2 Vérifier que le backend répond

```bash
curl http://localhost:4007/health
curl http://localhost:4007/api/v1/reservations
curl http://localhost:4007/api/v1/reservations/calendar?startDate=2026-05-11&endDate=2026-06-01
```

### 6.3 Tester le frontend

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4174

# Ouvrir http://localhost:4174/reservations/list
# Ouvrir http://localhost:4174/reservations/sejour
```

### 6.4 Checklist tests

- [ ] Backend répond sur port 4007
- [ ] Liste réservations charge sans erreur
- [ ] Tableau affiche les réservations
- [ ] Filtres fonctionnent (status, propriété, search)
- [ ] Stats s'affichent correctement
- [ ] Bouton annuler fonctionne
- [ ] Vue séjour charge sans erreur
- [ ] Réservations s'affichent en blocs horizontaux
- [ ] Pas de prix visible dans vue séjour
- [ ] Design Aurora Soft Light respecté

---

## 🎯 RÉSULTAT ATTENDU

**Après ton travail** :
- ✅ Page `/reservations/list` fonctionnelle avec tableau
- ✅ Page `/reservations/sejour` connectée aux vraies données
- ✅ Filtres et recherche fonctionnels
- ✅ Stats affichées
- ✅ Actions CRUD disponibles
- ✅ Design Aurora Soft Light
- ✅ Loading + Error states
- ✅ Tous les tests passent

---

## 🚨 RÈGLES CRITIQUES

1. **Design** :
   - ✅ TOUJOURS utiliser tokens Aurora (`t.primary`, `t.text`, etc.)
   - ✅ TOUJOURS utiliser composants DashboardV2
   - ❌ NE JAMAIS créer de styles custom

2. **API** :
   - ✅ TOUJOURS gérer loading/error states
   - ✅ TOUJOURS adapter les types selon le backend réel
   - ✅ TOUJOURS tester avec vraies données

3. **TypeScript** :
   - ✅ TOUJOURS typer strictement
   - ❌ NE JAMAIS utiliser `any`

---

## 📝 CHECKLIST FINALE

- [ ] Backend exploré (routes identifiées)
- [ ] Service créé (`reservationsService.ts`)
- [ ] Types créés (`reservations.types.ts`)
- [ ] ReservationsListPage créée
- [ ] ReservationSejourPage modifiée (API connectée)
- [ ] Routes ajoutées
- [ ] Tests passés
- [ ] Design Aurora respecté
- [ ] Code commit

---

**GO ! Commence par explorer le backend 🚀**
