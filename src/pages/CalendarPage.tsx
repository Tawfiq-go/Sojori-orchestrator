import { useState } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, CalendarGantt, ViewToggle,
  btnGhostSx, btnSmSx,
} from '../components/dashboard/DashboardV2.components';
import { Button } from '@mui/material';
import ReservationsGanttView, { type Listing, type ReservationBlock } from '../components/views/ReservationsGanttView';

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<'simple' | 'gantt'>('gantt');

  const properties = [
    { name: 'Villa Belvédère', city: 'Nice', color: 'gold' },
    { name: 'Dar Sojori',       city: 'Marrakech', color: 'blue' },
    { name: 'Villa Atlas',      city: 'Marrakech', color: 'purple' },
    { name: 'Atlas Loft',       city: 'Marrakech', color: 'green' },
    { name: 'Médina House',     city: 'Marrakech', color: 'pink' },
  ];

  const bookings = [
    { prop: 0, start: 3, length: 7, status: 'confirmed', label: 'Sarah Johnson · 🇺🇸', price: '€1,840' },
    { prop: 0, start: 13, length: 6, status: 'pending', label: 'James Park', price: '€820' },
    { prop: 1, start: 4, length: 3, status: 'confirmed', label: 'Marco Rossi · VIP', price: '€720' },
    { prop: 2, start: 6, length: 7, status: 'pending', label: 'Aisha K. · 6p', price: '€2,850' },
    { prop: 3, start: 8, length: 14, status: 'confirmed', label: 'Linh N. · long séjour', price: '€2,240' },
    { prop: 4, start: 2, length: 5, status: 'confirmed', label: 'Yumi K. · 🇯🇵', price: '€1,250' },
  ];

  // Data for ReservationsGanttView
  const listings: Listing[] = properties.map((p, idx) => ({
    id: `l${idx + 1}`,
    name: p.name,
    city: p.city,
  }));

  const reservationBlocks: ReservationBlock[] = [
    { id: 'r1', listingId: 'l1', start: 3, length: 7, guestName: 'Sarah Johnson', guestInitials: 'SJ', status: 'confirmed', source: 'airbnb', amount: '€1,840' },
    { id: 'r2', listingId: 'l1', start: 13, length: 6, guestName: 'James Park', guestInitials: 'JP', status: 'pending', source: 'booking', amount: '€820' },
    { id: 'r3', listingId: 'l2', start: 4, length: 3, guestName: 'Marco Rossi', guestInitials: 'MR', status: 'confirmed', source: 'direct', amount: '€720' },
    { id: 'r4', listingId: 'l3', start: 6, length: 7, guestName: 'Aisha Khalil', guestInitials: 'AK', status: 'pending', source: 'vrbo', amount: '€2,850' },
    { id: 'r5', listingId: 'l4', start: 8, length: 14, guestName: 'Linh Nguyen', guestInitials: 'LN', status: 'confirmed', source: 'airbnb', amount: '€2,240' },
    { id: 'r6', listingId: 'l5', start: 2, length: 5, guestName: 'Yumi Kawasaki', guestInitials: 'YK', status: 'confirmed', source: 'booking', amount: '€1,250' },
  ];

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Calendrier']}>
      <PageHeader title="Calendrier" count="Mai 2026">
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>← Avril</Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>Juin →</Button>
        <ViewToggle
          options={[
            {value:'simple', label:'Vue simple'},
            {value:'gantt', label:'Vue Gantt'}
          ]}
          value={viewMode}
          onChange={(val: string) => setViewMode(val as 'simple' | 'gantt')}
        />
        <ViewToggle
          options={[{value:'21j', label:'21 jours'}, {value:'mois', label:'Mois'}, {value:'sem', label:'Semaine'}]}
          value="21j"
        />
      </PageHeader>

      {viewMode === 'simple' ? (
        <CalendarGantt days={21} properties={properties} bookings={bookings} todayIdx={4} />
      ) : (
        <ReservationsGanttView
          startDate={new Date()}
          days={30}
          listings={listings}
          bookings={reservationBlocks}
          onBlockClick={(block) => alert(`Réservation ${block.guestName} - ${block.amount}`)}
        />
      )}
    </DashboardWrapper>
  );
}
