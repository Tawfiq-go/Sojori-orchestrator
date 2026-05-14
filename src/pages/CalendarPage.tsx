import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, CalendarGantt, ViewToggle,
  btnGhostSx, btnSmSx,
} from '../components/dashboard/DashboardV2.components';
import { Button } from '@mui/material';

export function CalendarPage() {
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

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Calendrier']}>
      <PageHeader title="Calendrier" count="Mai 2026">
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>← Avril</Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>Juin →</Button>
        <ViewToggle
          options={[{value:'21j', label:'21 jours'}, {value:'mois', label:'Mois'}, {value:'sem', label:'Semaine'}]}
          value="21j"
        />
      </PageHeader>

      <CalendarGantt days={21} properties={properties} bookings={bookings} todayIdx={4} />
    </DashboardWrapper>
  );
}
