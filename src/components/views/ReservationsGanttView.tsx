// ════════════════════════════════════════════════════════════════════
// Sojori — ReservationsGanttView
// Timeline horizontale jours · 1 ligne / listing · blocs réservations
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, IconButton, Tooltip,
} from '@mui/material';
import { ReservationDetailsModal, type ReservationDetails } from '../modals/ReservationDetailsModal';

const T = {
  primary: '#e6b022', primarySoft: '#f4cf5e', primaryTint: 'rgba(230,176,34,0.10)',
  success: '#10b981', successTint: 'rgba(16,185,129,0.15)',
  warning: '#f59e0b', warningTint: 'rgba(245,158,11,0.15)',
  error: '#ef4444', errorTint: 'rgba(239,68,68,0.15)',
  info: '#06b6d4', infoTint: 'rgba(6,182,212,0.15)',
  text: '#1a1408', text2: '#4a4234', text3: '#8a8170', text4: '#b8b09b',
  bg1: '#fff', bg2: '#f5f3ec', bg3: '#ebe7da', border: 'rgba(26,20,8,0.08)',
};

type Status = 'confirmed' | 'pending' | 'closed' | 'cancelled';

export interface Listing {
  id: string;
  name: string;
  city: string;
}

export interface ReservationBlock {
  id: string;
  listingId: string;
  start: number; // day offset from view start
  length: number;
  guestName: string;
  guestInitials: string;
  status: Status;
  source: 'airbnb' | 'booking' | 'vrbo' | 'direct';
  amount: string;
}

const MOCK_LISTINGS: Listing[] = [
  { id: 'l1', name: 'Villa Belvédère', city: 'Nice' },
  { id: 'l2', name: 'Dar Sojori',       city: 'Marrakech' },
  { id: 'l3', name: 'Villa Atlas',      city: 'Marrakech' },
  { id: 'l4', name: 'Atlas Loft',       city: 'Marrakech' },
  { id: 'l5', name: 'Médina House',     city: 'Marrakech' },
];

const MOCK_BOOKINGS: ReservationBlock[] = [
  { id: 'r1', listingId: 'l1', start: 1,  length: 7,  guestName: 'Sarah Johnson', guestInitials: 'SJ', status: 'confirmed', source: 'airbnb',  amount: '€1,848' },
  { id: 'r2', listingId: 'l1', start: 12, length: 5,  guestName: 'James Park',    guestInitials: 'JP', status: 'pending',   source: 'booking', amount: '€820' },
  { id: 'r3', listingId: 'l2', start: 4,  length: 3,  guestName: 'Marco Rossi',   guestInitials: 'MR', status: 'confirmed', source: 'direct',  amount: '€720' },
  { id: 'r4', listingId: 'l3', start: 2,  length: 14, guestName: 'Linh Nguyen',   guestInitials: 'LN', status: 'confirmed', source: 'airbnb',  amount: '€3,200' },
  { id: 'r5', listingId: 'l4', start: 8,  length: 4,  guestName: 'Aisha Khalil',  guestInitials: 'AK', status: 'confirmed', source: 'vrbo',    amount: '€640' },
  { id: 'r6', listingId: 'l5', start: 0,  length: 2,  guestName: 'Bloqué',        guestInitials: '🔒', status: 'closed',    source: 'direct',  amount: '—' },
  { id: 'r7', listingId: 'l5', start: 16, length: 6,  guestName: 'Yumi K.',       guestInitials: 'YK', status: 'pending',   source: 'booking', amount: '€960' },
];

const STATUS_META: Record<Status, { bg: string; color: string; label: string }> = {
  confirmed: { bg: T.successTint, color: T.success, label: 'Confirmé' },
  pending:   { bg: T.warningTint, color: T.warning, label: 'En attente' },
  closed:    { bg: T.bg3,         color: T.text3,   label: 'Bloqué' },
  cancelled: { bg: T.errorTint,   color: T.error,   label: 'Annulé' },
};

const SOURCE_BG: Record<ReservationBlock['source'], string> = {
  airbnb: '#FF5A5F', booking: '#003580', vrbo: '#0E64A4', direct: T.success,
};

interface Props {
  startDate?: Date;
  days?: number;
  listings?: Listing[];
  bookings?: ReservationBlock[];
  onBlockClick?: (b: ReservationBlock) => void;
}

export default function ReservationsGanttView({
  startDate = new Date(), days = 30,
  listings = MOCK_LISTINGS, bookings = MOCK_BOOKINGS,
  onBlockClick,
}: Props) {
  const [zoom, setZoom] = useState<'week' | 'month'>('month');
  const [offset, setOffset] = useState(0);
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cellWidth = zoom === 'week' ? 96 : 56;

  // Convert ReservationBlock to ReservationDetails for the modal
  const convertToReservationDetails = (block: ReservationBlock): ReservationDetails => {
    const listing = listings.find(l => l.id === block.listingId);
    const checkInDate = new Date(startDate);
    checkInDate.setDate(checkInDate.getDate() + block.start + offset);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + block.length);

    return {
      id: block.id,
      status: block.status === 'closed' ? 'cancelled' : block.status,
      channel: block.source,
      guestName: block.guestName,
      guestEmail: undefined,
      guestPhone: undefined,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      nights: block.length,
      travelers: 2, // Default value
      property: {
        id: listing?.id || '',
        name: listing?.name || 'Listing non trouvé',
        address: listing?.city || '',
      },
      totalAmount: parseFloat(block.amount.replace(/[€,\s]/g, '')) || 0,
      paidAmount: 0, // Default value
      notes: undefined,
      createdAt: new Date().toISOString(),
    };
  };

  const handleBlockClick = (block: ReservationBlock) => {
    setSelectedReservation(convertToReservationDetails(block));
    setModalOpen(true);
    onBlockClick?.(block);
  };
  const headers = useMemo(() => {
    const out: { date: Date; weekend: boolean; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + offset);
      const wd = (d.getDay() + 6) % 7;
      out.push({
        date: d,
        weekend: wd >= 5,
        isToday: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate(),
      });
    }
    return out;
  }, [startDate, days, offset]);

  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden', maxHeight: 'calc(100vh - 250px)' }}>
      {/* Toolbar */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center',  px: 2, py: 1.5, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton size="small" onClick={() => setOffset(offset - days)}>‹</IconButton>
          <Button size="small" onClick={() => setOffset(0)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Aujourd'hui
          </Button>
          <IconButton size="small" onClick={() => setOffset(offset + days)}>›</IconButton>
        </Stack>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            {headers[0]?.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {headers[headers.length - 1]?.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 0.25 }}>
          <Button size="small" onClick={() => setZoom('week')} sx={{ minWidth: 0, px: 1, textTransform: 'none', bgcolor: zoom === 'week' ? T.bg2 : 'transparent', color: T.text2 }}>
            Sem.
          </Button>
          <Button size="small" onClick={() => setZoom('month')} sx={{ minWidth: 0, px: 1, textTransform: 'none', bgcolor: zoom === 'month' ? T.bg2 : 'transparent', color: T.text2 }}>
            Mois
          </Button>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          {(['confirmed', 'pending', 'closed'] as Status[]).map(s => (
            <Stack key={s} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: STATUS_META[s].bg, border: `1px solid ${STATUS_META[s].color}` }} />
              <Typography sx={{ fontSize: 11, color: T.text3 }}>{STATUS_META[s].label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      {/* Grid */}
      <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `220px repeat(${days}, ${cellWidth}px)`, minWidth: 'max-content' }}>
          {/* Header */}
          <Box sx={{ position: 'sticky', left: 0, bgcolor: T.bg2, borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, zIndex: 5, p: 1.5,
            fontSize: 10.5, fontFamily: 'Geist Mono', fontWeight: 700, color: T.text3, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Listing
          </Box>
          {headers.map((h, i) => (
            <Box key={i} sx={{
              borderLeft: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
              p: '6px 0', textAlign: 'center', fontFamily: 'Geist Mono',
              bgcolor: h.isToday ? T.primaryTint : h.weekend ? 'rgba(0,0,0,0.02)' : T.bg2,
            }}>
              <Box sx={{ fontSize: 9, color: T.text3 }}>{['L','M','M','J','V','S','D'][(h.date.getDay() + 6) % 7]}</Box>
              <Box sx={{ fontSize: 12, fontWeight: 700, color: h.isToday ? '#b8881a' : T.text }}>{h.date.getDate()}</Box>
            </Box>
          ))}

          {/* Rows */}
          {listings.map(l => (
            <React.Fragment key={l.id}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', 
                position: 'sticky', left: 0, bgcolor: T.bg1,
                borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
                zIndex: 4, p: 1.5,
              }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1, background: 'linear-gradient(135deg,#fde68a,#d97706)', flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>{l.name}</Typography>
                  <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.25, fontFamily: 'Geist Mono' }}>{l.city.toUpperCase()}</Typography>
                </Box>
              </Stack>
              {Array.from({ length: days }).map((_, i) => (
                <Box key={i} sx={{
                  borderLeft: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
                  minHeight: 56, position: 'relative',
                  bgcolor: headers[i].isToday ? 'rgba(230,176,34,0.04)' : headers[i].weekend ? 'rgba(0,0,0,0.02)' : 'transparent',
                }} />
              ))}
              {/* Booking blocks overlay */}
              {bookings.filter(b => b.listingId === l.id).map(b => {
                const meta = STATUS_META[b.status];
                if (b.start < -1 || b.start >= days) return null;
                return (
                  <Tooltip key={b.id} title={
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{b.guestName}</Typography>
                      <Typography sx={{ fontSize: 11 }}>{meta.label} · {b.source} · {b.amount}</Typography>
                    </Box>
                  }>
                    <Box
                      onClick={() => onBlockClick?.(b)}
                      sx={{
                        position: 'absolute',
                        left: `calc(220px + ${b.start * cellWidth}px + 4px)`,
                        width: b.length * cellWidth - 8,
                        top: `calc(${listings.findIndex((l) => l.id === b.listingId)} * 56px + 8px)`,
                        // ... simplified, use marginTop trick below instead
                      }}
                    />
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
        {/* Booking blocks absolute layer */}
        <Box sx={{ position: 'relative', mt: -listings.length * 56 - listings.length, pointerEvents: 'none' }}>
          {bookings.map(b => {
            const rowIdx = listings.findIndex(l => l.id === b.listingId);
            if (rowIdx < 0 || b.start >= days || b.start + b.length < 0) return null;
            const meta = STATUS_META[b.status];
            const startVisible = Math.max(0, b.start);
            const endVisible = Math.min(days, b.start + b.length);
            const width = (endVisible - startVisible) * cellWidth - 8;
            return (
              <Tooltip key={b.id} title={`${b.guestName} · ${meta.label} · ${b.amount}`}>
                <Box
                  onClick={() => handleBlockClick(b)}
                  sx={{
                    position: 'absolute',
                    left: 220 + startVisible * cellWidth + 4,
                    top: rowIdx * 56 + 56 + 8,
                    width,
                    height: 40,
                    bgcolor: meta.bg,
                    border: `1px solid ${meta.color}`,
                    borderRadius: 1,
                    px: 1.5, py: 0.75,
                    cursor: 'pointer', pointerEvents: 'auto',
                    transition: 'all 0.15s',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 4px 12px ${meta.color}40` },
                  }}
                >
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Box sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: SOURCE_BG[b.source], color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{b.guestInitials}</Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: meta.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.guestName}
                    </Typography>
                    <Typography sx={{ ml: 'auto', fontSize: 10, color: meta.color, fontFamily: 'Geist Mono', fontWeight: 600 }}>
                      {b.amount}
                    </Typography>
                  </Stack>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Reservation Details Modal */}
      {selectedReservation && (
        <ReservationDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          reservation={selectedReservation}
        />
      )}
    </Box>
  );
}
