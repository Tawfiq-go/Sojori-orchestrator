// ════════════════════════════════════════════════════════════════════
// UpdateInventoryModal.jsx — modal de modification bulk (post Excel-select)
// 2 layers : Main form + Confirmation popup
// Génère 1 payload par type de modif pour calendarService.updateCalendar
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect } from 'react';
import { T } from './_shared';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

export default function UpdateInventoryModal({
  open, onClose, selectedCells = [], currency = 'EUR', inventoryData = {}, onSave,
}) {
  const [step, setStep] = useState('form'); // 'form' | 'confirm'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  /* ─── Date range from selectedCells ─── */
  const { startDate, endDate, nights, listingsCount, roomTypesCount } = useMemo(() => {
    if (selectedCells.length === 0) return { startDate: '', endDate: '', nights: 0, listingsCount: 0, roomTypesCount: 0 };
    const isos = selectedCells.map(c => c.dateStr).sort();
    const listings = new Set(selectedCells.map(c => c.listingId));
    const rooms = new Set(selectedCells.map(c => `${c.listingId}|${c.roomTypeId}`));
    return {
      startDate: isos[0], endDate: isos[isos.length - 1],
      nights: isos.length, listingsCount: listings.size, roomTypesCount: rooms.size,
    };
  }, [selectedCells]);

  /* ─── Analyze current values from selected cells ─── */
  const cellsAnalysis = useMemo(() => {
    if (selectedCells.length === 0 || !inventoryData) {
      return { prices: [], availabilities: [], stopSells: [], dynamicPrices: [], minStays: [], maxStays: [] };
    }

    const prices = [], availabilities = [], stopSells = [], dynamicPrices = [], minStays = [], maxStays = [];

    selectedCells.forEach(cell => {
      const inv = inventoryData[cell.listingId]?.[cell.roomTypeId]?.availability?.[cell.dateStr];
      if (inv) {
        if (inv.manualPrice != null) prices.push(inv.manualPrice);
        if (inv.availableRoom != null) availabilities.push(inv.availableRoom);
        if (inv.stopSell != null) stopSells.push(inv.stopSell);
        if (inv.useDynamicPrice != null) dynamicPrices.push(inv.useDynamicPrice);
        if (inv.minStay != null) minStays.push(inv.minStay);
        if (inv.maxStay != null) maxStays.push(inv.maxStay);
      }
    });

    const getCommonOrMinMax = (arr) => {
      if (arr.length === 0) return { common: null, min: null, max: null };
      const allSame = arr.every(v => v === arr[0]);
      return {
        common: allSame ? arr[0] : null,
        min: Math.min(...arr),
        max: Math.max(...arr),
      };
    };

    return {
      prices, availabilities, stopSells, dynamicPrices, minStays, maxStays,
      price: getCommonOrMinMax(prices),
      availability: getCommonOrMinMax(availabilities),
      stopSell: stopSells.length > 0 && stopSells.every(v => v === stopSells[0]) ? stopSells[0] : null,
      dynamicPrice: dynamicPrices.length > 0 && dynamicPrices.every(v => v === dynamicPrices[0]) ? dynamicPrices[0] : null,
      minStay: getCommonOrMinMax(minStays),
      maxStay: getCommonOrMinMax(maxStays),
    };
  }, [selectedCells, inventoryData]);

  /* ─── Form state ─── */
  const [form, setForm] = useState({
    manualPrice: '', availability: '', stopSell: null,
    minStay: '', maxStay: '', closedArrival: false, closedDeparture: false,
    useDynamicPrice: null, dynamicBasePrice: '',
  });
  // Dates toujours éditables (Date objects for MUI DatePicker)
  const [editableStartDate, setEditableStartDate] = useState(null);
  const [editableEndDate, setEditableEndDate] = useState(null);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) {
      setStep('form');
      setError(null);
      setForm({
        manualPrice: '', availability: '', stopSell: null,
        minStay: '', maxStay: '', closedArrival: false, closedDeparture: false,
        useDynamicPrice: null, dynamicBasePrice: '',
      });
      setEditableStartDate(null);
      setEditableEndDate(null);
    } else {
      // Initialiser avec les dates sélectionnées (toujours éditables)
      // Convert ISO string dates to Date objects for MUI DatePicker
      setEditableStartDate(startDate ? new Date(startDate) : null);
      setEditableEndDate(endDate ? new Date(endDate) : null);
      // Calculer la position optimale du modal quand il s'ouvre
      calculateModalPosition();
    }
  }, [open, startDate, endDate]);

  const calculateModalPosition = () => {
    const modalWidth = 520;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;

    // Positionner en haut de l'écran visible avec une marge
    const topMargin = 40; // Marge depuis le haut du viewport
    const top = scrollY + topMargin;

    // Centrer horizontalement
    let left = viewportWidth / 2;

    // Ajuster horizontalement si nécessaire
    if (left - modalWidth / 2 < 20) {
      left = modalWidth / 2 + 20;
    } else if (left + modalWidth / 2 > viewportWidth - 20) {
      left = viewportWidth - modalWidth / 2 - 20;
    }

    setModalPosition({
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
    });
  };

  const changesSummary = useMemo(() => {
    const out = [];
    if (form.manualPrice !== '') out.push(`Prix manuel: ${form.manualPrice} ${currency}`);
    if (form.availability !== '') out.push(`Disponibilité: ${form.availability}`);
    if (form.stopSell !== null) out.push(`Stop Sell: ${form.stopSell ? 'Oui 🚫' : 'Non ✅'}`);
    if (form.minStay !== '') out.push(`Min Stay: ${form.minStay} nuit(s)`);
    if (form.maxStay !== '') out.push(`Max Stay: ${form.maxStay} nuit(s)`);
    if (form.closedArrival) out.push('Arrivée fermée ⛔');
    if (form.closedDeparture) out.push('Départ fermé ⛔');
    if (form.useDynamicPrice !== null) out.push(`Dynamique: ${form.useDynamicPrice ? 'Activer ⚡' : 'Désactiver'}`);
    return out;
  }, [form, currency]);

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
      // Toujours utiliser les dates éditables du formulaire (convertir Date → ISO string)
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      };
      const dateFrom = editableStartDate ? formatDate(editableStartDate) : g.dates[0];
      const dateTo = editableEndDate ? formatDate(editableEndDate) : g.dates[g.dates.length - 1];
      const base = { roomTypeId: g.roomTypeId, date_from: dateFrom, date_to: dateTo };
      if (form.manualPrice !== '')   payloads.push({ type: 'manualPrice',         ...base, price: +form.manualPrice });
      if (form.availability !== '')  payloads.push({ type: 'availability',        ...base, availableRoom: +form.availability });
      if (form.stopSell !== null)    payloads.push({ type: 'stopSell',            ...base, stopSell: form.stopSell });
      if (form.minStay !== '')       payloads.push({ type: 'min_stay_arrival',    ...base, min_stay_arrival: +form.minStay });
      if (form.maxStay !== '')       payloads.push({ type: 'max_stay',            ...base, max_stay: +form.maxStay });
      if (form.closedArrival)        payloads.push({ type: 'closed_to_arrival',   ...base, closed_to_arrival: true });
      if (form.closedDeparture)      payloads.push({ type: 'closed_to_departure', ...base, closed_to_departure: true });
      if (form.useDynamicPrice !== null) payloads.push({ type: 'setUseDynamicPriceManual', ...base, setUseDynamicPriceManual: form.useDynamicPrice, price: form.dynamicBasePrice !== '' ? +form.dynamicBasePrice : undefined });
    });
    return payloads;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSave?.(buildPayloads());
      onClose?.();
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,17,10,0.45)',
        backdropFilter: 'blur(4px)', zIndex: 55,
      }} />
      <div style={{
        position: 'fixed',
        top: modalPosition.top,
        left: modalPosition.left,
        transform: modalPosition.transform,
        background: T.bg1, borderRadius: 18, width: 520, maxWidth: '90vw', maxHeight: '90vh',
        boxShadow: '0 24px 64px rgba(20,17,10,0.25)', zIndex: 60,
        animation: 'fadeIn 0.3s both', display: 'flex', flexDirection: 'column',
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
              <Chip>{nights} nuit(s)</Chip>
              <Chip>{roomTypesCount} room type(s)</Chip>
              {listingsCount > 1 && <Chip>{listingsCount} listings</Chip>}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 0, fontSize: 18, color: T.text3, cursor: 'pointer', padding: 0,
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    <div>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Début
                      </label>
                      <DatePicker
                        value={editableStartDate}
                        onChange={(newValue) => setEditableStartDate(newValue)}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: {
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
                    <div>
                      <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600 }}>
                        Fin
                      </label>
                      <DatePicker
                        value={editableEndDate}
                        onChange={(newValue) => setEditableEndDate(newValue)}
                        format="dd/MM/yyyy"
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: {
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
                    📅 {Math.ceil((editableEndDate - editableStartDate) / (1000 * 60 * 60 * 24)) + 1} jour(s)
                  </div>
                )}
              </Section>

              <Section label="Prix manuel">
                {cellsAnalysis.price.common !== null && (
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                    Actuel: <b>{cellsAnalysis.price.common} {currency}</b>
                  </div>
                )}
                {cellsAnalysis.price.common === null && cellsAnalysis.price.min !== null && (
                  <div style={{ fontSize: 11, color: T.text3, marginBottom: 4, fontFamily: '"Geist Mono", monospace' }}>
                    Min: <b>{cellsAnalysis.price.min}</b> • Max: <b>{cellsAnalysis.price.max} {currency}</b>
                  </div>
                )}
                <FieldBox>
                  <input type="number"
                    placeholder={cellsAnalysis.price.common !== null ? `Actuel: ${cellsAnalysis.price.common} ${currency}` : "Laisser vide pour ne pas modifier"}
                    value={form.manualPrice}
                    onChange={e => upd('manualPrice', e.target.value)} />
                  <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>{currency}</span>
                </FieldBox>
              </Section>

              <Section label="Disponibilité">
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
              </Section>

              <Section label="Arrêt des ventes">
                <ToggleGroup value={form.stopSell} onChange={v => upd('stopSell', v)}
                  options={[
                    { value: true, label: 'Oui 🚫' },
                    { value: false, label: 'Non ✅' },
                    { value: null, label: 'Aucun changement' },
                  ]} />
              </Section>

              <details style={{ marginTop: 10, borderTop: `1px dashed ${T.border}`, paddingTop: 10 }}>
                <summary style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, color: T.text2,
                  fontFamily: '"Geist Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '4px 0',
                }}>▶ Restrictions séjour</summary>
                <div style={{ marginTop: 8 }}>
                  <Section label="Min stay">
                    <FieldBox>
                      <input type="number" placeholder="Ex: 2" value={form.minStay}
                        onChange={e => upd('minStay', e.target.value)} />
                      <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>nuits</span>
                    </FieldBox>
                  </Section>
                  <Section label="Max stay">
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

              <details style={{ marginTop: 10, borderTop: `1px dashed ${T.border}`, paddingTop: 10 }}>
                <summary style={{
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, color: T.text2,
                  fontFamily: '"Geist Mono", monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '4px 0',
                }}>▶ Tarification dynamique</summary>
                <div style={{ marginTop: 8 }}>
                  <ToggleGroup value={form.useDynamicPrice} onChange={v => upd('useDynamicPrice', v)}
                    options={[
                      { value: true, label: 'Activer ⚡' },
                      { value: false, label: 'Désactiver' },
                      { value: null, label: 'Aucun changement' },
                    ]} />
                  {form.useDynamicPrice === true && (
                    <Section label="Prix de base dynamique">
                      <FieldBox>
                        <input type="number" placeholder="Ex: 220" value={form.dynamicBasePrice}
                          onChange={e => upd('dynamicBasePrice', e.target.value)} />
                        <span style={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>{currency}</span>
                      </FieldBox>
                    </Section>
                  )}
                </div>
              </details>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12.5, color: T.text2, margin: '0 0 12px' }}>
                Vous êtes sur le point de modifier <b>{nights} nuit(s)</b> pour <b>{roomTypesCount} room type(s)</b> :
              </p>
              <div style={{
                padding: '10px 12px', background: T.bg2, border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 12, color: T.text2, marginBottom: 12,
                fontFamily: '"Geist Mono", monospace',
              }}>
                📅 Du <b>{startDate}</b> au <b>{endDate}</b>
              </div>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12.5, color: T.text2, lineHeight: 1.9 }}>
                {changesSummary.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
        </div>

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
    </>
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
    }}>
      <style>{`input { flex: 1; border: 0; background: transparent; outline: 0; font: inherit; font-size: 13px; font-family: 'Geist Mono', monospace; font-weight: 700; color: ${T.text}; }`}</style>
      {children}
    </div>
  );
}
function ToggleGroup({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={String(o.value)} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: 8, borderRadius: 8, fontSize: 11.5, fontWeight: active ? 700 : 600,
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
