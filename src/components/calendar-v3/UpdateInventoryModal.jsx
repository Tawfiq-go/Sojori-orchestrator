// ════════════════════════════════════════════════════════════════════
// UpdateInventoryModal.jsx — modal de modification bulk (post Excel-select)
// 2 layers : Main form + Confirmation popup
// Génère 1 payload par type de modif pour calendarService.updateCalendar
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from 'react';
import { ModalPortal } from '../ModalPortal';
import { ModalScrollColumn } from '../common/ModalScrollColumn';
import { T, toIso, parseIsoLocal, daysBetweenIsoInclusive, resolvePriceMode, resolveSelectionCurrency } from './_shared';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

function splitContiguousIsoRanges(sortedIsos) {
  if (!sortedIsos.length) return [];
  const ranges = [];
  let start = sortedIsos[0];
  let prev = sortedIsos[0];
  for (let i = 1; i < sortedIsos.length; i += 1) {
    const d = sortedIsos[i];
    const next = new Date(`${prev}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const expected = toIso(next);
    if (d !== expected) {
      ranges.push({ from: start, to: prev });
      start = d;
    }
    prev = d;
  }
  ranges.push({ from: start, to: prev });
  return ranges;
}

function selectedDatesHaveGaps(sortedIsos) {
  if (sortedIsos.length <= 1) return false;
  for (let i = 1; i < sortedIsos.length; i += 1) {
    const next = new Date(`${sortedIsos[i - 1]}T12:00:00`);
    next.setDate(next.getDate() + 1);
    if (toIso(next) !== sortedIsos[i]) return true;
  }
  return false;
}

/** Payload PUT update-inventory — omet undefined/null pour éviter Joi 400. */
export function sanitizeInventoryUpdatePayload(item) {
  const keys = [
    'type', 'roomTypeId', 'date_from', 'date_to', 'price', 'availableRoom', 'stopSell',
    'min_stay_arrival', 'max_stay', 'closed_to_arrival', 'closed_to_departure',
    'setUseDynamicPriceManual', 'priceMode', 'days', 'listingName', 'roomTypeName',
  ];
  const out = {};
  for (const k of keys) {
    if (item[k] === undefined || item[k] === null) continue;
    out[k] = item[k];
  }
  return out;
}

export default function UpdateInventoryModal({
  open, onClose, selectedCells = [], currency = 'MAD', inventoryData = {}, listings = [], onSave,
  sojoriMinStayByDate = {},
}) {
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const displayCurrency = useMemo(
    () => resolveSelectionCurrency(selectedCells, listings, currency || 'MAD'),
    [selectedCells, listings, currency],
  );

  /* ─── Date range from selectedCells ─── */
  const selectionMeta = useMemo(() => {
    if (selectedCells.length === 0) {
      return { startDate: '', endDate: '', nights: 0, listingsCount: 0, roomTypesCount: 0, cellsCount: 0 };
    }
    const isos = selectedCells.map((c) => c.dateStr).sort();
    const listings = new Set(selectedCells.map((c) => c.listingId));
    const rooms = new Set(selectedCells.map((c) => `${c.listingId}|${c.roomTypeId}`));
    return {
      startDate: isos[0],
      endDate: isos[isos.length - 1],
      nights: isos.length,
      listingsCount: listings.size,
      roomTypesCount: rooms.size,
      cellsCount: selectedCells.length,
    };
  }, [selectedCells]);

  /* ─── Analyze current values from selected cells ─── */
  const cellsAnalysis = useMemo(() => {
    if (selectedCells.length === 0 || !inventoryData) {
      return {
        prices: [], availabilities: [], stopSells: [], priceModes: [], minStays: [], maxStays: [],
        isSingleListing: false,
      };
    }

    const prices = [], availabilities = [], stopSells = [], priceModes = [], minStays = [], maxStays = [];

    selectedCells.forEach(cell => {
      const inv = inventoryData[cell.listingId]?.[cell.roomTypeId]?.availability?.[cell.dateStr];
      if (inv) {
        if (inv.manualPrice != null) prices.push(inv.manualPrice);
        if (inv.availableRoom != null) availabilities.push(inv.availableRoom);
        if (inv.stopSell != null) stopSells.push(inv.stopSell);
        if (inv.useDynamicPrice != null || inv.priceMode != null) priceModes.push(resolvePriceMode(inv));
        if (inv.minStay != null) minStays.push(inv.minStay);
        if (inv.maxStay != null) maxStays.push(inv.maxStay);
      }
    });

    const firstCell = selectedCells[0];
    const listing = listings.find((l) => (l._id || l.id) === firstCell?.listingId);
    const isSingleListing = listing?.propertyUnit === 'Single';

    const getCommonOrMinMax = (arr) => {
      if (arr.length === 0) return { common: null, min: null, max: null };
      const allSame = arr.every(v => v === arr[0]);
      return {
        common: allSame ? arr[0] : null,
        min: Math.min(...arr),
        max: Math.max(...arr),
      };
    };

    const stopSellCommon = stopSells.length > 0 && stopSells.every(v => v === stopSells[0]) ? stopSells[0] : null;
    const availabilityStats = getCommonOrMinMax(availabilities);

    /** Single : dispo si chambres > 0 et pas d’arrêt des ventes */
    let singleDispoCurrent = null;
    if (isSingleListing) {
      if (stopSellCommon === true) singleDispoCurrent = false;
      else if (availabilityStats.common != null) singleDispoCurrent = availabilityStats.common > 0;
      else if (availabilityStats.min != null) {
        singleDispoCurrent = availabilityStats.min > 0 && availabilityStats.max > 0;
      }
    }

    return {
      prices, availabilities, stopSells, priceModes, minStays, maxStays,
      isSingleListing,
      singleDispoCurrent,
      price: getCommonOrMinMax(prices),
      availability: availabilityStats,
      stopSell: stopSellCommon,
      priceMode: priceModes.length > 0 && priceModes.every(v => v === priceModes[0]) ? priceModes[0] : null,
      minStay: getCommonOrMinMax(minStays),
      maxStay: getCommonOrMinMax(maxStays),
    };
  }, [selectedCells, inventoryData, listings]);

  /* ─── Form state ─── */
  const [form, setForm] = useState({
    manualPrice: '', availability: '', stopSell: null,
    minStay: '', maxStay: '', closedArrival: false, closedDeparture: false,
    priceMode: null,
  });
  // Dates toujours éditables (Date objects for MUI DatePicker)
  const [editableStartDate, setEditableStartDate] = useState(null);
  const [editableEndDate, setEditableEndDate] = useState(null);

  /** Période réellement envoyée à l’API (dates du formulaire, pas seule la sélection Excel). */
  const applyRange = useMemo(() => {
    if (editableStartDate && editableEndDate) {
      const start = toIso(editableStartDate);
      const end = toIso(editableEndDate);
      if (start && end && start <= end) {
        return {
          startDate: start,
          endDate: end,
          nights: daysBetweenIsoInclusive(start, end),
        };
      }
    }
    return {
      startDate: selectionMeta.startDate,
      endDate: selectionMeta.endDate,
      nights: selectionMeta.nights,
    };
  }, [editableStartDate, editableEndDate, selectionMeta]);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) {
      setStep('form');
      setError(null);
      setForm({
        manualPrice: '', availability: '', stopSell: null,
        minStay: '', maxStay: '', closedArrival: false, closedDeparture: false,
        priceMode: null,
      });
      setEditableStartDate(null);
      setEditableEndDate(null);
    } else {
      // Initialiser avec les dates sélectionnées (toujours éditables)
      // Convert ISO string dates to Date objects for MUI DatePicker
      setEditableStartDate(selectionMeta.startDate ? parseIsoLocal(selectionMeta.startDate) : null);
      setEditableEndDate(selectionMeta.endDate ? parseIsoLocal(selectionMeta.endDate) : null);
    }
  }, [open, selectionMeta.startDate, selectionMeta.endDate]);

  const changesSummary = useMemo(() => {
    const out = [];
    if (form.manualPrice !== '') out.push(`Prix manuel: ${form.manualPrice} ${displayCurrency}`);
    if (form.availability !== '') {
      if (cellsAnalysis.isSingleListing) {
        out.push(`Disponibilité: ${form.availability === '1' ? 'Dispo ✅' : 'Pas dispo 🚫'}`);
      } else {
        out.push(`Disponibilité: ${form.availability} chambre(s)`);
      }
    }
    if (!cellsAnalysis.isSingleListing && form.stopSell !== null) {
      out.push(`Arrêt des ventes: ${form.stopSell ? 'Oui 🚫' : 'Non ✅'}`);
    }
    if (form.minStay !== '') out.push(`Min Stay: ${form.minStay} nuit(s)`);
    if (form.maxStay !== '') out.push(`Max Stay: ${form.maxStay} nuit(s)`);
    if (form.closedArrival) out.push('Arrivée fermée ⛔');
    if (form.closedDeparture) out.push('Départ fermé ⛔');
    if (form.priceMode !== null) {
      out.push(`Prix dynamique: ${form.priceMode === 'dynamic' ? 'ON ⚡' : 'OFF'}`);
    }
    return out;
  }, [form, displayCurrency, cellsAnalysis.isSingleListing]);

  /** Reco min stay Sojori (gap / event) si identique sur toute la sélection. */
  const sojoriMinStayReco = useMemo(() => {
    if (!selectedCells.length) return null;
    const values = selectedCells
      .map((c) => sojoriMinStayByDate[c.dateStr])
      .filter((v) => typeof v === 'number' && v > 0);
    if (values.length === 0) return null;
    const first = values[0];
    return values.every((v) => v === first) ? first : null;
  }, [selectedCells, sojoriMinStayByDate]);

  const handleSubmit = () => {
    if (changesSummary.length === 0) { setError('Veuillez modifier au moins un champ'); return; }
    setError(null); setStep('confirm');
  };

  const buildPayloads = () => {
    const cellsByRoom = {};
    selectedCells.forEach(c => {
      const k = `${c.listingId}|${c.roomTypeId}`;
      if (!cellsByRoom[k]) cellsByRoom[k] = { listingId: c.listingId, roomTypeId: c.roomTypeId, dates: new Set() };
      cellsByRoom[k].dates.add(c.dateStr);
    });
    const groups = Object.values(cellsByRoom).map(g => ({ ...g, dates: [...g.dates].sort() }));
    const payloads = [];
    groups.forEach(g => {
      const sortedDates = [...g.dates].sort();
      const hasGaps = selectedDatesHaveGaps(sortedDates);
      const ranges = hasGaps
        ? splitContiguousIsoRanges(sortedDates)
        : [{
            from: editableStartDate ? toIso(editableStartDate) : sortedDates[0],
            to: editableEndDate ? toIso(editableEndDate) : sortedDates[sortedDates.length - 1],
          }];
      ranges.forEach(({ from: dateFrom, to: dateTo }) => {
      const base = { roomTypeId: g.roomTypeId, date_from: dateFrom, date_to: dateTo };
      if (form.manualPrice !== '')   payloads.push({ type: 'manualPrice',         ...base, price: +form.manualPrice });
      if (form.availability !== '') {
        const rooms = +form.availability;
        payloads.push({ type: 'availability', ...base, availableRoom: rooms });
        // Single : synchroniser arrêt des ventes avec dispo / pas dispo
        const listing = listings.find((l) => (l._id || l.id) === g.listingId);
        if (listing?.propertyUnit === 'Single') {
          payloads.push({ type: 'stopSell', ...base, stopSell: rooms < 1 });
        }
      }
      if (form.stopSell !== null) {
        const listing = listings.find((l) => (l._id || l.id) === g.listingId);
        if (listing?.propertyUnit !== 'Single') {
          payloads.push({ type: 'stopSell', ...base, stopSell: form.stopSell });
        }
      }
      if (form.minStay !== '')       payloads.push({ type: 'min_stay_arrival',    ...base, min_stay_arrival: +form.minStay });
      if (form.maxStay !== '')       payloads.push({ type: 'max_stay',            ...base, max_stay: +form.maxStay });
      if (form.closedArrival)        payloads.push({ type: 'closed_to_arrival',   ...base, closed_to_arrival: true });
      if (form.closedDeparture)      payloads.push({ type: 'closed_to_departure', ...base, closed_to_departure: true });
      if (form.priceMode !== null) {
        // setUseDynamicPriceManual = API prod actuelle ; setPriceMode = API priceMode unifié
        payloads.push({
          type: 'setUseDynamicPriceManual',
          ...base,
          setUseDynamicPriceManual: form.priceMode === 'dynamic',
        });
        payloads.push({
          type: 'setPriceMode',
          ...base,
          priceMode: form.priceMode,
        });
      }
      });
    });
    return payloads.map(sanitizeInventoryUpdatePayload);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSave?.(buildPayloads());
      onClose?.();
    } catch (e) {
      const body = e?.response?.data;
      const msg =
        body?.errorMsg ||
        body?.error ||
        body?.message ||
        e?.message ||
        'Erreur lors de la sauvegarde';
      setError(
        msg.includes('Session expired') ||
          msg.includes('refreshToken') ||
          body?.forceLogout
          ? 'Session expirée — reconnectez-vous puis réessayez.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,17,10,0.45)',
        backdropFilter: 'blur(4px)', zIndex: 1250,
      }} />
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        pointerEvents: 'none',
      }}>
        <div style={{
          pointerEvents: 'auto',
          background: T.bg1,
          borderRadius: 18,
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'min(90vh, calc(100dvh - 32px))',
          boxShadow: '0 24px 64px rgba(20,17,10,0.25)',
          animation: 'fadeIn 0.3s both',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {step === 'form' ? "Modifier l'inventaire" : 'Confirmer les modifications'}
            </h3>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Chip>{selectionMeta.cellsCount} cellule(s)</Chip>
              <Chip>{applyRange.nights} j · période appliquée</Chip>
              <Chip>{selectionMeta.roomTypesCount} room type(s)</Chip>
              {selectionMeta.listingsCount > 1 && <Chip>{selectionMeta.listingsCount} listings</Chip>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 0, fontSize: 18, color: T.text3, cursor: 'pointer', padding: 0,
          }}>×</button>
        </div>

        {/* Content */}
        <ModalScrollColumn
          active={open}
          className="calendar-update-inventory-scroll"
          wrapperSx={{ flex: 1, minHeight: 0 }}
          innerSx={{ px: '24px', py: '18px' }}
        >
          {error && (
            <div style={{
              padding: '10px 12px', background: T.errorTint, border: `1px solid ${T.error}40`,
              borderRadius: 8, fontSize: 12, color: T.error, marginBottom: 14,
            }}>⚠ {error}</div>
          )}

          {step === 'form' ? (
            <>
              <Section label="Dates">
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Début
                      </label>
                      <DatePicker
                        value={editableStartDate}
                        referenceDate={editableStartDate ?? undefined}
                        onChange={(newValue) => {
                          setEditableStartDate(newValue);
                          if (newValue && editableEndDate && newValue > editableEndDate) {
                            setEditableEndDate(newValue);
                          }
                        }}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: {
                              width: '100%',
                              maxWidth: '100%',
                              '& .MuiOutlinedInput-root': {
                                fontSize: '12.5px',
                                fontFamily: '"Geist Mono", monospace',
                                fontWeight: 600,
                                background: T.bg1,
                                borderRadius: '9px',
                                '& fieldset': { borderColor: T.border },
                                '&:hover fieldset': { borderColor: T.primary },
                                '&.Mui-focused fieldset': { borderColor: T.primary },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0, paddingRight: 4 }}>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Fin
                      </label>
                      <DatePicker
                        value={editableEndDate}
                        referenceDate={editableEndDate ?? editableStartDate ?? undefined}
                        minDate={editableStartDate ?? undefined}
                        onChange={(newValue) => setEditableEndDate(newValue)}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: {
                              width: '100%',
                              maxWidth: '100%',
                              '& .MuiOutlinedInput-root': {
                                fontSize: '12.5px',
                                fontFamily: '"Geist Mono", monospace',
                                fontWeight: 600,
                                background: T.bg1,
                                borderRadius: '9px',
                                '& fieldset': { borderColor: T.border },
                                '&:hover fieldset': { borderColor: T.primary },
                                '&.Mui-focused fieldset': { borderColor: T.primary },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </LocalizationProvider>
                {editableStartDate && editableEndDate && (
                  <div style={{ fontSize: 11, color: T.ai, marginTop: 6, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>
                    📅 {daysBetweenIsoInclusive(toIso(editableStartDate), toIso(editableEndDate))} jour(s)
                  </div>
                )}
              </Section>

              <Section label="Prix manuel">
                {cellsAnalysis.price.common !== null && (
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                    Actuel: <b>{cellsAnalysis.price.common} {displayCurrency}</b>
                  </div>
                )}
                {cellsAnalysis.price.common === null && cellsAnalysis.price.min !== null && (
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                    Min: <b>{cellsAnalysis.price.min}</b> • Max: <b>{cellsAnalysis.price.max} {displayCurrency}</b>
                  </div>
                )}
                <FieldBox>
                  <input type="number"
                    placeholder={cellsAnalysis.price.common !== null ? `Actuel: ${cellsAnalysis.price.common} ${displayCurrency}` : "Laisser vide pour ne pas modifier"}
                    value={form.manualPrice}
                    onChange={e => upd('manualPrice', e.target.value)} />
                  <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>{displayCurrency}</span>
                </FieldBox>
              </Section>

              <Section label="Disponibilité">
                {cellsAnalysis.isSingleListing ? (
                  <>
                    {cellsAnalysis.singleDispoCurrent !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Actuel: <b>{cellsAnalysis.singleDispoCurrent ? 'Dispo ✅' : 'Pas dispo 🚫'}</b>
                      </div>
                    )}
                    {cellsAnalysis.singleDispoCurrent === null && cellsAnalysis.availability.min !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Valeurs mixtes sur la sélection
                      </div>
                    )}
                    <ToggleGroup
                      value={form.availability === '' ? null : form.availability === '1'}
                      onChange={(v) => upd('availability', v === null ? '' : (v ? '1' : '0'))}
                      options={[
                        { value: true, label: 'Dispo ✅' },
                        { value: false, label: 'Pas dispo 🚫' },
                        { value: null, label: 'Aucun changement' },
                      ]}
                    />
                  </>
                ) : (
                  <>
                    {cellsAnalysis.availability.common !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Actuel: <b>{cellsAnalysis.availability.common}</b>
                      </div>
                    )}
                    {cellsAnalysis.availability.common === null && cellsAnalysis.availability.min !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Min: <b>{cellsAnalysis.availability.min}</b> • Max: <b>{cellsAnalysis.availability.max}</b>
                      </div>
                    )}
                    <FieldBox>
                      <input type="number"
                        placeholder={cellsAnalysis.availability.common !== null ? `Actuel: ${cellsAnalysis.availability.common}` : "Laisser vide pour ne pas modifier"}
                        value={form.availability}
                        onChange={e => upd('availability', e.target.value)} />
                      <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>chambres</span>
                    </FieldBox>
                  </>
                )}
              </Section>

              {!cellsAnalysis.isSingleListing && (
                <Section label="Arrêt des ventes">
                  <ToggleGroup value={form.stopSell} onChange={v => upd('stopSell', v)}
                    options={[
                      { value: true, label: 'Oui 🚫' },
                      { value: false, label: 'Non ✅' },
                      { value: null, label: 'Aucun changement' },
                    ]} />
                </Section>
              )}

              <Section label="Prix dynamique">
                <ToggleGroup
                  value={
                    form.priceMode === 'dynamic'
                      ? true
                      : form.priceMode === 'base'
                        ? false
                        : null
                  }
                  onChange={(v) =>
                    upd('priceMode', v === true ? 'dynamic' : v === false ? 'base' : null)
                  }
                  options={[
                    { value: true, label: 'ON ⚡' },
                    { value: false, label: 'OFF' },
                    { value: null, label: 'Aucun changement' },
                  ]}
                />
                <p style={{ fontSize: 11, color: T.text3, margin: '8px 0 0', lineHeight: 1.45 }}>
                  ON = prix dynamique Sojori · OFF = prix de base. Applicable aussi sur les jours passés
                  (historique) si la date est encore dans l’inventaire actif.
                </p>
              </Section>

              <details style={{ marginTop: 10, borderTop: `1px dashed ${T.border}`, paddingTop: 10 }}>
                <summary style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, color: T.text2,
                  fontFamily: '"Geist Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '4px 0',
                }}>▶ Restrictions séjour</summary>
                <div style={{ marginTop: 8 }}>
                  <Section label="Min stay">
                    {cellsAnalysis.minStay.common !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Actuel: <b>{cellsAnalysis.minStay.common} nuit(s)</b>
                      </div>
                    )}
                    {cellsAnalysis.minStay.common === null && cellsAnalysis.minStay.min !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Min: <b>{cellsAnalysis.minStay.min}</b> • Max: <b>{cellsAnalysis.minStay.max} nuit(s)</b>
                      </div>
                    )}
                    {sojoriMinStayReco != null ? (
                      <button
                        type="button"
                        onClick={() => upd('minStay', String(sojoriMinStayReco))}
                        style={{
                          marginBottom: 6,
                          padding: '5px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: '"Geist Mono", monospace',
                          cursor: 'pointer',
                          borderRadius: 8,
                          border: `1px solid ${T.gold}`,
                          background: T.goldTint,
                          color: T.goldDeep,
                        }}
                      >
                        Reprendre reco Sojori · {sojoriMinStayReco} n
                      </button>
                    ) : null}
                    <FieldBox>
                      <input
                        type="number"
                        placeholder={
                          cellsAnalysis.minStay.common != null
                            ? `Actuel: ${cellsAnalysis.minStay.common} nuit(s)`
                            : 'Laisser vide pour ne pas modifier'
                        }
                        value={form.minStay}
                        onChange={e => upd('minStay', e.target.value)}
                      />
                      <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>nuits</span>
                    </FieldBox>
                  </Section>
                  <Section label="Max stay">
                    {cellsAnalysis.maxStay.common !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Actuel: <b>{cellsAnalysis.maxStay.common} nuit(s)</b>
                      </div>
                    )}
                    {cellsAnalysis.maxStay.common === null && cellsAnalysis.maxStay.min !== null && (
                      <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                        Min: <b>{cellsAnalysis.maxStay.min}</b> • Max: <b>{cellsAnalysis.maxStay.max} nuit(s)</b>
                      </div>
                    )}
                    <FieldBox>
                      <input type="number" placeholder="Ex: 7" value={form.maxStay}
                        onChange={e => upd('maxStay', e.target.value)} />
                      <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>nuits</span>
                    </FieldBox>
                  </Section>
                  <CheckboxRow label="Arrivée fermée ⛔" checked={form.closedArrival} onChange={v => upd('closedArrival', v)} />
                  <CheckboxRow label="Départ fermé ⛔" checked={form.closedDeparture} onChange={v => upd('closedDeparture', v)} />
                </div>
              </details>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12.5, color: T.text2, margin: '0 0 8px' }}>
                Sélection Excel : <b>{selectionMeta.cellsCount}</b> cellule(s) · application sur la période ci-dessous
                pour <b>{selectionMeta.roomTypesCount}</b> room type(s).
              </p>
              <div style={{
                padding: '10px 12px', background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 12, color: T.text2, marginBottom: 12,
                fontFamily: '"Geist Mono", monospace',
              }}>
                📅 Période appliquée : <b>{applyRange.startDate}</b> → <b>{applyRange.endDate}</b>
                {' '}({applyRange.nights} jour(s) calendrier)
              </div>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12.5, color: T.text2, lineHeight: 1.9 }}>
                {changesSummary.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
        </ModalScrollColumn>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 9, background: T.bg2,
        }}>
          {step === 'form' ? (
            <>
              <Btn ghost onClick={onClose}>Annuler</Btn>
              <Btn prim disabled={changesSummary.length === 0} onClick={handleSubmit}>💾 Enregistrer</Btn>
            </>
          ) : (
            <>
              <Btn ghost onClick={() => setStep('form')}>← Retour</Btn>
              <Btn prim disabled={loading} onClick={handleConfirm}>{loading ? 'Sauvegarde…' : '✅ Confirmer'}</Btn>
            </>
          )}
        </div>
        </div>
      </div>
    </ModalPortal>
  );
}

/* ─── Primitives internes ─── */
function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        fontSize: 10.5, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 5,
        fontFamily: '"Geist Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>{label}</label>
      {children}
    </div>
  );
}
function FieldBox({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
      background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 9,
      minWidth: 0,
    }}>
      <style>{`input { flex: 1; min-width: 0; border: 0; background: transparent; outline: 0; font: inherit; font-size: 13px; font-family: 'Geist Mono', monospace; font-weight: 700; color: ${T.text}; }`}</style>
      {children}
    </div>
  );
}
function ToggleGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={String(o.value)} onClick={() => onChange(o.value)} style={{
            flex: '1 1 calc(33.333% - 4px)',
            minWidth: 0,
            padding: '8px 6px',
            borderRadius: 8,
            fontSize: 11.5,
            fontWeight: active ? 700 : 600,
            lineHeight: 1.25,
            whiteSpace: 'normal',
            background: active ? T.primaryTint : T.bg1,
            color: active ? T.primaryDeep : T.text2,
            border: `1px solid ${active ? T.primary : T.border}`,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}
function CheckboxRow({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12.5 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: T.primary }} />
      {label}
    </label>
  );
}
function Chip({ children }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, background: T.primaryTint, color: T.primaryDeep,
      padding: '2px 9px', borderRadius: 99, letterSpacing: '0.04em',
      fontFamily: '"Geist Mono", monospace',
    }}>{children}</span>
  );
}
function Btn({ prim, ghost, children, ...rest }) {
  return (
    <button {...rest} style={{
      padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: rest.disabled ? 'not-allowed' : 'pointer',
      border: 0, fontFamily: 'inherit', opacity: rest.disabled ? 0.5 : 1,
      ...(prim ? {
        background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: T.text,
        boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
      } : ghost ? {
        background: T.bg1, color: T.text, border: `1px solid ${T.border}`,
      } : {}),
    }}>{children}</button>
  );
}
