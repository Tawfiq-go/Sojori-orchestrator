// ════════════════════════════════════════════════════════════════════
// Sojori — ChannelsDashboard
// 5 tabs: Summary / Business / Debug / Cron / Mapping
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  Box, Stack, Typography, Tabs, Tab, Card, Chip, Button, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';

const T = {
  primary: '#e6b022', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#06b6d4',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170',
  bg1: '#fff', bg2: '#f5f3ec', border: 'rgba(26,20,8,0.08)',
};

const CHANNELS = [
  { id: 'airbnb', name: 'Airbnb',  color: '#FF5A5F', logo: 'A' },
  { id: 'booking', name: 'Booking', color: '#003580', logo: 'B' },
  { id: 'vrbo', name: 'Vrbo',    color: '#0E64A4', logo: 'V' },
  { id: 'direct', name: 'Direct', color: T.success, logo: 'D' },
];

export default function ChannelsDashboard() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}>
        <Tab label="📊 Summary" />
        <Tab label="💼 Business" />
        <Tab label="🐛 Debug" />
        <Tab label="⏰ Cron" />
        <Tab label="🔗 Mapping" />
      </Tabs>
      <Box sx={{ p: 3 }}>
        {tab === 0 && <SummaryTab />}
        {tab === 1 && <BusinessTab />}
        {tab === 2 && <DebugTab />}
        {tab === 3 && <CronTab />}
        {tab === 4 && <MappingTab />}
      </Box>
    </Box>
  );
}

function SummaryTab() {
  const stats = [
    { label: 'Webhooks aujourd\'hui', value: 1847, trend: '+12%', color: T.success },
    { label: 'Réservations sync',     value: 234,  trend: '+5%',  color: T.primary },
    { label: 'Erreurs API',           value: 3,    trend: '-67%', color: T.error },
    { label: 'Latency moy.',          value: '124ms', trend: '-15ms', color: T.info },
  ];
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {stats.map(s => (
          <Card key={s.label} variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'Geist Mono', mt: 0.5 }}>{s.value}</Typography>
            <Chip size="small" label={s.trend} sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: `${s.color}20`, color: s.color, fontWeight: 700 }} />
          </Card>
        ))}
      </Box>
      <Card variant="outlined" sx={{ p: 0 }}>
        <Typography sx={{ p: 2, fontWeight: 700, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>Activité Webhooks · 7 derniers jours</Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: T.bg2 }}>
              <TableCell sx={cellHeadSx}>Date</TableCell>
              <TableCell sx={cellHeadSx}>Type</TableCell>
              <TableCell sx={cellHeadSx} align="right">Aujourd'hui</TableCell>
              <TableCell sx={cellHeadSx} align="right">OK</TableCell>
              <TableCell sx={cellHeadSx} align="right">Erreurs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { d: 'Aujourd\'hui',     t: 'booking.created',  today: 47,  ok: 47, err: 0 },
              { d: 'Aujourd\'hui',     t: 'booking.updated',  today: 23,  ok: 22, err: 1 },
              { d: 'Aujourd\'hui',     t: 'message.received', today: 156, ok: 156, err: 0 },
              { d: 'Hier',             t: 'booking.created',  today: 39,  ok: 39, err: 0 },
              { d: 'Hier',             t: 'message.received', today: 142, ok: 140, err: 2 },
            ].map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.d}</TableCell>
                <TableCell sx={{ fontFamily: 'Geist Mono', fontSize: 11.5 }}>{r.t}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono' }}>{r.today}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono', color: T.success, fontWeight: 700 }}>{r.ok}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono', color: r.err > 0 ? T.error : T.text3, fontWeight: 700 }}>{r.err}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}

function BusinessTab() {
  const [sub, setSub] = useState(0);
  return (
    <Stack spacing={2}>
      <Tabs value={sub} onChange={(_, v) => setSub(v)} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 12 }, minHeight: 36 }}>
        <Tab label="💬 Messages" />
        <Tab label="🎫 Réservations" />
        <Tab label="📅 Calendrier" />
      </Tabs>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
          {sub === 0 ? 'Messages entrants & sortants par canal' : sub === 1 ? 'Volume réservations par canal' : 'Sync calendrier (push/pull)'}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: T.bg2 }}>
              <TableCell sx={cellHeadSx}>Canal</TableCell>
              <TableCell sx={cellHeadSx} align="right">In</TableCell>
              <TableCell sx={cellHeadSx} align="right">Out</TableCell>
              <TableCell sx={cellHeadSx} align="right">Latency</TableCell>
              <TableCell sx={cellHeadSx} align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CHANNELS.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 22, height: 22, borderRadius: 0.75, bgcolor: c.color, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.logo}</Box>
                    <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono' }}>{Math.floor(Math.random() * 200)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono' }}>{Math.floor(Math.random() * 200)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Geist Mono', color: T.text3 }}>{Math.floor(80 + Math.random() * 200)}ms</TableCell>
                <TableCell align="right">
                  <Chip size="small" label="● OK" sx={{ bgcolor: `${T.success}20`, color: T.success, fontWeight: 700, fontSize: 10 }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}

function DebugTab() {
  return (
    <Card variant="outlined" sx={{ p: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}` }}>
        <Typography sx={{ fontWeight: 700 }}>Logs récents</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>🔄 Refresh</Button>
          <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>📥 Export</Button>
        </Stack>
      </Stack>
      <Box sx={{ p: 2, fontFamily: 'Geist Mono', fontSize: 12, color: T.text2, bgcolor: '#0f1416', maxHeight: 400, overflowY: 'auto' }}>
        <Box sx={{ color: '#8e9aaa' }}>[2026-05-14T09:42:13Z]</Box>
        <Box sx={{ color: T.success }}>✓ airbnb.webhook.received · booking_id=ABCD123 · listing_id=42</Box>
        <Box sx={{ color: '#8e9aaa' }}>[2026-05-14T09:42:14Z]</Box>
        <Box sx={{ color: T.info }}>→ sojori.orchestrator.trigger · workflow=Villa_LongSejour · 23 tasks created</Box>
        <Box sx={{ color: '#8e9aaa' }}>[2026-05-14T09:42:15Z]</Box>
        <Box sx={{ color: T.success }}>✓ message.sent · template=welcome-villa · channel=whatsapp · to=+33612...</Box>
        <Box sx={{ color: '#8e9aaa' }}>[2026-05-14T09:48:02Z]</Box>
        <Box sx={{ color: T.error }}>✕ booking.update failed · reservation_id=XYZ789 · err=PROPERTY_MISMATCH · retry=2/3</Box>
        <Box sx={{ color: '#8e9aaa' }}>[2026-05-14T09:48:05Z]</Box>
        <Box sx={{ color: T.warning }}>⚠ rate_limit · channel=booking · remaining=5/60req · wait=12s</Box>
      </Box>
    </Card>
  );
}

function CronTab() {
  return (
    <Card variant="outlined" sx={{ p: 0 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: T.bg2 }}>
            <TableCell sx={cellHeadSx}>Job</TableCell>
            <TableCell sx={cellHeadSx}>Schedule</TableCell>
            <TableCell sx={cellHeadSx}>Dernière exec.</TableCell>
            <TableCell sx={cellHeadSx}>Prochaine</TableCell>
            <TableCell sx={cellHeadSx} align="right">Status</TableCell>
            <TableCell sx={cellHeadSx} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[
            { job: 'sync.airbnb.calendar',  cron: '*/15 * * * *', last: '2 min',  next: '13 min', status: 'ok' },
            { job: 'sync.booking.calendar', cron: '*/30 * * * *', last: '12 min', next: '18 min', status: 'ok' },
            { job: 'cleanup.old_messages',  cron: '0 3 * * *',    last: '6h',     next: '18h',    status: 'ok' },
            { job: 'reports.daily',         cron: '0 8 * * *',    last: '1h',     next: '23h',    status: 'failed' },
          ].map(j => (
            <TableRow key={j.job}>
              <TableCell sx={{ fontFamily: 'Geist Mono', fontWeight: 700 }}>{j.job}</TableCell>
              <TableCell sx={{ fontFamily: 'Geist Mono', fontSize: 11.5, color: T.text3 }}>{j.cron}</TableCell>
              <TableCell sx={{ fontSize: 11.5, color: T.text3 }}>{j.last}</TableCell>
              <TableCell sx={{ fontSize: 11.5, color: T.text2, fontWeight: 600 }}>{j.next}</TableCell>
              <TableCell align="right">
                <Chip size="small" label={j.status === 'ok' ? '● OK' : '✕ Failed'}
                  sx={{ bgcolor: j.status === 'ok' ? `${T.success}20` : `${T.error}20`, color: j.status === 'ok' ? T.success : T.error, fontWeight: 700, fontSize: 10 }} />
              </TableCell>
              <TableCell align="right">
                <Button size="small" sx={{ textTransform: 'none' }}>▶ Run now</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MappingTab() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 700 }}>Mapping Rate Units (Booking ↔ Sojori)</Typography>
        <Button variant="contained" size="small" sx={{ textTransform: 'none', bgcolor: T.primary, color: T.text, '&:hover': { bgcolor: T.primary } }}>
          + Ajouter mapping
        </Button>
      </Stack>
      <Card variant="outlined" sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: T.bg2 }}>
              <TableCell sx={cellHeadSx}>Listing Sojori</TableCell>
              <TableCell sx={cellHeadSx}>Booking RU ID</TableCell>
              <TableCell sx={cellHeadSx}>Airbnb Listing ID</TableCell>
              <TableCell sx={cellHeadSx}>Vrbo ID</TableCell>
              <TableCell sx={cellHeadSx} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { name: 'Villa Belvédère',  ru: '12345678', ab: '99887766', vr: 'VR-A21' },
              { name: 'Dar Sojori',       ru: '12345679', ab: '99887767', vr: '—' },
              { name: 'Villa Atlas',      ru: '12345680', ab: '—',        vr: 'VR-A24' },
              { name: 'Atlas Loft',       ru: '12345681', ab: '99887769', vr: '—' },
              { name: 'Médina House',     ru: '12345682', ab: '99887770', vr: 'VR-A28' },
            ].map(m => (
              <TableRow key={m.ru}>
                <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                <TableCell sx={{ fontFamily: 'Geist Mono' }}>{m.ru}</TableCell>
                <TableCell sx={{ fontFamily: 'Geist Mono' }}>{m.ab}</TableCell>
                <TableCell sx={{ fontFamily: 'Geist Mono' }}>{m.vr}</TableCell>
                <TableCell align="right">
                  <IconButton size="small">✏️</IconButton>
                  <IconButton size="small" color="error">🗑️</IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}

const cellHeadSx = {
  fontSize: 10.5, fontWeight: 700, color: T.text3,
  letterSpacing: 0.5, textTransform: 'uppercase' as const,
};
