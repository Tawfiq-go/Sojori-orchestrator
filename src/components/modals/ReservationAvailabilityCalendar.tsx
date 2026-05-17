import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import calendarService from '../../services/calendarService';
import {
  buildAvailabilityMonthCells,
  buildAvailabilityMonthCellsFromInventory,
  datesInRange,
  isDateSelectableForCheckIn,
  isStayRangeValid,
  pickInventoryDaysForListing,
  STATUS_COLORS,
  toLocalDateKey,
  type AvailabilityDayCell,
  type DayStatus,
} from '../../utils/calendarAvailability';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export interface ReservationAvailabilityCalendarProps {
  listingId: string;
  roomTypeId?: string;
  checkInDate: string;
  checkOutDate: string;
  onDatesChange: (checkIn: string, checkOut: string) => void;
  onCalendarPriceHint?: (total: number, nights: number) => void;
}

export function ReservationAvailabilityCalendar({
  listingId,
  roomTypeId,
  checkInDate,
  checkOutDate,
  onDatesChange,
  onCalendarPriceHint,
}: ReservationAvailabilityCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [days, setDays] = useState<AvailabilityDayCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'inventory' | 'calendar' | 'none'>('none');
  const [pickPhase, setPickPhase] = useState<'checkIn' | 'checkOut'>('checkIn');

  useEffect(() => {
    if (!listingId) {
      setDays(buildAvailabilityMonthCellsFromInventory([], year, month));
      setDataSource('none');
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const startDate = toLocalDateKey(year, month, 1);
      const endDate = toLocalDateKey(year, month, new Date(year, month + 1, 0).getDate());

      try {
        let cells: AvailabilityDayCell[] = [];

        try {
          const inventory = await calendarService.getInventoryForListings(
            [listingId],
            startDate,
            endDate,
            true,
          );
          const inventoryDays = pickInventoryDaysForListing(inventory, listingId, roomTypeId);
          if (inventoryDays.length > 0) {
            cells = buildAvailabilityMonthCellsFromInventory(inventoryDays, year, month);
            if (!cancelled) setDataSource('inventory');
          }
        } catch (invErr) {
          console.warn('[ReservationAvailabilityCalendar] inventory failed, fallback calendar', invErr);
        }

        if (cells.filter(c => c.inMonth && c.hasInventoryData).length === 0) {
          try {
            const legacy = await calendarService.getMonthCalendar({
              listingId,
              startDate,
              endDate,
            });
            cells = buildAvailabilityMonthCells(legacy, year, month);
            if (!cancelled) setDataSource('calendar');
          } catch {
            cells = buildAvailabilityMonthCellsFromInventory([], year, month);
            if (!cancelled) setDataSource('none');
          }
        }

        if (!cancelled) {
          setDays(cells);
          const loaded = cells.filter(c => c.inMonth && c.hasInventoryData).length;
          if (loaded === 0) {
            const prevStart = toLocalDateKey(year - 1, month, 1);
            const prevEnd = toLocalDateKey(year - 1, month, new Date(year - 1, month + 1, 0).getDate());
            try {
              const prevInv = await calendarService.getInventoryForListings(
                [listingId],
                prevStart,
                prevEnd,
                true,
              );
              const prevDays = pickInventoryDaysForListing(prevInv, listingId, roomTypeId);
              if (prevDays.length > 0) {
                setYear(year - 1);
                setError(
                  `Pas d'inventaire pour ${MONTHS[month]} ${year} — affichage de ${MONTHS[month]} ${year - 1} (données disponibles).`,
                );
                return;
              }
            } catch {
              /* ignore */
            }
            setError(
              `Aucune donnée inventaire pour ${MONTHS[month]} ${year}. Essayez ‹ › ou vérifiez que l'inventaire est généré (page Calendrier).`,
            );
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('[ReservationAvailabilityCalendar]', err);
        if (!cancelled) {
          setError('Impossible de charger le calendrier');
          setDays(buildAvailabilityMonthCellsFromInventory([], year, month));
          setDataSource('none');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [listingId, roomTypeId, year, month]);

  const rangeDates = useMemo(() => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return new Set<string>();
    return new Set(datesInRange(checkInDate, checkOutDate));
  }, [checkInDate, checkOutDate]);

  const monthStats = useMemo(() => {
    const inMonth = days.filter(d => d.inMonth && d.hasInventoryData);
    return {
      loaded: inMonth.length,
      available: inMonth.filter(d => d.status === 'available').length,
      booked: inMonth.filter(d => d.status === 'booked').length,
    };
  }, [days]);

  useEffect(() => {
    if (!onCalendarPriceHint || !checkInDate || !checkOutDate || checkOutDate <= checkInDate) return;
    const byDate = new Map(days.filter(d => d.inMonth).map(d => [d.date, d]));
    let total = 0;
    for (const d of rangeDates) {
      total += byDate.get(d)?.price ?? 0;
    }
    onCalendarPriceHint(total, rangeDates.size);
  }, [checkInDate, checkOutDate, days, rangeDates, onCalendarPriceHint]);

  const navMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const handleDayClick = (cell: AvailabilityDayCell) => {
    if (!cell.inMonth || !listingId) return;

    if (pickPhase === 'checkIn') {
      if (!isDateSelectableForCheckIn(cell)) return;
      onDatesChange(cell.date, '');
      setPickPhase('checkOut');
      return;
    }

    if (cell.date <= checkInDate) {
      if (!isDateSelectableForCheckIn(cell)) return;
      onDatesChange(cell.date, '');
      setPickPhase('checkOut');
      return;
    }

    const proposedCheckOut = cell.date;
    if (!isStayRangeValid(checkInDate, proposedCheckOut, days)) return;
    onDatesChange(checkInDate, proposedCheckOut);
    setPickPhase('checkIn');
  };

  if (!listingId) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 1.5,
          border: `1px dashed ${t.border}`,
          bgcolor: t.bg2,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: t.text3 }}>
          Sélectionnez d&apos;abord une propriété pour afficher les disponibilités.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: 11.5, color: t.text3, fontFamily: '"Geist Mono", monospace' }}>
            {pickPhase === 'checkIn' ? '① Jour libre = arrivée' : '② Jour de départ'}
          </Typography>
          {monthStats.loaded > 0 && (
            <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.25 }}>
              {monthStats.available} libres · {monthStats.booked} réservés
              {dataSource === 'inventory' ? ' · inventaire' : dataSource === 'calendar' ? ' · calendrier' : ''}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: t.bg1,
            border: `1px solid ${t.border}`,
            borderRadius: 1,
            p: 0.25,
            flexShrink: 0,
          }}
        >
          <IconButton size="small" onClick={() => navMonth(-1)} sx={{ width: 28, height: 28 }}>
            ‹
          </IconButton>
          <Typography sx={{ px: 1.25, fontSize: 12.5, fontWeight: 700, minWidth: 110, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </Typography>
          <IconButton size="small" onClick={() => navMonth(1)} sx={{ width: 28, height: 28 }}>
            ›
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {WEEKDAYS.map(w => (
          <Typography
            key={w}
            sx={{
              fontSize: 9.5,
              fontWeight: 700,
              color: t.text3,
              textAlign: 'center',
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase',
            }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      <Box sx={{ position: 'relative', minHeight: 220 }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.75)',
              zIndex: 2,
              borderRadius: 1,
            }}
          >
            <CircularProgress size={28} sx={{ color: t.primary }} />
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {days.map((cell, idx) => (
            <DayCellButton
              key={`${cell.date}-${idx}`}
              cell={cell}
              isCheckIn={checkInDate === cell.date}
              isCheckOut={checkOutDate === cell.date}
              inRange={rangeDates.has(cell.date)}
              onClick={() => handleDayClick(cell)}
            />
          ))}
        </Box>
      </Box>

      {error && (
        <Typography sx={{ fontSize: 11, color: t.warning, mt: 1 }}>{error}</Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 1.5 }}>
        {(Object.keys(STATUS_COLORS) as DayStatus[]).map(status => (
          <Box
            key={status}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 10,
              color: STATUS_COLORS[status].text,
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            <span>{STATUS_COLORS[status].emoji}</span>
            {STATUS_COLORS[status].label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function DayCellButton({
  cell,
  isCheckIn,
  isCheckOut,
  inRange,
  onClick,
}: {
  cell: AvailabilityDayCell;
  isCheckIn: boolean;
  isCheckOut: boolean;
  inRange: boolean;
  onClick: () => void;
}) {
  const sty = STATUS_COLORS[cell.status];
  const selectable = cell.inMonth && (cell.status === 'available' || isCheckIn || isCheckOut);
  const showPrice = cell.inMonth && cell.hasInventoryData && cell.price > 0;

  return (
    <Box
      component="button"
      type="button"
      disabled={!cell.inMonth || (!selectable && !isCheckIn && !isCheckOut)}
      onClick={onClick}
      title={
        cell.inMonth
          ? `${cell.date} · ${sty.label}${showPrice ? ` · ${Math.round(cell.price)}€` : ''}`
          : undefined
      }
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        minHeight: 48,
        p: 0.375,
        borderRadius: 1,
        border: '1px solid',
        borderColor: isCheckIn || isCheckOut ? t.primaryDeep : inRange ? t.primary : sty.border,
        bgcolor: !cell.inMonth
          ? 'transparent'
          : inRange
            ? t.primaryTint
            : sty.bg,
        opacity: cell.inMonth ? 1 : 0.15,
        cursor: selectable ? 'pointer' : cell.inMonth ? 'not-allowed' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.125,
        outline: isCheckIn || isCheckOut ? `2px solid ${t.primary}` : 'none',
        outlineOffset: -1,
        ...(cell.isToday && {
          boxShadow: `inset 0 0 0 1px ${t.primary}`,
        }),
        '&:hover': selectable
          ? { filter: 'brightness(0.97)', transform: 'translateY(-1px)' }
          : {},
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: cell.isToday ? 800 : 600,
          color: cell.inMonth ? sty.text : t.text3,
          fontFamily: '"Geist Mono", monospace',
          lineHeight: 1.1,
        }}
      >
        {cell.inMonth ? cell.day : ''}
      </Typography>

      {showPrice && (
        <Typography
          sx={{
            fontSize: 7.5,
            lineHeight: 1,
            color: t.text3,
            opacity: 0.85,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 500,
            letterSpacing: '-0.02em',
          }}
        >
          {Math.round(cell.price)}€
        </Typography>
      )}

      {cell.inMonth && !showPrice && cell.hasInventoryData && (
        <Typography sx={{ fontSize: 7, color: t.text3, opacity: 0.5, lineHeight: 1 }}>—</Typography>
      )}

      {cell.inMonth && cell.status === 'booked' && cell.bookedBy && (
        <Typography
          sx={{
            fontSize: 7,
            color: sty.text,
            fontWeight: 700,
            lineHeight: 1,
            opacity: 0.9,
          }}
        >
          {cell.bookedBy.initials}
        </Typography>
      )}
    </Box>
  );
}
