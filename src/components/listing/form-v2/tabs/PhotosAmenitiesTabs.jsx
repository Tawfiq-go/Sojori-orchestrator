// ════════════════════════════════════════════════════════════════════
// PhotosTab.jsx & AmenitiesTab.jsx — Atelier 2026
// À brancher dans le `renderTab` du ListingFormShell.
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Stack, Typography, TextField, Button, IconButton, Chip } from '@mui/material';

const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.08)', aiBorder: 'rgba(124,58,237,0.20)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

function Card({ title, meta, children }) {
  return (
    <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 2.25, mb: 1.75 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.75 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>{title}</Typography>
        {meta && <Typography sx={{ ml: 'auto', fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{meta}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

function AiBanner({ title, body, ctaLabel = 'Appliquer', onCta }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5} sx={{
      background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(184,133,26,0.04))',
      border: `1px solid ${T.aiBorder}`, borderRadius: 1.5, p: '12px 14px', mb: 1.75,
    }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 1, fontSize: 14, color: '#fff',
        background: `linear-gradient(135deg, #9669f7, ${T.ai})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(124,58,237,0.3)', flexShrink: 0,
      }}>✨</Box>
      <Typography sx={{ flex: 1, fontSize: 12.5, color: T.text2 }}>
        <strong style={{ color: T.text }}>{title}</strong> · <span style={{ color: T.text3 }}>{body}</span>
      </Typography>
      <Button size="small" onClick={onCta} sx={{
        textTransform: 'none', fontSize: 11.5, bgcolor: T.ai, color: '#fff',
        '&:hover': { bgcolor: '#6d29d1' },
      }}>{ctaLabel}</Button>
    </Stack>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PhotosTab
   ════════════════════════════════════════════════════════════════════ */
const PHOTO_GRADIENTS = [
  'linear-gradient(135deg,#fde68a,#d97706)',
  'linear-gradient(135deg,#a5f3fc,#0e7490)',
  'linear-gradient(135deg,#86efac,#16a34a)',
  'linear-gradient(135deg,#f9a8d4,#ec4899)',
  'linear-gradient(135deg,#fcd34d,#b45309)',
  'linear-gradient(135deg,#bef264,#65a30d)',
  'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  'linear-gradient(135deg,#fed7aa,#9a3412)',
];

const PHOTO_CATEGORIES = [
  { id: 'all',       label: 'Toutes' },
  { id: 'exterior',  label: 'Extérieur' },
  { id: 'living',    label: 'Salon' },
  { id: 'kitchen',   label: 'Cuisine' },
  { id: 'bedroom',   label: 'Chambre' },
  { id: 'bathroom',  label: 'SDB' },
];

export function PhotosTab({ photos = [], onChange, airbnbHeroOrder = '', onAirbnbChange }) {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? photos : photos.filter(p => p.category === filter);
  const setCover = (id) => onChange?.(photos.map(p => ({ ...p, isCover: p.id === id })));
  const remove = (id) => onChange?.(photos.filter(p => p.id !== id));

  const counts = PHOTO_CATEGORIES.reduce((acc, c) => ({
    ...acc, [c.id]: c.id === 'all' ? photos.length : photos.filter(p => p.category === c.id).length,
  }), {});

  return (
    <Box>
      <AiBanner
        title="L'IA suggère 3 améliorations"
        body="photos 5, 7, 11 : luminosité +12% pour matcher les standards Airbnb"
      />

      {/* Upload zone */}
      <Box sx={{
        border: `2px dashed ${T.borderStrong}`, borderRadius: 1.25, p: 2.5, mb: 1.75,
        bgcolor: T.bg2, textAlign: 'center', cursor: 'pointer',
        '&:hover': { borderColor: T.primary, bgcolor: T.primaryTint },
      }} onClick={() => document.getElementById('photo-upload')?.click()}>
        <Typography sx={{ fontSize: 34 }}>📤</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 1 }}>Glisser-déposer vos photos ici</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>
          JPG, PNG, WEBP · min 1024×768 px · max 8 Mo par photo · 5–30 photos
        </Typography>
        <Button sx={{
          mt: 1.25, textTransform: 'none', fontWeight: 600,
          background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
          color: T.text, boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
        }}>Parcourir les fichiers</Button>
        <input id="photo-upload" type="file" multiple accept="image/*" hidden onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const next = files.map((f, i) => ({
            id: `p_${Date.now()}_${i}`,
            name: f.name,
            url: URL.createObjectURL(f),
            category: 'all',
          }));
          onChange?.([...photos, ...next]);
        }} />
      </Box>

      <Card title="🗂 Galerie" meta="Glisser pour réordonner · 1ʳᵉ = cover OTA">
        <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {PHOTO_CATEGORIES.map(c => {
            const active = filter === c.id;
            return (
              <Chip key={c.id} size="small" clickable onClick={() => setFilter(c.id)}
                label={<>{c.label} <Box component="span" sx={{
                  ml: 0.5, bgcolor: active ? 'rgba(184,133,26,0.20)' : T.bg3,
                  color: active ? T.primaryDeep : T.text3,
                  fontFamily: '"Geist Mono", monospace', fontSize: 9.5,
                  px: 0.625, borderRadius: '99px', fontWeight: 700,
                }}>{counts[c.id] || 0}</Box></>}
                sx={{
                  bgcolor: active ? T.primaryTint : T.bg1,
                  color: active ? T.primaryDeep : T.text2,
                  border: '1px solid', borderColor: active ? T.primary : T.border,
                  fontWeight: 600, fontSize: 11,
                }} />
            );
          })}
        </Stack>

        <Box sx={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1.25,
        }}>
          {visible.map((p, idx) => (
            <Box key={p.id} sx={{
              position: 'relative', aspectRatio: '4/3', borderRadius: 1.125,
              background: p.url ? `url(${p.url}) center/cover` : PHOTO_GRADIENTS[idx % PHOTO_GRADIENTS.length],
              cursor: 'grab', overflow: 'hidden',
              '&:hover .photo-actions': { opacity: 1 },
            }}>
              <Box sx={{
                position: 'absolute', top: 6, left: 6,
                bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', width: 20, height: 20,
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, fontFamily: '"Geist Mono", monospace',
              }}>{idx + 1}</Box>
              {p.isCover && (
                <Box sx={{
                  position: 'absolute', top: 6, right: 6,
                  bgcolor: T.primary, color: T.text, px: 0.875, py: 0.25,
                  borderRadius: 0.625, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em',
                }}>COVER</Box>
              )}
              {p.category && p.category !== 'all' && (
                <Box sx={{
                  position: 'absolute', bottom: 6, left: 6,
                  bgcolor: 'rgba(255,255,255,0.92)', color: T.text,
                  fontSize: 9.5, fontWeight: 700, px: 0.75, py: 0.125,
                  borderRadius: 0.5, letterSpacing: '0.04em', textTransform: 'uppercase',
                  fontFamily: '"Geist Mono", monospace',
                }}>{PHOTO_CATEGORIES.find(c => c.id === p.category)?.label}</Box>
              )}
              <Stack direction="row" gap={0.625} className="photo-actions" sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                p: '6px 8px', opacity: 0, transition: 'opacity 0.15s',
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
                justifyContent: 'flex-end',
              }}>
                <IconButton size="small" onClick={() => setCover(p.id)} sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}>⭐</IconButton>
                <IconButton size="small" sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}>✏️</IconButton>
                <IconButton size="small" onClick={() => remove(p.id)} sx={{ width: 22, height: 22, bgcolor: 'rgba(255,255,255,0.95)' }}>🗑</IconButton>
              </Stack>
            </Box>
          ))}

          {[1, 2, 3].map(i => (
            <Box key={`empty-${i}`} onClick={() => document.getElementById('photo-upload')?.click()}
              sx={{
                aspectRatio: '4/3', border: `2px dashed ${T.borderStrong}`,
                borderRadius: 1.125, bgcolor: T.bg2, color: T.text3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11.5, cursor: 'pointer',
                '&:hover': { borderColor: T.primary, color: T.primary },
              }}>+ Ajouter</Box>
          ))}
        </Box>
      </Card>

      <Card title="🅰️ Sync Airbnb · ordre spécifique" meta="Optionnel">
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1.25 }}>
          Permet de réordonner les photos uniquement sur Airbnb sans modifier l'ordre Sojori.
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1.25, bgcolor: T.bg2, borderRadius: 1 }}>
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 12 }}>airbnbHeroOrder</Box>
          <TextField size="small" fullWidth value={airbnbHeroOrder} onChange={e => onAirbnbChange?.(e.target.value)}
            placeholder="1, 3, 5, 7, 9"
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12.5, bgcolor: T.bg1 } }} />
        </Stack>
      </Card>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AmenitiesTab
   ════════════════════════════════════════════════════════════════════ */
const ROOMS = [
  { id: 'general',     label: '🌐 Général'      },
  { id: 'living',      label: '🛋 Salon'         },
  { id: 'kitchen',     label: '🍳 Cuisine'       },
  { id: 'master',      label: '🛏 Chambre M.'    },
  { id: 'bed2',        label: '🛏 Chambre 2'     },
  { id: 'bed3',        label: '🛏 Chambre 3'     },
  { id: 'bed4',        label: '🛏 Chambre 4'     },
  { id: 'bath1',       label: '🚿 SDB principale' },
  { id: 'bath2',       label: '🚿 SDB 2'         },
  { id: 'outdoor',     label: '🌳 Extérieur'     },
];

const AMENITY_GROUPS = [
  { id: 'media', label: '📶 Internet & médias', items: [
    { id: 'wifi', em: '📶', label: 'WiFi' },
    { id: 'tv', em: '📺', label: 'TV 4K' },
    { id: 'netflix', em: '🎬', label: 'Netflix / Prime' },
    { id: 'sound', em: '🔊', label: 'Sonos / enceintes' },
    { id: 'console', em: '🎮', label: 'Console de jeux' },
    { id: 'cable', em: '📡', label: 'Câble / satellite' },
  ]},
  { id: 'climate', label: '❄️ Climatisation & chauffage', items: [
    { id: 'ac', em: '❄️', label: 'Clim individuelle' },
    { id: 'heat', em: '🌡', label: 'Chauffage central' },
    { id: 'fans', em: '🌬', label: 'Ventilateurs' },
    { id: 'fireplace', em: '🔥', label: 'Cheminée' },
  ]},
  { id: 'comfort', label: '🛁 Confort & literie', items: [
    { id: 'towels', em: '🧖', label: 'Serviettes' },
    { id: 'sheets', em: '🛏', label: 'Draps fournis' },
    { id: 'toiletries', em: '🧴', label: 'Shampoing / gel' },
    { id: 'hairdryer', em: '🪒', label: 'Sèche-cheveux' },
    { id: 'crib', em: '👶', label: 'Lit bébé sur demande' },
    { id: 'mirror', em: '🪞', label: 'Miroir corps entier' },
    { id: 'vacuum', em: '🧹', label: 'Aspirateur' },
  ]},
  { id: 'parking', label: '🅿️ Parking & accès', items: [
    { id: 'parking-free', em: '🅿️', label: 'Parking privé gratuit' },
    { id: 'private-entry', em: '🚪', label: 'Accès indépendant' },
    { id: 'pmr', em: '♿', label: 'Accès PMR' },
  ]},
  { id: 'safety', label: '🛡 Sécurité', items: [
    { id: 'smoke', em: '🔥', label: 'Détecteur fumée' },
    { id: 'co', em: '💨', label: 'Détecteur CO' },
    { id: 'extinguisher', em: '🧯', label: 'Extincteur' },
    { id: 'alarm', em: '🚨', label: 'Alarme' },
    { id: 'cameras', em: '📹', label: 'Caméras extérieures' },
  ]},
  { id: 'premium', label: '🌟 Premium', items: [
    { id: 'pool', em: '🏊', label: 'Piscine chauffée' },
    { id: 'view', em: '🌅', label: 'Vue mer' },
    { id: 'cellar', em: '🍷', label: 'Cave à vin' },
    { id: 'jacuzzi', em: '♨️', label: 'Jacuzzi' },
    { id: 'sauna', em: '🧖', label: 'Sauna / Hammam' },
  ]},
];

export function AmenitiesTab({ amenitiesByRoom = {}, onChange }) {
  const [activeRoom, setActiveRoom] = useState('general');
  const selected = new Set(amenitiesByRoom[activeRoom] || []);

  const toggle = (amenityId) => {
    const next = new Set(selected);
    if (next.has(amenityId)) next.delete(amenityId); else next.add(amenityId);
    onChange?.({ ...amenitiesByRoom, [activeRoom]: Array.from(next) });
  };

  return (
    <Box>
      <AiBanner
        title="23 équipements détectés sur tes photos"
        body="vérifie + complète. L'IA peut suggérer ce qui manque pour ton type de logement."
        ctaLabel="Suggérer"
      />

      <Card title="🏠 Par pièce" meta="Click sur une pièce pour voir / modifier ses équipements">
        {/* Room tabs */}
        <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap', pb: 1, mb: 1.75, borderBottom: `1px solid ${T.border}` }} useFlexGap>
          {ROOMS.map(r => {
            const active = activeRoom === r.id;
            const count = (amenitiesByRoom[r.id] || []).length;
            return (
              <Box key={r.id} component="button" onClick={() => setActiveRoom(r.id)} sx={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.625, py: 0.875, borderRadius: 1,
                bgcolor: active ? T.primary : T.bg1,
                border: `1px solid ${active ? T.primaryDeep : T.border}`,
                color: active ? T.text : T.text2,
                fontSize: 12, fontWeight: 600,
                '&:hover': { borderColor: T.borderStrong },
              }}>
                {r.label}
                <Box sx={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
                  bgcolor: active ? 'rgba(0,0,0,0.10)' : T.bg3,
                  color: active ? T.text : T.text3,
                  px: 0.625, py: '1px', borderRadius: '99px',
                }}>{count}</Box>
              </Box>
            );
          })}
        </Stack>

        {AMENITY_GROUPS.map(group => {
          const onCount = group.items.filter(it => selected.has(it.id)).length;
          return (
            <Box key={group.id} sx={{ mb: 2.25 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{
                p: '8px 12px', bgcolor: T.bg2, borderRadius: 0.875, mb: 1.25,
              }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{group.label}</Typography>
                <Typography sx={{ fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>
                  {onCount} / {group.items.length} cochés
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 0.75 }}>
                {group.items.map(it => {
                  const active = selected.has(it.id);
                  return (
                    <Box key={it.id} onClick={() => toggle(it.id)} sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      p: '7px 10px', border: '1px solid', borderColor: active ? T.primary : T.border,
                      borderRadius: 0.875, bgcolor: active ? T.primaryTint : T.bg1,
                      color: active ? T.text : T.text2,
                      cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400,
                      '&:hover': { borderColor: active ? T.primary : T.borderStrong, color: T.text },
                    }}>
                      <Box sx={{ fontSize: 14 }}>{it.em}</Box>
                      <Box sx={{ flex: 1 }}>{it.label}</Box>
                      <Box sx={{
                        width: 14, height: 14, borderRadius: 0.375,
                        bgcolor: active ? T.primary : 'transparent',
                        border: '1.5px solid', borderColor: active ? T.primaryDeep : T.borderStrong,
                        color: T.text, fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{active ? '✓' : ''}</Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Card>
    </Box>
  );
}

export default { PhotosTab, AmenitiesTab };
