// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPage.jsx — wrapper toolbar + Multi/Simple toggle
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { T, resolveSelectionCurrency } from './_shared';
import MultiView from './MultiView';
import SimpleView from './SimpleView';
import ColumnFilters from './ColumnFilters';
import UpdateInventoryModal from './UpdateInventoryModal';
import CalendarDatePicker from './CalendarDatePicker';
import DpSyncAuditStrip from './DpSyncAuditStrip';
import CalendarLandscapeHint from './CalendarLandscapeHint';
import ReservationCalendarDrawer from './ReservationCalendarDrawer';
import { useCalendarBreakpoint } from '../../hooks/useCalendarBreakpoint';
import { normalizeCalendarReservation, reservationRouteId } from './reservationCalendarUtils';
import reservationsService from '../../services/reservationsService';
import {
  MULTI_VISIBLE_DAYS,
  INVENTORY_PAST_RETENTION_DAYS,
  CALENDAR_HORIZON_MESSAGE,
  clampPivotDate,
  isAtHorizonEnd,
  formatHorizonEndLabel,
  getCalendarWindowBounds,
} from './inventoryCalendarConstants';
import { useWriteAccess } from '../../hooks/useWriteAccess';
function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarInventoryPage({
  startDate = new Date(),
  listingCatalog = [],
  listings: listingsProp,
  inventoriesByListing = {},
  inventoryData = {},
  inventoryLoading = false,
  onUpdateInventory,
  onDateChange,
  defaultView = 'multi',
  simpleMonthsCount = 3,
  onLoadMoreMonths,
  dpSyncSummary = null,
  dpSyncLoading = false,
  listingNameById = {},
}) {
  const listings = listingCatalog.length > 0 ? listingCatalog : listingsProp || [];
  const { canWrite } = useWriteAccess('calendar/multi');
  const [searchParams, setSearchParams] = useSearchParams();
  const viewFromUrl = searchParams.get('view') === 'simple' ? 'simple' : 'multi';

  const [view, setViewState] = useState(viewFromUrl || defaultView);
  /** Vue simple : listing sélectionné porté par l'URL (?listing=) — deep-linkable. */
  const selectedListingId = searchParams.get('listing') || null;
  const setSelectedListingId = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (id) p.set('listing', String(id));
          else p.delete('listing');
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const setView = useCallback(
    (next) => {
      const v = next === 'simple' ? 'simple' : 'multi';
      setViewState(v);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('view', v);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    setViewState(viewFromUrl);
  }, [viewFromUrl]);

  const [selectedColumns, setSelectedColumns] = useState([
    'availableRoom',
    'rate',
    'minStay',
    'dynamicPrice',
  ]);
  const [pivotDate, setPivotDate] = useState(() => startOfDay(startDate));
  const [modalCells, setModalCells] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const [limitHint, setLimitHint] = useState(null);
  const [drawerReservation, setDrawerReservation] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const { showLandscapeHint } = useCalendarBreakpoint();
  const { maxPivotStart, horizonEnd } = useMemo(() => getCalendarWindowBounds(), []);
  const atHorizonEnd = isAtHorizonEnd(pivotDate);

  const windowStart = useMemo(() => startOfDay(pivotDate), [pivotDate]);

  useEffect(() => {
    setPivotDate(clampPivotDate(startDate));
  }, [startDate]);

  useEffect(() => {
    if (!limitHint) return undefined;
    const t = setTimeout(() => setLimitHint(null), 4500);
    return () => clearTimeout(t);
  }, [limitHint]);

  useEffect(() => {
    // Vue simple façon Airbnb : le 1er listing est auto-sélectionné,
    // et on re-sélectionne si le listing de l'URL n'existe plus dans le catalogue.
    if (view !== 'simple' || listings.length === 0) return;
    const exists =
      selectedListingId &&
      listings.some((l) => String(l._id) === String(selectedListingId));
    if (!exists) setSelectedListingId(String(listings[0]._id));
  }, [view, listings, selectedListingId, setSelectedListingId]);

  const selectedListing = useMemo(() => {
    const cat = listings.find((l) => String(l._id) === String(selectedListingId));
    if (!cat) return null;
    return {
      ...cat,
      roomTypes: [
        {
          _id: cat.roomTypeId || 'default',
          name: 'Standard',
          inventories: inventoriesByListing[cat._id] || {},
        },
      ],
    };
  }, [listings, selectedListingId, inventoriesByListing]);

  const commitDate = (d) => {
    const requested = startOfDay(d);
    const next = clampPivotDate(requested);
    if (next.getTime() !== requested.getTime()) {
      setLimitHint(CALENDAR_HORIZON_MESSAGE);
    }
    setPivotDate(next);
    onDateChange?.(next);
  };

  const navDay = (delta) =>
    commitDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth(), pivotDate.getDate() + delta));
  const navWeek = (delta) => navDay(delta * 7);
  const navMonth = (delta) =>
    commitDate(new Date(pivotDate.getFullYear(), pivotDate.getMonth() + delta, pivotDate.getDate()));

  const startLabel = pivotDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const openReservationDrawer = useCallback(async (rawRes) => {
    const shell = normalizeCalendarReservation(rawRes);
    if (!shell) return;
    setDrawerReservation(shell);
    setDrawerLoading(true);
    try {
      const id = reservationRouteId(shell);
      if (id) {
        const full = await reservationsService.getByRouteParam(id);
        setDrawerReservation({
          ...full,
          guestName:
            full.guestName ||
            `${full.guestFirstName || ''} ${full.guestLastName || ''}`.trim() ||
            shell.guestName,
        });
      }
    } catch (err) {
      console.error('[CalendarV3] détail résa:', err);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeReservationDrawer = useCallback(() => {
    setDrawerReservation(null);
    setDrawerLoading(false);
  }, []);

  return (
    <div
      style={{
        padding: view === 'simple' ? '8px 24px 40px' : '10px 28px 36px',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        // overflow hidden casse position:sticky (rail vignettes) — nécessaire seulement en vue multi
        overflow: view === 'simple' ? 'visible' : 'hidden',
      }}
    >
      {showLandscapeHint && <CalendarLandscapeHint />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: view === 'simple' ? '5px 10px' : '6px 12px',
          marginBottom: 8,
          boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          flexWrap: 'wrap',
          overflow: 'visible',
        }}
      >
        {view === 'multi' && (
          <ColumnFilters selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        )}

        <div
          style={{
            display: 'inline-flex',
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: 3,
          }}
        >
          {[
            { id: 'multi', label: '📊 Vue multi', count: listings.length },
            { id: 'simple', label: '📅 Vue simple', count: 1 },
          ].map((opt) => {
            const active = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: active ? T.text : T.text3,
                  background: active ? T.bg1 : 'transparent',
                  boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
                  border: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
                <span
                  style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    background: active ? T.primaryTint : T.bg3,
                    color: active ? T.primaryDeep : T.text3,
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  {opt.count} listing{opt.count > 1 ? 's' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 9,
            padding: 3,
          }}
        >
          <NavBtn title="−1 mois" onClick={() => navMonth(-1)}>
            &lt;&lt;&lt;
          </NavBtn>
          <NavBtn title="−1 semaine" onClick={() => navWeek(-1)}>
            &lt;&lt;
          </NavBtn>
          <NavBtn title="−1 jour" onClick={() => navDay(-1)}>
            &lt;
          </NavBtn>

          <button
            type="button"
            onClick={(e) => {
              setPickerAnchor(e.currentTarget);
              setPickerOpen(true);
            }}
            title="Choisir la date de début (fenêtre 31 jours en vue multi)"
            style={{
              padding: '0 12px',
              minWidth: 148,
              height: 28,
              fontSize: 12.5,
              fontWeight: 700,
              color: T.text,
              fontFamily: '"Geist Mono", monospace',
              textAlign: 'center',
              background: pickerOpen ? T.primaryTint : T.bg2,
              border: `1px solid ${pickerOpen ? T.primary : T.border}`,
              borderRadius: 7,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {startLabel}
          </button>

          <NavBtn title="+1 jour" onClick={() => navDay(1)} disabled={atHorizonEnd}>
            &gt;
          </NavBtn>
          <NavBtn title="+1 semaine" onClick={() => navWeek(1)} disabled={atHorizonEnd}>
            &gt;&gt;
          </NavBtn>
          <NavBtn title="+1 mois" onClick={() => navMonth(1)} disabled={atHorizonEnd}>
            &gt;&gt;&gt;
          </NavBtn>

          <NavBtn title="Aujourd'hui" onClick={() => commitDate(new Date())}>
            ⊙
          </NavBtn>
        </div>

        <CalendarDatePicker
          anchorEl={pickerAnchor}
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
          value={pivotDate}
          maxSelectableDate={maxPivotStart}
          horizonEndDate={horizonEnd}
          onSelect={(d) => {
            commitDate(d);
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
        />

        {view !== 'simple' && (
          <span
            style={{
              fontSize: 10.5,
              color: T.text3,
              fontWeight: 600,
              maxWidth: 280,
              lineHeight: 1.35,
            }}
            title={`Dernière date inventaire : ${formatHorizonEndLabel()}`}
          >
            Calendrier géré sur 3 ans · jusqu&apos;au {formatHorizonEndLabel()}
          </span>
        )}

        {limitHint && (
          <span
            role="status"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.warning,
              background: T.warningTint,
              padding: '4px 10px',
              borderRadius: 8,
              maxWidth: 320,
            }}
          >
            {limitHint}
          </span>
        )}

        {view !== 'simple' && (
          <span
            style={{
              fontSize: 10.5,
              color: T.text3,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            title={`Jours avant J-${INVENTORY_PAST_RETENTION_DAYS} : InventoryArchive (srv-calendar)`}
          >
            Historique gris · hors fenêtre : — (pas de 0)
          </span>
        )}

        <DpSyncAuditStrip
          summary={dpSyncSummary}
          listingNameById={listingNameById}
          selectedListingId={view === 'simple' ? selectedListingId : null}
          loading={dpSyncLoading}
        />

      </div>

      {view === 'multi' && (
        <MultiView
          startDate={windowStart}
          daysCount={MULTI_VISIBLE_DAYS}
          listingCatalog={listings}
          inventoriesByListing={inventoriesByListing}
          inventoryLoading={inventoryLoading}
          selectedColumns={selectedColumns}
          onCellsSelected={canWrite ? setModalCells : undefined}
          onOpenReservation={openReservationDrawer}
          onToggleDynamicPrice={
            canWrite
              ? async ({ listingId, roomTypeId, dateStr, enable }) => {
                  const listing = listings.find((l) => String(l._id) === String(listingId));
                  const rtId = roomTypeId || listing?.roomTypeId || listing?.roomTypes?.[0]?._id;
                  if (!rtId || !dateStr) return;
                  const base = {
                    roomTypeId: String(rtId),
                    date_from: dateStr,
                    date_to: dateStr,
                    listingName: listing?.name || listing?.title || '',
                    roomTypeName: listing?.roomTypeName || '',
                  };
                  await onUpdateInventory?.([
                    {
                      ...base,
                      type: 'setUseDynamicPriceManual',
                      setUseDynamicPriceManual: enable,
                    },
                    {
                      ...base,
                      type: 'setPriceMode',
                      priceMode: enable ? 'dynamic' : 'base',
                    },
                  ]);
                }
              : undefined
          }
        />
      )}
      {view === 'simple' && inventoryLoading && (
        <div
          style={{
            fontSize: 11,
            color: T.text3,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Mise à jour des dates…
        </div>
      )}
      {view === 'simple' && selectedListing && (
        <SimpleView
          listing={selectedListing}
          listings={listings}
          selectedListingId={selectedListingId}
          onSelectListing={setSelectedListingId}
          year={pivotDate.getFullYear()}
          month={pivotDate.getMonth()}
          monthsCount={simpleMonthsCount}
          onLoadMoreMonths={onLoadMoreMonths}
          inventoryLoading={inventoryLoading}
          inventories={inventoriesByListing[selectedListingId] || {}}
          onCellsSelected={canWrite ? setModalCells : undefined}
          onOpenReservation={openReservationDrawer}
        />
      )}
      {view === 'simple' && !selectedListing && (
        <div
          style={{
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Choisissez un listing
          </div>
          <div style={{ fontSize: 13, color: T.text3 }}>
            {listings.length === 0
              ? 'Aucun listing disponible. Veuillez ajouter des propriétés.'
              : 'Sélectionnez un listing dans le menu déroulant ci-dessus pour afficher le calendrier.'}
          </div>
        </div>
      )}

      <UpdateInventoryModal
        open={!!modalCells}
        selectedCells={modalCells || []}
        currency={resolveSelectionCurrency(modalCells, listings, 'MAD')}
        inventoryData={inventoryData}
        listings={listings}
        onClose={() => setModalCells(null)}
        onSave={async (payloads) => {
          await onUpdateInventory?.(payloads);
          setModalCells(null);
        }}
      />

      {drawerReservation && (
        <ReservationCalendarDrawer
          reservation={drawerReservation}
          loading={drawerLoading}
          onClose={closeReservationDrawer}
        />
      )}
    </div>
  );
}

function NavBtn({ children, onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      title={disabled ? `${title} (limite 3 ans)` : title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        minWidth: 28,
        height: 28,
        borderRadius: 7,
        color: disabled ? T.text4 : T.text2,
        fontSize: 13,
        fontWeight: 700,
        background: 'transparent',
        border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        padding: '0 4px',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = T.bg2;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
