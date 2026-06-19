// ════════════════════════════════════════════════════════════════════
// AmenitiesTab.tsx — orchestrateur 3 vues (Catégories / Pièces / Plan)
// Inline : CategoryTabs · RoomTabs · DensityToggle · RoomPlanView
// ════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Box, Stack, Typography, TextField, InputAdornment, Skeleton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { T, KEYFRAMES, ALL_CATEGORIES, getCategoryMeta } from './_tokens';
import type {
  Amenity,
  CategoryName,
  CompositionRoom,
  SelectedAmenity,
  Density,
  ViewMode,
} from './_tokens';
import CategoryBlock from './CategoryBlock';
import RoomBlock from './RoomBlock';
import SelectedPanel from './SelectedPanel';
import RoomAssignModal from './RoomAssignModal';
import { amenityMatchesRoom } from './mapAmenityFromApi';
import { LISTING_LAYOUT } from '../../../constants/listingLayout';

export interface AmenitiesTabProps {
  catalog: Amenity[];
  rooms: CompositionRoom[];
  /** Catégories du catalogue (Airbnb FR si catalogue PM, sinon legacy EN) */
  catalogCategories?: string[];
  value: SelectedAmenity[];
  onChange: (next: SelectedAmenity[]) => void;
  propertyUnit?: 'Single' | 'Multi';
  loading?: boolean;
  onSave?: () => void;
}

export default function AmenitiesTab({
  catalog,
  rooms,
  catalogCategories,
  value,
  onChange,
  propertyUnit = 'Single',
  loading,
}: AmenitiesTabProps) {
  const [view, setView] = useState<ViewMode>('categories');
  const [density, setDensity] = useState<Density>('dense');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<CategoryName | 'all' | 'basic'>('all');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [basicOnly, setBasicOnly] = useState(false);
  const [missingOtaOnly, setMissingOtaOnly] = useState(false);
  const [modalAmenity, setModalAmenity] = useState<Amenity | null>(null);

  const categoryList = catalogCategories?.length ? catalogCategories : ALL_CATEGORIES;

  const selectedMap = useMemo(() => {
    const m = new Map<string, SelectedAmenity>();
    value.forEach((s) => m.set(s._id, s));
    return m;
  }, [value]);

  const catalogById = useMemo(() => {
    const m = new Map<string, Amenity>();
    catalog.forEach((a) => m.set(a._id, a));
    return m;
  }, [catalog]);

  const roomNamesByRentalId = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach((r) => m.set(r.rentalId, r.nameFr || r.roomName));
    return m;
  }, [rooms]);

  const filtered = useMemo(() => {
    let out = catalog.filter((a) => !a.useBed);
    if (basicOnly) out = out.filter((a) => a.basic);
    if (missingOtaOnly) out = out.filter((a) => a.basic && !selectedMap.has(a._id));
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((a) => a.nameFr.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q));
    }
    return out;
  }, [catalog, basicOnly, missingOtaOnly, search, selectedMap]);

  const countsByCategory = useMemo(() => {
    const m = new Map<string, { total: number; selected: number }>();
    filtered.forEach((a) => {
      a.categories.forEach((cat) => {
        const cur = m.get(cat) || { total: 0, selected: 0 };
        cur.total++;
        if (selectedMap.has(a._id)) cur.selected++;
        m.set(cat, cur);
      });
    });
    return m;
  }, [filtered, selectedMap]);

  const totalSelected = useMemo(
    () => value.filter((s) => !catalogById.get(s._id)?.useBed).length,
    [value, catalogById],
  );
  const totalBasicSelected = useMemo(
    () => value.filter((s) => catalogById.get(s._id)?.basic).length,
    [value, catalogById],
  );
  const totalBasic = useMemo(() => catalog.filter((a) => a.basic && !a.useBed).length, [catalog]);
  const completionPct = Math.round((totalBasicSelected / Math.max(1, totalBasic)) * 100);

  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => a.order - b.order), [rooms]);
  const roomRentalIds = useMemo(() => sortedRooms.map((r) => String(r.rentalId)), [sortedRooms]);

  const countsByRoom = useMemo(() => {
    const perRoom = new Map<string, number>();
    let tout = 0;
    for (const a of filtered) {
      if (amenityMatchesRoom(a, null, roomRentalIds)) tout++;
      for (const r of sortedRooms) {
        const rid = String(r.rentalId);
        if (amenityMatchesRoom(a, rid, roomRentalIds)) {
          perRoom.set(rid, (perRoom.get(rid) ?? 0) + 1);
        }
      }
    }
    return { tout, perRoom };
  }, [filtered, sortedRooms, roomRentalIds]);

  const roomCatalog = useMemo(
    () => (view === 'rooms' ? filtered.filter((a) => amenityMatchesRoom(a, activeRoom, roomRentalIds)) : []),
    [filtered, activeRoom, roomRentalIds, view],
  );

  useEffect(() => {
    if (view !== 'rooms' || activeRoom == null) return;
    if (!roomRentalIds.includes(String(activeRoom))) setActiveRoom(null);
  }, [view, activeRoom, roomRentalIds]);

  const selectView = useCallback((next: ViewMode) => {
    setView(next);
    if (next === 'categories') {
      setActiveCat('all');
      setActiveRoom(null);
    } else if (next === 'rooms') {
      setActiveRoom(null);
    }
  }, []);

  const handleToggle = useCallback(
    (a: Amenity) => {
      const existing = selectedMap.get(a._id);
      if (existing) {
        onChange(value.filter((s) => s._id !== a._id));
      } else {
        const prefillRoom =
          view === 'rooms' && activeRoom && a.compositionRoomIds.map(String).includes(String(activeRoom))
            ? [String(activeRoom)]
            : undefined;
        const newSel: SelectedAmenity = {
          _id: a._id,
          count: 1,
          ...(prefillRoom ? { roomRentalIds: prefillRoom } : {}),
        };
        onChange([...value, newSel]);
        if (a.needsRoomAssignment && rooms.length > 0 && !prefillRoom) {
          setModalAmenity(a);
        }
      }
    },
    [selectedMap, onChange, value, rooms, view, activeRoom],
  );

  const handleQty = useCallback(
    (a: Amenity, delta: 1 | -1) => {
      const existing = selectedMap.get(a._id);
      if (!existing) return;
      const next = Math.max(1, existing.count + delta);
      onChange(value.map((s) => (s._id === a._id ? { ...s, count: next } : s)));
    },
    [selectedMap, onChange, value],
  );

  const handleConfirmRooms = useCallback(
    (rentalIds: string[]) => {
      if (!modalAmenity) return;
      onChange(value.map((s) => (s._id === modalAmenity._id ? { ...s, roomRentalIds: rentalIds } : s)));
      setModalAmenity(null);
    },
    [modalAmenity, onChange, value],
  );

  const removeOne = useCallback((a: Amenity) => onChange(value.filter((s) => s._id !== a._id)), [onChange, value]);
  const clearAll = useCallback(() => onChange([]), [onChange]);

  const showRoomTab = propertyUnit === 'Single' && rooms.length > 0;
  const categoriesToRender: string[] = activeCat === 'all' ? categoryList : [activeCat];

  return (
    <Box sx={{ maxWidth: LISTING_LAYOUT.amenitiesMaxWidth, width: '100%', mx: 0, p: 0, mt: -0.5 }}>
      <style>{KEYFRAMES}</style>

      <Stack
        direction="row"
        gap={1.25}
        sx={{
          alignItems: 'center',
          p: '10px 14px',
          mb: 1.25,
          background: `linear-gradient(90deg, ${T.primaryTint}, transparent)`,
          border: `1px solid ${T.primaryTint2}`,
          borderRadius: 1.5,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.125,
            background: `linear-gradient(135deg, #cb9b2c, ${T.primary})`,
            color: '#1a1408',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          ⚡
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            Complétude OTA ·{' '}
            <Box
              component="b"
              sx={{
                color: T.primaryDeep,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 16,
                letterSpacing: '-0.02em',
              }}
            >
              {completionPct}%
            </Box>
            <Box component="span" sx={{ fontSize: 11, color: T.text3, fontWeight: 500, ml: 1 }}>
              · {totalSelected}/{filtered.length} sélectionnés
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25 }}>
            {totalBasicSelected} / {totalBasic} essentiels Airbnb
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            maxWidth: 220,
            height: 6,
            bgcolor: T.bg3,
            borderRadius: 99,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${completionPct}%`,
              background: `linear-gradient(90deg, ${T.primarySoft}, ${T.primary})`,
              backgroundSize: '200% 100%',
              animation: 'sj-shimmer 1.6s infinite linear',
              borderRadius: 99,
            }}
          />
        </Box>
      </Stack>

      <Stack direction="row" gap={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.25 }}>
        <Stack
          direction="row"
          sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.4, p: 0.375, gap: 0.25 }}
        >
          {[
            { id: 'categories' as const, em: '📂', l: 'Par catégories' },
            ...(showRoomTab ? [{ id: 'rooms' as const, em: '🚪', l: 'Par pièce' }] : []),
            { id: 'plan' as const, em: '🗺', l: 'Vue plan' },
          ].map((opt) => (
            <Box
              key={opt.id}
              component="button"
              onClick={() => selectView(opt.id)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                px: 1.625,
                py: 0.875,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 700,
                color: view === opt.id ? T.text : T.text3,
                bgcolor: view === opt.id ? T.bg2 : 'transparent',
                boxShadow: view === opt.id ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                letterSpacing: '-0.005em',
              }}
            >
              <span style={{ fontSize: 13 }}>{opt.em}</span>
              {opt.l}
            </Box>
          ))}
        </Stack>

        <Box sx={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un équipement (WiFi, lit, jacuzzi…)"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: T.text3 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.25,
                fontSize: 12.5,
                bgcolor: T.bg1,
                '& fieldset': { borderColor: T.border },
                '&:hover fieldset': { borderColor: T.borderStrong },
                '&.Mui-focused fieldset': {
                  borderColor: T.primary,
                  borderWidth: 1.5,
                  boxShadow: `0 0 0 3px ${T.primaryTint}`,
                },
              },
            }}
          />
        </Box>

        <FilterChip on={basicOnly} onClick={() => setBasicOnly((b) => !b)} emoji="⚡">
          Basic{' '}
          <Box component="span" sx={chipCtSx}>
            {totalBasicSelected}/{totalBasic}
          </Box>
        </FilterChip>
        <FilterChip on={missingOtaOnly} onClick={() => setMissingOtaOnly((b) => !b)} emoji="⚠">
          Manquants OTA{' '}
          <Box component="span" sx={chipCtSx}>
            {totalBasic - totalBasicSelected}
          </Box>
        </FilterChip>

        <Stack
          direction="row"
          sx={{
            ml: 'auto',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.125,
            p: 0.25,
            gap: 0.125,
          }}
        >
          {[
            { id: 'dense' as const, icon: '▤', title: 'Dense' },
            { id: 'cozy' as const, icon: '▦', title: 'Cards' },
            { id: 'list' as const, icon: '≡', title: 'Liste' },
          ].map((d) => (
            <Box
              key={d.id}
              component="button"
              onClick={() => setDensity(d.id)}
              title={d.title}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                width: 28,
                height: 28,
                borderRadius: 0.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                color: density === d.id ? T.primaryDeep : T.text3,
                bgcolor: density === d.id ? T.primaryTint : 'transparent',
                '&:hover': { color: T.text },
              }}
            >
              {d.icon}
            </Box>
          ))}
        </Stack>
      </Stack>

      {view === 'categories' && (
        <Box key="amenity-filters-categories" sx={filterTabsRowSx} role="tablist" aria-label="Catégories équipements">
          <CatTab active={activeCat === 'all'} onClick={() => setActiveCat('all')} emoji="⭐" total={filtered.length}>
            Tout
          </CatTab>
          <CatTab active={activeCat === 'basic'} onClick={() => setActiveCat('basic')} emoji="⚡" total={totalBasic}>
            Basic
          </CatTab>
          {categoryList.map((c) => {
            const meta = getCategoryMeta(c);
            const ct = countsByCategory.get(c);
            return (
              <CatTab
                key={c}
                active={activeCat === c}
                onClick={() => setActiveCat(c as CategoryName)}
                emoji={meta.emoji}
                total={ct?.total || 0}
                title={c}
              >
                {meta.short}
              </CatTab>
            );
          })}
        </Box>
      )}

      {view === 'rooms' && showRoomTab && (
        <Box key="amenity-filters-rooms" sx={filterTabsRowSx} role="tablist" aria-label="Pièces du logement">
          <CatTab
            active={activeRoom == null}
            onClick={() => setActiveRoom(null)}
            emoji="⭐"
            total={countsByRoom.tout}
            title="Toutes les pièces"
          >
            Tout
          </CatTab>
          {sortedRooms.map((r) => {
            const rid = String(r.rentalId);
            const full = r.nameFr || r.roomName;
            return (
              <CatTab
                key={`room-${rid}`}
                active={activeRoom != null && String(activeRoom) === rid}
                onClick={() => setActiveRoom(rid)}
                emoji={r.useBed ? '🛏' : '🚪'}
                total={countsByRoom.perRoom.get(rid) ?? 0}
                title={full}
              >
                {truncateTabLabel(full)}
              </CatTab>
            );
          })}
        </Box>
      )}

      {view === 'plan' ? (
        <RoomPlanView rooms={rooms} catalog={catalog} value={value} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 2 }}>
          <Box>
            {loading ? (
              <Stack gap={1}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={42} sx={{ bgcolor: T.bg2 }} />
                ))}
              </Stack>
            ) : view === 'categories' ? (
              activeCat === 'all' ? (
                categoriesToRender.map(
                  (c) =>
                    c !== 'all' &&
                    c !== 'basic' && (
                      <CategoryBlock
                        key={c}
                        category={c as CategoryName}
                        amenities={filtered.filter((a) => a.categories.includes(c))}
                        selected={selectedMap}
                        density={density}
                        totalInCategory={countsByCategory.get(c)?.total || 0}
                        selectedCount={countsByCategory.get(c)?.selected || 0}
                        onToggle={handleToggle}
                        onQty={handleQty}
                      />
                    ),
                )
              ) : activeCat === 'basic' ? (
                <SingleGrid
                  amenities={filtered.filter((a) => a.basic)}
                  selected={selectedMap}
                  density={density}
                  onToggle={handleToggle}
                  onQty={handleQty}
                />
              ) : (
                <SingleGrid
                  amenities={filtered.filter((a) => a.categories.includes(activeCat))}
                  selected={selectedMap}
                  density={density}
                  onToggle={handleToggle}
                  onQty={handleQty}
                />
              )
            ) : view === 'rooms' && showRoomTab ? (
              activeRoom == null ? (
                sortedRooms.map((r) => {
                  const rid = String(r.rentalId);
                  const roomAmenities = filtered.filter((a) => amenityMatchesRoom(a, rid, roomRentalIds));
                  const selCount = roomAmenities.filter((a) => selectedMap.has(a._id)).length;
                  return (
                    <RoomBlock
                      key={`room-block-${rid}`}
                      room={r}
                      amenities={roomAmenities}
                      selected={selectedMap}
                      density={density}
                      selectedCount={selCount}
                      onToggle={handleToggle}
                      onQty={handleQty}
                    />
                  );
                })
              ) : (
                (() => {
                  const r = sortedRooms.find((x) => String(x.rentalId) === String(activeRoom));
                  if (!r) {
                    return (
                      <Typography sx={{ fontSize: 13, color: T.text3, py: 3, textAlign: 'center' }}>
                        Pièce introuvable.
                      </Typography>
                    );
                  }
                  const selCount = roomCatalog.filter((a) => selectedMap.has(a._id)).length;
                  return (
                    <RoomBlock
                      room={r}
                      amenities={roomCatalog}
                      selected={selectedMap}
                      density={density}
                      selectedCount={selCount}
                      onToggle={handleToggle}
                      onQty={handleQty}
                    />
                  );
                })()
              )
            ) : null}
          </Box>
          <SelectedPanel
            selected={selectedMap}
            catalog={catalogById}
            roomNamesByRentalId={roomNamesByRentalId}
            onRemove={removeOne}
            onClearAll={clearAll}
          />
        </Box>
      )}

      <RoomAssignModal
        open={!!modalAmenity}
        amenity={modalAmenity}
        rooms={rooms}
        selectedRoomRentalIds={modalAmenity ? selectedMap.get(modalAmenity._id)?.roomRentalIds || [] : []}
        onClose={() => setModalAmenity(null)}
        onConfirm={handleConfirmRooms}
      />
    </Box>
  );
}

const filterTabsRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
  mb: 1.5,
  alignItems: 'center',
} as const;

function truncateTabLabel(label: string, maxLen = 14): string {
  const t = label.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

const chipCtSx = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: 9.5,
  bgcolor: T.bg3,
  color: T.text3,
  px: 0.625,
  borderRadius: 99,
  fontWeight: 700,
  ml: 0.5,
};

function FilterChip({
  on,
  onClick,
  emoji,
  children,
}: {
  on: boolean;
  onClick: () => void;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 32,
        px: 1.5,
        borderRadius: 1.125,
        fontSize: 11.5,
        fontWeight: 600,
        bgcolor: on ? T.primaryTint : T.bg1,
        color: on ? T.primaryDeep : T.text2,
        border: `1px solid ${on ? T.primary : T.border}`,
      }}
    >
      {emoji} {children}
    </Box>
  );
}

function CatTab({
  active,
  onClick,
  emoji,
  total,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  total: number;
  children: React.ReactNode;
  title?: string;
}) {
  const label = typeof children === 'string' ? children : '';
  const tip = title && title !== label ? title : undefined;

  const button = (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.625,
        py: 1,
        borderRadius: 1.125,
        fontSize: 12,
        fontWeight: active ? 700 : 600,
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        maxWidth: 168,
        ...(active
          ? {
              background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`,
              border: `1px solid ${T.primaryDeep}`,
              color: '#1a1408',
              boxShadow: '0 2px 6px rgba(184,133,26,0.25)',
            }
          : {
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              color: T.text2,
              '&:hover': { borderColor: T.borderStrong, color: T.text },
            }),
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
      <Box
        component="span"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
      >
        {children}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 9.5,
          fontWeight: 700,
          flexShrink: 0,
          bgcolor: active ? 'rgba(0,0,0,0.15)' : T.bg2,
          color: active ? '#1a1408' : T.text3,
          px: 0.875,
          borderRadius: 99,
          letterSpacing: '0.04em',
        }}
      >
        {total}
      </Box>
    </Box>
  );

  if (!tip) return button;
  return (
    <Tooltip title={tip} arrow placement="top" enterDelay={280}>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  );
}

function SingleGrid({
  amenities,
  selected,
  density,
  onToggle,
  onQty,
}: {
  amenities: Amenity[];
  selected: Map<string, SelectedAmenity>;
  density: Density;
  onToggle: (a: Amenity) => void;
  onQty: (a: Amenity, delta: 1 | -1) => void;
}) {
  return (
    <CategoryBlock
      category={'Bathroom' as CategoryName}
      amenities={amenities}
      selected={selected}
      density={density}
      totalInCategory={amenities.length}
      selectedCount={amenities.filter((a) => selected.has(a._id)).length}
      onToggle={onToggle}
      onQty={onQty}
    />
  );
}

function RoomPlanView({
  rooms,
  catalog,
  value,
}: {
  rooms: CompositionRoom[];
  catalog: Amenity[];
  value: SelectedAmenity[];
}) {
  void catalog;
  void value;
  return (
    <Box sx={{ p: 3, bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75 }}>
      <Box sx={{ textAlign: 'center', mb: 2.25 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em', mb: 0.5 }}>
          Plan du logement
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Cliquez sur une pièce pour voir ses équipements
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, rooms.length))}, 1fr)`,
          gap: 1.25,
          maxWidth: 680,
          mx: 'auto',
        }}
      >
        {rooms
          .sort((a, b) => a.order - b.order)
          .map((r) => (
            <Box
              key={r.rentalId}
              sx={{
                p: 1.75,
                border: `2px solid ${T.borderStrong}`,
                borderRadius: 1.4,
                bgcolor: T.bg2,
                minHeight: 110,
                cursor: 'pointer',
                transition: 'all 0.15s',
                '&:hover': { borderColor: T.primary, bgcolor: T.primaryTint },
              }}
            >
              <Box sx={{ fontSize: 22 }}>{r.useBed ? '🛏' : '🍳'}</Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 0.625, letterSpacing: '-0.005em' }}>
                {r.nameFr || r.roomName}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  color: T.text3,
                  mt: 0.375,
                  fontWeight: 600,
                }}
              >
                {r.useBed ? 'avec lits' : 'sans lits'}
              </Typography>
            </Box>
          ))}
      </Box>

      <Typography
        sx={{
          textAlign: 'center',
          fontSize: 11.5,
          color: T.text3,
          mt: 1.75,
          fontFamily: '"Geist Mono", monospace',
          letterSpacing: '0.04em',
        }}
      >
        💡 Vue plan optionnelle · idéale pour les logements Single avec composition
      </Typography>
    </Box>
  );
}
