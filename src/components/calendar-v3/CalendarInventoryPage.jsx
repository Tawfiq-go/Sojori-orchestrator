// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPage.jsx — wrapper toolbar + Multi/Simple toggle
// Point d'entrée principal · à brancher sur la route /calendar-inventory
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { T } from './_shared';
import MultiView from './MultiView';
import SimpleView from './SimpleView';
import ColumnFilters from './ColumnFilters';
import UpdateInventoryModal from './UpdateInventoryModal';

export default function CalendarInventoryPage({
  startDate = new Date(),
  listings = [],
  inventoriesByListing = {}, // { [listingId]: { [iso]: inv } } — pour SimpleView
  inventoryData = {},         // { [listingId]: { [roomTypeId]: { availability: {...} } } } — pour modal
  onUpdateInventory,         // (payloads) => Promise
  onDateChange,              // (newDate) => void — callback pour remonter le changement de date
  defaultView = 'multi',
}) {
  const [view, setView] = useState(defaultView);
  const [selectedListingId, setSelectedListingId] = useState(listings[0]?._id);
  const [selectedColumns, setSelectedColumns] = useState(['availableRoom', 'rate']); // Présélection par défaut
  const [pivotDate, setPivotDate] = useState(startDate);
  const [modalCells, setModalCells] = useState(null);

  // Présélectionner automatiquement le premier listing quand les listings arrivent
  useEffect(() => {
    if (listings.length > 0 && !selectedListingId) {
      setSelectedListingId(listings[0]._id);
    }
  }, [listings, selectedListingId]);

  const selectedListing = listings.find(l => l._id === selectedListingId);

  const navMonth = (delta) => {
    const d = new Date(pivotDate);
    d.setMonth(d.getMonth() + delta);
    setPivotDate(d);
    onDateChange?.(d); // Remonter le changement au parent
  };

  return (
    <div style={{ padding: '22px 28px 50px', maxWidth: 1500, margin: '0 auto' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: '10px 14px', marginBottom: 14,
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        {/* View toggle */}
        <div style={{
          display: 'inline-flex', background: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: 3,
        }}>
          {[
            { id: 'multi', label: '📊 Vue multi', count: listings.length },
            { id: 'simple', label: '📅 Vue simple', count: 1 },
          ].map(opt => {
            const active = view === opt.id;
            return (
              <button key={opt.id} onClick={() => setView(opt.id)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                color: active ? T.text : T.text3,
                background: active ? T.bg1 : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
                border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'inherit',
              }}>
                {opt.label}
                <span style={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 10,
                  background: active ? T.primaryTint : T.bg3,
                  color: active ? T.primaryDeep : T.text3,
                  padding: '1px 7px', borderRadius: 99, fontWeight: 700,
                }}>{opt.count} listing{opt.count > 1 ? 's' : ''}</span>
              </button>
            );
          })}
        </div>

        {/* Date nav */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3,
        }}>
          <NavBtn onClick={() => navMonth(-2)}>«</NavBtn>
          <NavBtn onClick={() => navMonth(-1)}>‹</NavBtn>
          <div style={{
            padding: '0 12px', fontSize: 12.5, fontWeight: 700, color: T.text,
            fontFamily: '"Geist Mono", monospace', minWidth: 140, textAlign: 'center',
          }}>
            {pivotDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
          <NavBtn onClick={() => navMonth(1)}>›</NavBtn>
          <NavBtn onClick={() => navMonth(2)}>»</NavBtn>
        </div>

        {/* Listing selector (Simple view only) */}
        {view === 'simple' && selectedListing && (
          <select value={selectedListingId} onChange={e => setSelectedListingId(e.target.value)} style={{
            padding: '7px 12px', background: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 9, font: 'inherit', fontSize: 12.5, color: T.text, fontWeight: 600,
            cursor: 'pointer', minWidth: 200,
          }}>
            {listings.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        )}

        <div style={{ flex: 1 }} />

        {/* Columns filter (Multi view only) */}
        {view === 'multi' && (
          <ColumnFilters selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        )}
      </div>

      {/* Active view */}
      {view === 'multi' && (
        <MultiView
          startDate={pivotDate}
          daysCount={31}
          listings={listings}
          selectedColumns={selectedColumns}
          onCellsSelected={setModalCells}
        />
      )}
      {view === 'simple' && selectedListing && (
        <SimpleView
          listing={selectedListing}
          year={pivotDate.getFullYear()}
          month={pivotDate.getMonth()}
          inventories={inventoriesByListing[selectedListingId] || {}}
          onCellsSelected={setModalCells}
        />
      )}
      {view === 'simple' && !selectedListing && (
        <div style={{
          background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Aucun listing sélectionné
          </div>
          <div style={{ fontSize: 13, color: T.text3 }}>
            {listings.length === 0
              ? 'Aucun listing disponible. Veuillez ajouter des propriétés.'
              : 'Veuillez sélectionner un listing dans le menu déroulant ci-dessus.'}
          </div>
        </div>
      )}

      <UpdateInventoryModal
        open={!!modalCells}
        selectedCells={modalCells || []}
        currency={selectedListing?.currencyCode || 'EUR'}
        inventoryData={inventoryData}
        onClose={() => setModalCells(null)}
        onSave={async (payloads) => {
          await onUpdateInventory?.(payloads);
          setModalCells(null);
        }}
      />
    </div>
  );
}

function NavBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 7, color: T.text2, fontSize: 14,
      background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
    }}
      onMouseEnter={e => e.currentTarget.style.background = T.bg2}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >{children}</button>
  );
}
