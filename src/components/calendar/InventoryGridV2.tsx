// ════════════════════════════════════════════════════════════════════
// Sojori — Inventory Grid V2
// Grille d'inventaire calendrier avec collapse, colonnes dynamiques, vraies données
// Réplication simplifiée de sojori-dashboard/InventoryGrid.jsx
// ════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography, IconButton, Skeleton, Tooltip } from '@mui/material';
import type { ColumnId } from './ColumnFilters';
import { ReservationDayPopover } from './ReservationDayPopover';

// Tokens Atelier 2026 (gold/beige design system)
const COLORS = {
  // Primaire (gold)
  primary: '#b8851a',
  primaryLight: 'rgba(184,133,26,0.10)',
  primarySoft: '#e6c46a',
  primaryDeep: '#876119',

  // Sémantiques
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
  info: '#0673b3',

  // Backgrounds et texte
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',

  // Legacy gray mapping (pour compatibilité)
  gray: {
    50: '#fafaf7',   // bg2
    100: '#f0eee8',  // bg3
    200: 'rgba(20,17,10,0.07)', // border
    600: '#7a756c',  // text3
    900: '#14110a',  // text
  },
};

const COLUMN_WIDTH = 90; // Largeur de chaque cellule de jour

// Types
export interface InventoryDay {
  availableRoom: number;
  basePrice: number;
  calculatedPrice: number;
  manualPrice?: number;
  applyManual?: boolean;
  stopSell?: boolean;
  minStay?: number;
  maxStay?: number;
  closedArrival?: boolean;
  closedDeparture?: boolean;
  reservations?: any[];
  useDynamicPrice?: boolean;
  currency?: string;
}

export interface RoomTypeInventory {
  name: string;
  availability: Record<string, InventoryDay>; // dateStr -> InventoryDay
}

export interface InventoryData {
  [listingId: string]: {
    [roomTypeId: string]: RoomTypeInventory;
  };
}

export interface Listing {
  _id: string;
  id: string;
  name: string;
  propertyUnit?: string;
  roomTypes?: Array<{ id: string; name: string }>;
  currency?: string; // "MAD", "EUR", "USD", etc. (from listing.currencyCode)
}

interface InventoryGridV2Props {
  listings: Listing[];
  inventoryData: InventoryData;
  days: string[]; // Array of YYYY-MM-DD dates
  selectedColumns: ColumnId[];
  expandedListings: Record<string, boolean>;
  onToggleListing: (listingId: string) => void;
  onCellClick?: (listingId: string, roomTypeId: string, date: string, column: ColumnId) => void;
  inventoryLoading?: boolean;
  // Map listingId -> currency symbol (from parent, loaded via listingsService)
  listingCurrencies?: Record<string, string>;
  // Sélection Excel-like (comme Legacy)
  selectedCells?: Array<{ listingId: string; roomTypeId: string; dateStr: string; column: ColumnId }>;
  onSelectedCellsChange?: (cells: Array<{ listingId: string; roomTypeId: string; dateStr: string; column: ColumnId }>) => void;
  onOpenModal?: () => void;
}

// Fonction pour obtenir le prix affiché (logique exacte de l'ancien)
function priceOf(inv?: InventoryDay): number {
  if (!inv) return 0;

  if (inv.useDynamicPrice || inv.applyManual) {
    return inv.calculatedPrice ?? inv.basePrice ?? inv.manualPrice ?? 0;
  }

  if (inv.manualPrice !== undefined && inv.manualPrice !== null) {
    return inv.manualPrice;
  }

  return inv.basePrice ?? 0;
}

// Couleur de la cellule selon le status
function getCellColor(inv?: InventoryDay): string {
  if (!inv) return '#fff';

  // Stop sell = rouge clair
  if (inv.stopSell) return '#fee2e2';

  // Pas disponible = gris
  if (inv.availableRoom === 0) return '#f3f4f6';

  // A des réservations = bleu clair
  if (inv.reservations && inv.reservations.length > 0) return '#dbeafe';

  // Disponible = vert très clair
  return inv.availableRoom > 0 ? '#f0fdf4' : '#fff';
}

// Obtenir le label d'une colonne
function getColumnLabel(columnId: ColumnId): string {
  const labels: Record<ColumnId, string> = {
    availableRoom: 'Dispo',
    rate: 'Tarif',
    basePrice: 'Base',
    manualPrice: 'Manuel',
    dynamicPrice: 'Dynamique',
    stopSell: 'Stop',
    minStay: 'Min',
    maxStay: 'Max',
    closedArrival: 'Arr.',
    closedDeparture: 'Dép.',
    reservations: 'Rés.',
  };
  return labels[columnId] || columnId;
}

// Rendu d'une cellule selon la colonne
// ⚠️ currency doit venir du listing, pas de l'inventaire (API ne retourne pas ce champ)
function renderCellContent(inv: InventoryDay | undefined, columnId: ColumnId, currency: string): React.ReactNode {
  if (!inv) return '—';

  switch (columnId) {
    case 'availableRoom':
      return inv.availableRoom ?? 0;

    case 'rate': {
      const price = priceOf(inv);
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {price} {currency}
          </Typography>
          {inv.useDynamicPrice && (
            <Box sx={{ fontSize: 10, color: COLORS.primary }}>⚡</Box>
          )}
        </Box>
      );
    }

    case 'basePrice': {
      return inv.basePrice ? `${inv.basePrice} ${currency}` : '—';
    }

    case 'manualPrice': {
      return inv.manualPrice ? `${inv.manualPrice} ${currency}` : '—';
    }

    case 'dynamicPrice': {
      return inv.calculatedPrice ? `${inv.calculatedPrice} ${currency}` : '—';
    }

    case 'stopSell':
      return inv.stopSell ? '🚫' : '—';

    case 'minStay':
      return inv.minStay ? `${inv.minStay}n` : '—';

    case 'maxStay':
      return inv.maxStay ? `${inv.maxStay}n` : '—';

    case 'closedArrival':
      return inv.closedArrival ? '⛔' : '—';

    case 'closedDeparture':
      return inv.closedDeparture ? '⛔' : '—';

    case 'reservations':
      return inv.reservations?.length || 0;

    default:
      return '—';
  }
}

export function InventoryGridV2({
  listings,
  inventoryData,
  days,
  selectedColumns,
  expandedListings,
  onToggleListing,
  onCellClick,
  inventoryLoading = false,
  listingCurrencies = {},
  selectedCells = [],
  onSelectedCellsChange,
  onOpenModal,
}: InventoryGridV2Props) {

  // Refs pour scroll sync header ↔ body (comme Legacy)
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // États pour sélection Excel-like (EXACT copy Legacy lignes 146-148)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ listingId: string; roomTypeId: string; dateStr: string; column: ColumnId } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  // Popover pour jours avec plusieurs réservations (rotations)
  const [resaPopover, setResaPopover] = useState<{
    reservations: any[];
    dayStr: string;
    anchorRect: DOMRect;
  } | null>(null);

  // Retourne toutes les réservations qui "touchent" un jour donné (incluent arrivée et départ)
  const getResasForDay = useCallback((reservations: any[], dayStr: string) => {
    if (!reservations?.length) return [];
    return reservations.filter((res) => {
      const arr = res.arrivalDate ? new Date(res.arrivalDate) : null;
      const dep = res.departureDate ? new Date(res.departureDate) : null;
      const cur = new Date(dayStr + 'T00:00:00');
      if (!arr || !dep) return false;
      arr.setHours(0, 0, 0, 0);
      dep.setHours(0, 0, 0, 0);
      cur.setHours(0, 0, 0, 0);
      // couvre ce jour: arrivée ≤ jour ≤ départ (inclure le jour de départ pour les rotations)
      return cur >= arr && cur <= dep;
    });
  }, []);

  // Cell selection EXACTEMENT comme Excel (EXACT copy Legacy lignes 296-369)
  const handleCellMouseDown = useCallback((listingId: string, roomTypeId: string, dateStr: string, column: ColumnId) => {
    setIsDragging(true);
    setDragStart({ listingId, roomTypeId, dateStr, column });
    setHasMoved(false);
    // Sélectionner la première cellule immédiatement
    onSelectedCellsChange?.([{ listingId, roomTypeId, dateStr, column }]);
  }, [onSelectedCellsChange]);

  const handleMouseEnter = useCallback((listingId: string, roomTypeId: string, dateStr: string, column: ColumnId) => {
    if (!isDragging || !dragStart) return;
    setHasMoved(true);

    // Sélectionner la range SEULEMENT si on drag dans le même room type et même colonne
    if (dragStart.listingId === listingId && dragStart.roomTypeId === roomTypeId && dragStart.column === column) {
      const startIndex = days.findIndex(d => d === dragStart.dateStr);
      const endIndex = days.findIndex(d => d === dateStr);

      if (startIndex === -1 || endIndex === -1) return;

      const [start, end] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

      const newSelection = [];
      for (let i = start; i <= end; i++) {
        newSelection.push({
          listingId,
          roomTypeId,
          dateStr: days[i],
          column
        });
      }

      onSelectedCellsChange?.(newSelection);
    }
  }, [isDragging, dragStart, days, onSelectedCellsChange]);

  const handleMouseUp = useCallback(() => {
    const wasDragging = isDragging;
    const hasCells = selectedCells.length > 0;

    setIsDragging(false);
    setDragStart(null);
    setHasMoved(false);

    // Ouvrir le popup dans TOUS les cas où il y a des cellules sélectionnées
    if (wasDragging && hasCells) {
      onOpenModal?.();
    }
  }, [isDragging, selectedCells.length, onOpenModal]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, handleMouseUp]);

  // Handle Escape key to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCells.length > 0) {
        onSelectedCellsChange?.([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells.length, onSelectedCellsChange]);

  // Set O(1) pour vérifier si une cellule est sélectionnée (BN-F3 — évite O(n) par cellule)
  const selectedSet = useMemo(
    () => new Set(selectedCells.map(c => `${c.listingId}|${c.roomTypeId}|${c.dateStr}|${c.column}`)),
    [selectedCells]
  );

  const isCellSelected = useCallback(
    (listingId: string, roomTypeId: string, dateStr: string, column: ColumnId) =>
      selectedSet.has(`${listingId}|${roomTypeId}|${dateStr}|${column}`),
    [selectedSet]
  );

  // Format des jours pour l'affichage
  const formattedDays = days.map(dateStr => {
    const date = new Date(dateStr);
    const dayNum = date.getDate();
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    return {
      dateStr,
      label: `${dayName} ${dayNum}`,
      isToday,
    };
  });

  // Sync scroll horizontal header ↔ body (EXACT copy from Legacy InventoryGrid.jsx:175-190)
  useEffect(() => {
    const header = headerScrollRef.current;
    const body = bodyScrollRef.current;
    if (!header || !body) return;

    const syncFromBody = () => { header.scrollLeft = body.scrollLeft; };
    const syncFromHeader = () => { body.scrollLeft = header.scrollLeft; };

    body.addEventListener('scroll', syncFromBody, { passive: true });
    header.addEventListener('scroll', syncFromHeader, { passive: true });

    return () => {
      body.removeEventListener('scroll', syncFromBody);
      header.removeEventListener('scroll', syncFromHeader);
    };
  }, []);

  return (
    <Box sx={{
      border: '1px solid',
      borderColor: COLORS.border,
      borderRadius: 1.5, // 12px (Atelier 2026)
      overflow: 'hidden',
      bgcolor: COLORS.bg1,
    }}>
      {/* Header avec dates */}
      <Box sx={{
        display: 'flex',
        borderBottom: '1px solid',
        borderColor: COLORS.borderStrong,
        position: 'sticky',
        top: 0,
        bgcolor: COLORS.bg1,
        zIndex: 10,
      }}>
        {/* Colonne fixe gauche - Nom listing */}
        <Box sx={{
          minWidth: 200,
          maxWidth: 200,
          p: 1.5,
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: COLORS.text2,
          bgcolor: COLORS.bg2,
          borderRight: '1px solid',
          borderColor: COLORS.border,
          display: 'flex',
          alignItems: 'center',
        }}>
          Propriété
        </Box>


        {/* En-têtes des jours */}
        <Box ref={headerScrollRef} sx={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
          {formattedDays.map((day) => (
            <Box
              key={day.dateStr}
              sx={{
                minWidth: COLUMN_WIDTH,
                maxWidth: COLUMN_WIDTH,
                p: 1,
                textAlign: 'center',
                bgcolor: day.isToday ? COLORS.primaryLight : COLORS.bg2,
                borderRight: '1px solid',
                borderColor: COLORS.border,
              }}
            >
              <Typography sx={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: day.isToday ? COLORS.primary : COLORS.text2,
              }}>
                {day.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Body - Lignes des listings */}
      <Box ref={bodyScrollRef} sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', overflowX: 'auto' }}>
        {listings.map((listing) => {
          const isExpanded = expandedListings[listing._id] ?? true;
          const isSingleProperty = listing.propertyUnit === 'Single';
          const listingInv = inventoryData[listing._id] || {};
          // Récupérer la currency depuis listingCurrencies ou fallback "MAD" (comme Legacy)
          const currency = listingCurrencies[listing._id] || listing.currency || 'MAD';

          // Créer roomTypes à partir de inventoryData au lieu de listing.roomTypes
          const roomTypes = Object.keys(listingInv).map((roomTypeId) => ({
            id: roomTypeId,
            name: listingInv[roomTypeId].name,
          }));

          return (
            <Box key={listing._id}>
              {/* Ligne Rate TOP (TOUJOURS visible, SANS label, SANS tooltip) */}
              <Box
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid',
                  borderColor: COLORS.border,
                  '&:hover': { bgcolor: COLORS.bg2 },
                }}
              >
                {/* Nom listing + toggle */}
                <Box
                  sx={{
                    minWidth: 200,
                    maxWidth: 200,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderRight: '1px solid',
                    borderColor: COLORS.border,
                    bgcolor: COLORS.bg1,
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                  }}
                >
                  {/* Toggle visible seulement si colonnes sélectionnées (comme Legacy ligne 677-684) */}
                  {selectedColumns.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={() => onToggleListing(listing._id)}
                      sx={{ p: 0.5, color: COLORS.primary }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </IconButton>
                  )}
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                    {listing.name}
                    {!isSingleProperty && roomTypes.length > 1 && (
                      <Typography component="span" sx={{ fontSize: 11, color: COLORS.text2, ml: 0.5 }}>
                        ({roomTypes.length} rooms)
                      </Typography>
                    )}
                  </Typography>
                </Box>

                {/* Cellules Rate TOP - SANS HOVER, juste affichage (comme Legacy ligne 696) */}
                {formattedDays.map((day) => {
                  const firstRoom = isSingleProperty && roomTypes[0] ? roomTypes[0] : null;
                  const roomInv = firstRoom ? listingInv[firstRoom.id] : null;
                  const inv = roomInv?.availability?.[day.dateStr];

                  // Skeleton pendant chargement
                  if (inventoryLoading && !inv) {
                    return (
                      <Box
                        key={`${listing._id}-rate-top-${day.dateStr}`}
                        sx={{
                          minWidth: COLUMN_WIDTH,
                          maxWidth: COLUMN_WIDTH,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRight: '1px solid',
                          borderColor: COLORS.border,
                        }}
                      >
                        <Skeleton variant="rounded" width="60%" height={16} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }} />
                      </Box>
                    );
                  }

                  const price = priceOf(inv);

                  return (
                    <Box
                      key={`${listing._id}-rate-top-${day.dateStr}`}
                      onClick={() => {
                        if (firstRoom) {
                          onCellClick?.(listing._id, firstRoom.id, day.dateStr, 'rate');
                        }
                      }}
                      sx={{
                        minWidth: COLUMN_WIDTH,
                        maxWidth: COLUMN_WIDTH,
                        p: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 600,
                        color: COLORS.primaryDeep,
                        cursor: 'pointer',
                        bgcolor: getCellColor(inv),
                        borderRight: '1px solid',
                        borderColor: COLORS.border,
                        position: 'relative',
                        transition: 'background-color 0.1s',
                        '&:hover': {
                          bgcolor: COLORS.gray[100],
                        },
                      }}
                    >
                      {/* ⚡ Indicateur dynamic pricing */}
                      {inv?.useDynamicPrice && (
                        <Box sx={{
                          position: 'absolute',
                          top: 2,
                          right: 3,
                          fontSize: 8,
                          color: COLORS.primary,
                          opacity: 0.85,
                        }}>⚡</Box>
                      )}
                      {price} {currency}
                    </Box>
                  );
                })}
              </Box>

              {/* UNE LIGNE PAR COLONNE (comme Legacy) - seulement si expanded */}
              {isExpanded && selectedColumns.length > 0 && selectedColumns.map((colId) => {
                // Pour Single property, récupérer les données du premier room type
                const firstRoom = isSingleProperty && roomTypes[0] ? roomTypes[0] : null;
                const roomInv = firstRoom ? listingInv[firstRoom.id] : null;

                return (
                  <Box
                    key={`${listing._id}-${colId}`}
                    sx={{
                      display: 'flex',
                      borderBottom: '1px solid',
                      borderColor: COLORS.border,
                      '&:hover': { bgcolor: COLORS.bg2 },
                    }}
                  >
                    {/* Label de la colonne (sticky gauche) */}
                    <Box
                      sx={{
                        minWidth: 200,
                        maxWidth: 200,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        borderRight: '1px solid',
                        borderColor: COLORS.border,
                        bgcolor: COLORS.bg1,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: COLORS.gray[600], textAlign: 'right' }}>
                        {getColumnLabel(colId)}
                      </Typography>
                    </Box>

                    {/* Cellules pour chaque jour de cette colonne */}
                    {formattedDays.map((day) => {
                      const inv = roomInv?.availability?.[day.dateStr];

                      // Skeleton pendant le chargement
                      if (inventoryLoading && !inv) {
                        return (
                          <Box
                            key={`${listing._id}-${colId}-${day.dateStr}`}
                            sx={{
                              minWidth: COLUMN_WIDTH,
                              maxWidth: COLUMN_WIDTH,
                              p: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRight: '1px solid',
                              borderColor: COLORS.border,
                            }}
                          >
                            <Skeleton variant="rounded" width="60%" height={16} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }} />
                          </Box>
                        );
                      }

                      // Si colonne Rate, ajouter Tooltip breakdown (comme Legacy ligne 951-1093)
                      if (colId === 'rate' && firstRoom) {
                        const price = priceOf(inv);
                        const isSelected = isCellSelected(listing._id, firstRoom.id, day.dateStr, colId);

                        const cellContent = (
                          <Box
                            key={`${listing._id}-${colId}-${day.dateStr}`}
                            onMouseDown={() => handleCellMouseDown(listing._id, firstRoom.id, day.dateStr, colId)}
                            onMouseEnter={() => handleMouseEnter(listing._id, firstRoom.id, day.dateStr, colId)}
                            sx={{
                              minWidth: COLUMN_WIDTH,
                              maxWidth: COLUMN_WIDTH,
                              p: 0.5,
                              fontSize: 12,
                              fontWeight: 600,
                              textAlign: 'center',
                              cursor: isDragging ? 'crosshair' : 'pointer',
                              userSelect: 'none',
                              bgcolor: isSelected ? COLORS.primary + '40' : getCellColor(inv),
                              borderRight: '1px solid',
                              borderColor: COLORS.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              color: COLORS.primaryDeep,
                              transition: 'background-color 0.1s',
                              border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid ' + COLORS.border,
                              '&:hover': {
                                bgcolor: isSelected ? COLORS.primary + '40' : COLORS.gray[100],
                              },
                            }}
                          >
                            {/* ⚡ Indicateur dynamic pricing */}
                            {inv?.useDynamicPrice && (
                              <Box sx={{
                                position: 'absolute',
                                top: 2,
                                right: 3,
                                fontSize: 8,
                                color: COLORS.primary,
                                opacity: 0.85,
                              }}>⚡</Box>
                            )}
                            {price} {currency}
                          </Box>
                        );

                        // Tooltip breakdown (fallback simple comme Legacy lignes 962-1017)
                        return (
                          <Tooltip
                            key={`${listing._id}-${colId}-${day.dateStr}`}
                            title={
                              inv ? (
                                <Box sx={{ p: 1.5, minWidth: 200, maxWidth: 250 }}>
                                  {/* Header */}
                                  <Box sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: 11, color: 'white' }}>
                                      {day.dateStr} • {inv.availableRoom || 0} dispo
                                    </Typography>
                                  </Box>

                                  {/* Base Price */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, py: 0.3 }}>
                                    <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 700 }}>Base</Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                                      {inv.basePrice || 0} {currency}
                                    </Typography>
                                  </Box>

                                  {/* Dynamic Price */}
                                  {inv.useDynamicPrice && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, py: 0.3 }}>
                                      <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 700 }}>Dynamique</Typography>
                                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                                        {inv.calculatedPrice || 0} {currency}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* Manual Price */}
                                  {inv.manualPrice && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, py: 0.3 }}>
                                      <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 700 }}>Manuel</Typography>
                                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                                        {inv.manualPrice} {currency}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* Total */}
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Prix</Typography>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                                      {price} {currency}
                                    </Typography>
                                  </Box>
                                </Box>
                              ) : ''
                            }
                            arrow
                            placement="left"
                            PopperProps={{
                              sx: {
                                zIndex: 9999,
                                '& .MuiTooltip-tooltip': {
                                  backgroundColor: 'white',
                                  padding: 0,
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  maxWidth: 'none',
                                },
                                '& .MuiTooltip-arrow': {
                                  color: 'white',
                                  '&::before': {
                                    border: `2px solid ${COLORS.primary}`,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                  }
                                }
                              }
                            }}
                          >
                            {cellContent}
                          </Tooltip>
                        );
                      }

                      // Pour les autres colonnes, pas de Tooltip mais sélection Excel
                      if (!firstRoom) return null;

                      const isSelected = isCellSelected(listing._id, firstRoom.id, day.dateStr, colId);

                      return (
                        <Box
                          key={`${listing._id}-${colId}-${day.dateStr}`}
                          onMouseDown={() => handleCellMouseDown(listing._id, firstRoom.id, day.dateStr, colId)}
                          onMouseEnter={() => handleMouseEnter(listing._id, firstRoom.id, day.dateStr, colId)}
                          sx={{
                            minWidth: COLUMN_WIDTH,
                            maxWidth: COLUMN_WIDTH,
                            p: 0.5,
                            fontSize: 11,
                            textAlign: 'center',
                            cursor: isDragging ? 'crosshair' : 'pointer',
                            userSelect: 'none',
                            bgcolor: isSelected ? COLORS.primary + '40' : getCellColor(inv),
                            borderRight: '1px solid',
                            borderColor: COLORS.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.1s',
                            border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid ' + COLORS.border,
                            '&:hover': {
                              bgcolor: isSelected ? COLORS.primary + '40' : COLORS.primaryLight,
                            },
                          }}
                        >
                          {renderCellContent(inv, colId, currency)}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}

              {/* Sous-lignes des room types pour Multi property (si expanded) */}
              {isExpanded && !isSingleProperty && roomTypes.map((roomType) => {
                const roomInv = listingInv[roomType.id];

                // UNE LIGNE PAR COLONNE pour ce room type
                return selectedColumns.map((colId) => (
                  <Box
                    key={`${listing._id}-${roomType.id}-${colId}`}
                    sx={{
                      display: 'flex',
                      borderBottom: '1px solid',
                      borderColor: COLORS.border,
                      '&:hover': { bgcolor: COLORS.bg2 },
                    }}
                  >
                    {/* Nom room type + label colonne */}
                    <Box
                      sx={{
                        minWidth: 200,
                        maxWidth: 200,
                        p: 1.5,
                        pl: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderRight: '1px solid',
                        borderColor: COLORS.border,
                        bgcolor: COLORS.bg1,
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      <Typography sx={{ fontSize: 11, color: COLORS.gray[600] }}>
                        {roomType.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: COLORS.primary }}>
                        | {getColumnLabel(colId)}
                      </Typography>
                    </Box>

                    {/* Cellules pour chaque jour de cette colonne */}
                    {formattedDays.map((day) => {
                      const inv = roomInv?.availability?.[day.dateStr];

                      // Skeleton pendant le chargement
                      if (inventoryLoading && !inv) {
                        return (
                          <Box
                            key={`${listing._id}-${roomType.id}-${colId}-${day.dateStr}`}
                            sx={{
                              minWidth: COLUMN_WIDTH,
                              maxWidth: COLUMN_WIDTH,
                              p: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRight: '1px solid',
                              borderColor: COLORS.border,
                            }}
                          >
                            <Skeleton variant="rounded" width="60%" height={16} sx={{ bgcolor: 'rgba(0,0,0,0.04)' }} />
                          </Box>
                        );
                      }

                      const isSelected = isCellSelected(listing._id, roomType.id, day.dateStr, colId);

                      return (
                        <Box
                          key={`${listing._id}-${roomType.id}-${colId}-${day.dateStr}`}
                          onMouseDown={() => handleCellMouseDown(listing._id, roomType.id, day.dateStr, colId)}
                          onMouseEnter={() => handleMouseEnter(listing._id, roomType.id, day.dateStr, colId)}
                          sx={{
                            minWidth: COLUMN_WIDTH,
                            maxWidth: COLUMN_WIDTH,
                            p: 0.5,
                            fontSize: 11,
                            textAlign: 'center',
                            cursor: isDragging ? 'crosshair' : 'pointer',
                            userSelect: 'none',
                            bgcolor: isSelected ? COLORS.primary + '40' : getCellColor(inv),
                            borderRight: '1px solid',
                            borderColor: COLORS.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.1s',
                            border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid ' + COLORS.border,
                            '&:hover': {
                              bgcolor: isSelected ? COLORS.primary + '40' : COLORS.primaryLight,
                            },
                          }}
                        >
                          {renderCellContent(inv, colId, currency)}
                        </Box>
                      );
                    })}
                  </Box>
                ));
              })}

            </Box>
          );
        })}
      </Box>

      {/* Popover réservations (rotations) */}
      {resaPopover && (
        <ReservationDayPopover
          reservations={resaPopover.reservations}
          dayStr={resaPopover.dayStr}
          anchorRect={resaPopover.anchorRect}
          onClose={() => setResaPopover(null)}
          onResaClick={(res) => {
            console.log('Reservation clicked:', res);
            // TODO: Ouvrir modal détail réservation
          }}
        />
      )}
    </Box>
  );
}

export default InventoryGridV2;
