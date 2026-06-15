// ════════════════════════════════════════════════════════════════════
// ImportAirbnbModal.tsx — Modal principale (5 phases)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, Box, Stack, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { T, KEYFRAMES } from './_tokens';
import type { Owner, RuProperty, SojoriCity, ImportProgress, ImportResultItem } from './_tokens';
import OwnerSearch from './OwnerSearch';
import PropertyList from './PropertyList';
import CityAutocomplete from './CityAutocomplete';
import ImportProgressTimeline from './ImportProgressTimeline';
import ImportResultRecap from './ImportResultRecap';

export type ModalPhase = 'A-admin' | 'A-owner' | 'B' | 'C' | 'D';

export interface ImportAirbnbModalProps {
  open: boolean;
  onClose: () => void;
  /** true → phase A admin (sélection owner) · false → phase A skip (owner session) */
  isAdmin: boolean;
  /** Owner session (uniquement si isAdmin=false) */
  sessionOwner?: Owner | null;
  /** ─── handlers branchés sur ton API ─── */
  searchOwners: (query: string) => Promise<Owner[]>;
  fetchOwnerProperties: (ownerId: string) => Promise<RuProperty[]>;
  cities: SojoriCity[];
  citiesLoading?: boolean;
  /** Lance l'import (batch) — retourne quand polling commence */
  startImport: (params: {
    ownerId: string;
    ruPropertyIds: string[];
    cityId: string;
  }) => Promise<void>;
  /** Hook progress polling → renvoie l'état temps réel (10 étapes backend) */
  importProgress: ImportProgress | null;                      // null tant que pas démarré
  /** Result final (Phase D) */
  importResults: ImportResultItem[] | null;                   // null tant que pas terminé
  /** Callback fin import → ferme + redirige */
  onImported?: (results: ImportResultItem[]) => void;
}

export default function ImportAirbnbModal({
  open, onClose, isAdmin, sessionOwner,
  searchOwners, fetchOwnerProperties, cities, citiesLoading = false,
  startImport, importProgress, importResults, onImported,
}: ImportAirbnbModalProps) {
  const [phase, setPhase] = useState<ModalPhase>(isAdmin ? 'A-admin' : 'A-owner');
  const [owner, setOwner] = useState<Owner | null>(sessionOwner || null);
  const [properties, setProperties] = useState<RuProperty[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [city, setCity] = useState<SojoriCity | null>(null);
  const [cityError, setCityError] = useState(false);

  // Reset au montage / changement de mode
  useEffect(() => {
    if (!open) return;
    setPhase(isAdmin ? 'A-admin' : 'A-owner');
    setOwner(isAdmin ? null : (sessionOwner || null));
    setProperties([]); setSelectedIds([]); setCity(null); setCityError(false);
  }, [open, isAdmin, sessionOwner]);

  // Fetch properties dès qu'on a un owner
  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    setPropsLoading(true);
    fetchOwnerProperties(owner._id)
      .then(p => { if (!cancelled) { setProperties(p); setPhase('B'); } })
      .finally(() => { if (!cancelled) setPropsLoading(false); });
    return () => { cancelled = true; };
  }, [owner, fetchOwnerProperties]);

  // Transitions automatiques sur progress
  useEffect(() => {
    if (importProgress && !importProgress.completed) setPhase('C');
    if (importResults && importResults.length > 0) setPhase('D');
  }, [importProgress, importResults]);

  const importable = useMemo(() => properties.filter(p => p.importable && !p.alreadyImported), [properties]);
  const canImport = selectedIds.length > 0 && !!city;
  const isImporting = phase === 'C';
  const isDone = phase === 'D';

  const handleSelectAll = () => {
    const allIds = importable.map(p => p.ruPropertyId);
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds);
  };
  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleImport = async () => {
    if (!owner || !city) { setCityError(true); return; }
    if (selectedIds.length === 0) return;
    setCityError(false);
    await startImport({ ownerId: owner._id, ruPropertyIds: selectedIds, cityId: city._id });
    // phase C s'active via useEffect importProgress
  };

  return (
    <Dialog
      open={open}
      onClose={isImporting ? undefined : onClose}
      disableEscapeKeyDown={isImporting}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 720, maxWidth: '95vw', m: { xs: 1, sm: 3 },
          borderRadius: '16px', overflow: 'hidden',
          display: 'grid', gridTemplateRows: 'auto auto 1fr auto',
          minHeight: 540, maxHeight: 'calc(100vh - 100px)',
          boxShadow: '0 32px 72px rgba(20,17,10,0.18)',
        },
      }}
      BackdropProps={{ sx: { bgcolor: 'rgba(20,17,10,0.40)', backdropFilter: 'blur(2px)' } }}
    >
      <style>{KEYFRAMES}</style>

      {/* HEADER */}
      <Stack direction="row" gap={1.75} sx={{ alignItems: 'center',
        p: '20px 24px', borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(180deg, #fff, ${T.bg2})`,
      }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: 1.375,
          background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
          color: '#1a1408', fontSize: 18, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          position: 'relative',
          boxShadow: '0 6px 16px rgba(184,133,26,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
        }}>S<Box sx={{
          position: 'absolute', bottom: -4, right: -4, width: 18, height: 18,
          borderRadius: '50%', bgcolor: T.airbnb, color: '#fff', fontSize: 10,
          fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
        }}>A</Box></Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isImporting ? 'Import en cours…' : isDone ? 'Import terminé' : 'Import Airbnb'}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25, lineHeight: 1.45 }}>
            {isImporting
              ? 'Listing, calendrier et orchestration (template owner + ville Sojori) — ne fermez pas la fenêtre.'
              : isDone
                ? 'Listing, calendrier et orchestration configurés — prêt dans Sojori.'
                : 'Importer des annonces Airbnb — listing, photos, calendrier et orchestration depuis le template propriétaire.'}
          </Typography>
        </Box>

        <IconButton size="small" onClick={onClose} disabled={isImporting}
          sx={{ borderRadius: 1.125, opacity: isImporting ? 0.4 : 1 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* PHASE STRIP */}
      <Stack direction="row" gap={1} sx={{ alignItems: 'center',
        px: 3, py: 1.25, bgcolor: T.bg2, borderBottom: `1px solid ${T.border}`,
        fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700,
      }}>
        <PhaseStep label="A · Owner" active={phase === 'A-admin' || phase === 'A-owner'} done={phase !== 'A-admin' && phase !== 'A-owner'} />
        <Box component="span" sx={{ color: T.text4 }}>→</Box>
        <PhaseStep label="B · Sélection" active={phase === 'B'} done={phase === 'C' || phase === 'D'} />
        <Box component="span" sx={{ color: T.text4 }}>→</Box>
        <PhaseStep label="C · Import" active={phase === 'C'} done={phase === 'D'} />
        <Box component="span" sx={{ color: T.text4 }}>→</Box>
        <PhaseStep label="D · Terminé" active={phase === 'D'} done={false} />
      </Stack>

      {/* BODY — phase B : liste scrollable + ville fixe en bas (pas de scroll global) */}
      <Box
        sx={{
          p: '22px 24px',
          minHeight: 0,
          overflow: phase === 'B' ? 'hidden' : 'auto',
          overflowY: phase === 'B' ? 'hidden' : 'auto',
          display: phase === 'B' ? 'flex' : 'block',
          flexDirection: 'column',
          animation: 'sj-fadeIn 0.28s',
        }}
      >
        {phase === 'A-admin' && (
          <OwnerSearch searchOwners={searchOwners} selectedOwner={owner} onSelect={setOwner} />
        )}

        {phase === 'A-owner' && (
          <Stack alignItems="center" sx={{ py: 5 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '50%',
              border: `3px solid ${T.border}`, borderTopColor: T.primary,
              mb: 2.25, animation: 'sj-spin 0.8s linear infinite',
            }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Chargement de vos annonces Airbnb…</Typography>
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.625 }}>
              Synchronisation avec votre compte hôte · quelques secondes
            </Typography>
          </Stack>
        )}

        {phase === 'B' && owner && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Owner banner — fixe */}
            <Stack
              direction="row"
              gap={1.5}
              sx={{
                alignItems: 'center',
                flexShrink: 0,
                p: '12px 14px',
                mb: 1.5,
                background: `linear-gradient(180deg, ${T.primaryTint}, #fff)`,
                border: `1px solid ${T.primaryTint2}`,
                borderRadius: 1.375,
              }}
            >
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #fcd34d, #d97706)',
                color: '#fff', fontFamily: '"Geist Mono", monospace',
                fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{(owner.firstName?.[0] || '') + (owner.lastName?.[0] || '')}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                  {`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email}
                </Typography>
                <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.125 }}>
                  {owner.email}
                </Typography>
              </Box>
              {isAdmin && (
                <Box component="button" onClick={() => { setOwner(null); setPhase('A-admin'); }} sx={{
                  all: 'unset', cursor: 'pointer', fontSize: 11, color: T.primaryDeep, fontWeight: 700,
                  '&:hover': { textDecoration: 'underline' },
                }}>Changer →</Box>
              )}
            </Stack>

            {/* Liste annonces — seule zone scrollable */}
            <Box
              sx={{
                flex: 1,
                minHeight: 120,
                maxHeight: selectedIds.length > 0 ? 'min(42vh, 320px)' : 'min(52vh, 400px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                pr: 0.5,
                mr: -0.5,
                WebkitOverflowScrolling: 'touch',
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'rgba(20,17,10,0.15)',
                  borderRadius: 99,
                },
              }}
            >
              <PropertyList
                properties={properties}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                onSelectAll={handleSelectAll}
                loading={propsLoading}
              />
            </Box>

            {/* Ville Sojori — toujours visible sous la liste */}
            {selectedIds.length > 0 && (
              <Box
                sx={{
                  flexShrink: 0,
                  mt: 1.5,
                  pt: 2,
                  borderTop: `1px solid ${T.border}`,
                  bgcolor: T.bg1,
                  animation: 'sj-slideUp 0.25s both',
                }}
              >
                <CityAutocomplete
                  cities={cities}
                  selected={city}
                  loading={citiesLoading}
                  onSelect={(c) => { setCity(c); setCityError(false); }}
                  error={cityError}
                />
              </Box>
            )}
          </Box>
        )}

        {phase === 'C' && importProgress && (
          <ImportProgressTimeline progress={importProgress} />
        )}

        {phase === 'D' && importResults && (
          <ImportResultRecap results={importResults} />
        )}
      </Box>

      {/* FOOTER */}
      <Stack direction="row" gap={1.5} sx={{ alignItems: 'center',
        p: '16px 24px', borderTop: `1px solid ${T.border}`, bgcolor: T.bg2,
      }}>
        <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {isImporting
            ? '⏱ ne pas fermer la fenêtre'
            : isDone
              ? '✓ terminé'
              : phase === 'B'
                ? selectedIds.length > 0
                  ? city
                    ? `${selectedIds.length} annonce${selectedIds.length !== 1 ? 's' : ''} · ${city.name}`
                    : `${selectedIds.length} annonce${selectedIds.length !== 1 ? 's' : ''} — choisir une ville Sojori`
                  : 'Sélectionnez au moins une annonce'
                : 'Esc pour annuler'}
        </Typography>
        <Stack direction="row" gap={1.125} sx={{ ml: 'auto' }}>
          {isDone ? (
            <>
              <Button onClick={onClose} sx={btnGhost}>Fermer</Button>
              <Button
                onClick={() => {
                  if (importResults) onImported?.(importResults);
                  onClose();
                }}
                sx={btnPrim}
              >
                Voir les listings →
              </Button>
            </>
          ) : isImporting ? (
            <Button disabled sx={btnGhost}>Annuler</Button>
          ) : (
            <>
              <Button onClick={onClose} sx={btnGhost}>Annuler</Button>
              <Button onClick={handleImport} disabled={!canImport || phase === 'A-admin' || phase === 'A-owner'} sx={btnPrim}>
                {phase === 'A-admin' || phase === 'A-owner'
                  ? 'Continuer →'
                  : `Importer ${selectedIds.length} annonce${selectedIds.length > 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </Stack>
      </Stack>
    </Dialog>
  );
}

function PhaseStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      color: active ? T.primaryDeep : done ? T.success : T.text3,
      fontWeight: active ? 800 : 700,
    }}>{done && '✓ '}{label}</Box>
  );
}

const btnPrim = {
  textTransform: 'none' as const, fontWeight: 700, fontSize: 13, px: 2.25, py: 1.25,
  borderRadius: 1.25, letterSpacing: '-0.005em',
  background: `linear-gradient(180deg, #cb9b2c, ${T.primary})`, color: '#1a1408',
  boxShadow: '0 2px 8px rgba(184,133,26,0.25), inset 0 1px 0 rgba(255,255,255,0.30)',
  '&:hover': { filter: 'brightness(1.05)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(184,133,26,0.35)' },
  '&:disabled': { opacity: 0.4, transform: 'none', boxShadow: 'none', filter: 'none', color: '#1a1408' },
};
const btnGhost = {
  textTransform: 'none' as const, fontWeight: 700, fontSize: 13, px: 2.25, py: 1.25,
  borderRadius: 1.25, bgcolor: '#fff', color: T.text, border: `1px solid ${T.border}`,
  '&:hover': { bgcolor: T.bg2 },
};
