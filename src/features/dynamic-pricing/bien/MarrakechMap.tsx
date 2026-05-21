// ════════════════════════════════════════════════════════════════════
// MarrakechMap.tsx — Leaflet impératif (évite react-leaflet + StrictMode)
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Stack, Typography } from '@mui/material';
import { T } from '../_tokens';
import {
  DEFAULT_MAP_BASEMAP,
  MAP_BASEMAPS,
  MAP_CONTAINER_HEIGHT_PX,
  MOROCCO_MAP_BOUNDS,
  type MapBasemapDef,
  type MapBasemapId,
} from '../utils/mapBasemaps';
import { haversineMeters } from '../utils/geoDistance';

export interface CompMapPin {
  id: string;
  name: string;
  adr: number;
  occupancy: number;
  rating: number;
  lat: number;
  lng: number;
  ratingColor: string;
}

export interface MarrakechZone {
  id: string;
  name: string;
  adrMad: number;
}

export interface MarrakechMapProps {
  zones?: MarrakechZone[];
  compositions: CompMapPin[];
  bien: { lat: number; lng: number; name: string };
  radiusKmOptions?: number[];
  minRatingOptions?: number[];
  radiusKm?: number;
  minRating?: number;
  onRadiusChange?: (km: number) => void;
  onMinRatingChange?: (r: number) => void;
  onCompClick?: (id: string) => void;
}

const MARRAKECH_CENTER: L.LatLngExpression = [31.6295, -7.9811];

const bienIcon = L.divIcon({
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 0 6px rgba(244,207,94,0.9))">★</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function compIcon(color: string, size = 14) {
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineMeters(lat1, lng1, lat2, lng2) / 1000;
}

function addBasemapTiles(map: L.Map, basemap: MapBasemapDef, fallback: MapBasemapDef) {
  const primary = L.tileLayer(basemap.url, {
    attribution: basemap.attribution,
    maxZoom: basemap.maxZoom,
    subdomains: basemap.subdomains ?? 'abc',
    detectRetina: true,
  });

  const backup = L.tileLayer(fallback.url, {
    attribution: fallback.attribution,
    maxZoom: fallback.maxZoom,
    subdomains: fallback.subdomains ?? 'abc',
    detectRetina: true,
  });

  let switched = false;
  primary.on('tileerror', () => {
    if (switched) return;
    switched = true;
    map.removeLayer(primary);
    backup.addTo(map);
  });

  primary.addTo(map);
  return primary;
}

function scheduleMapResize(map: L.Map) {
  const run = () => {
    try {
      map.invalidateSize({ animate: false });
    } catch {
      /* ignore */
    }
  };
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(run);
  });
  window.setTimeout(run, 120);
  window.setTimeout(run, 400);
}

function ImperativeLeafletMap({
  basemapId,
  bienLat,
  bienLng,
  bienOk,
  bienName,
  filteredComps,
  radiusKm,
}: {
  basemapId: MapBasemapId;
  bienLat: number;
  bienLng: number;
  bienOk: boolean;
  bienName: string;
  filteredComps: CompMapPin[];
  radiusKm: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const compKey = useMemo(
    () => filteredComps.map((c) => `${c.id}:${c.lat}:${c.lng}`).join('|'),
    [filteredComps],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || el.offsetHeight < 8) return undefined;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center: L.LatLngExpression = bienOk ? [bienLat, bienLng] : MARRAKECH_CENTER;
    const map = L.map(el, {
      scrollWheelZoom: true,
      minZoom: 12,
      maxZoom: 18,
    }).setView(center, 14);
    mapRef.current = map;

    const moroccoBounds = L.latLngBounds(MOROCCO_MAP_BOUNDS);
    map.setMaxBounds(moroccoBounds.pad(0.06));

    const basemap = MAP_BASEMAPS[basemapId];
    const fallback = MAP_BASEMAPS.cartoVoyager;
    addBasemapTiles(map, basemap, fallback);

    if (basemapId === 'esriImagery') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, opacity: 0.75 },
      ).addTo(map);
    }

    const layers = L.layerGroup().addTo(map);

    if (bienOk) {
      L.circle([bienLat, bienLng], {
        radius: radiusKm * 1000,
        color: '#a67c00',
        fillColor: '#F4CF5E',
        fillOpacity: 0.2,
        weight: 3,
        dashArray: '8 5',
      }).addTo(layers);

      L.marker([bienLat, bienLng], { icon: bienIcon })
        .addTo(layers)
        .bindPopup(`<strong>${bienName}</strong><br/>Votre bien`);
    }

    for (const c of filteredComps) {
      L.marker([c.lat, c.lng], { icon: compIcon(c.ratingColor) })
        .addTo(layers)
        .bindPopup(
          `<strong>${c.name}</strong><br/>${c.adr.toLocaleString('fr-FR')} MAD · occ ${Math.round(c.occupancy * 100)}% · ★ ${c.rating.toFixed(2)}`,
        );
    }

    const fit: L.LatLngExpression[] = bienOk ? [[bienLat, bienLng]] : [];
    for (const c of filteredComps) {
      fit.push([c.lat, c.lng]);
    }

    scheduleMapResize(map);

    if (fit.length > 0) {
      const bounds = L.latLngBounds(fit);
      const maxZoom =
        radiusKm <= 0.5 ? 16 : radiusKm <= 1 ? 15 : radiusKm <= 2 ? 14 : 13;
      window.setTimeout(() => {
        try {
          map.invalidateSize({ animate: false });
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: Math.min(maxZoom, 16) });
        } catch {
          /* ignore */
        }
      }, 150);
    }

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleMapResize(map))
        : null;
    ro?.observe(el);

    return () => {
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [basemapId, bienLat, bienLng, bienOk, bienName, compKey, radiusKm]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: MAP_CONTAINER_HEIGHT_PX,
        width: '100%',
        bgcolor: '#e8e4dc',
        zIndex: 1,
        '& .leaflet-container': {
          height: MAP_CONTAINER_HEIGHT_PX,
          width: '100%',
          fontFamily: 'inherit',
          background: '#e8e4dc',
        },
      }}
    />
  );
}

export default function MarrakechMap({
  compositions,
  bien,
  radiusKmOptions = [0.5, 1, 2, 3],
  minRatingOptions = [4.0, 4.5, 4.8],
  radiusKm = 1,
  minRating = 4.0,
  onRadiusChange,
  onMinRatingChange,
}: MarrakechMapProps) {
  const [radius, setRadius] = useState(radiusKm);
  const [minR, setMinR] = useState(minRating);
  const [basemapId, setBasemapId] = useState<MapBasemapId>(DEFAULT_MAP_BASEMAP);

  const bienLat = Number(bien.lat);
  const bienLng = Number(bien.lng);
  const bienOk = Number.isFinite(bienLat) && Number.isFinite(bienLng);

  const filteredComps = useMemo(() => {
    if (!bienOk) return [];
    return compositions.filter(
      (c) =>
        c.rating >= minR &&
        distanceKm(bienLat, bienLng, c.lat, c.lng) <= radius,
    );
  }, [compositions, bienLat, bienLng, bienOk, minR, radius]);

  return (
    <Box
      sx={{
        maxWidth: 1380,
        mx: 'auto',
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 2.25,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <Stack
        direction="row"
        sx={{ gap: 1.75, 
          flexWrap: 'wrap',
          alignItems: 'center',
          p: '14px 18px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            color: T.text3,
            textTransform: 'uppercase',
          }}
        >
          Rayon
        </Typography>
        <Pills
          options={radiusKmOptions.map((k) => ({ id: k, label: `${k}km` }))}
          active={radius}
          onChange={(k) => {
            setRadius(Number(k));
            onRadiusChange?.(Number(k));
          }}
        />
        <Typography
          sx={{
            ml: 1,
            fontSize: 11,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            color: T.text3,
            textTransform: 'uppercase',
          }}
        >
          Note min
        </Typography>
        <Pills
          options={minRatingOptions.map((r) => ({ id: r, label: `${r}+` }))}
          active={minR}
          onChange={(r) => {
            setMinR(Number(r));
            onMinRatingChange?.(Number(r));
          }}
        />
        <Typography
          sx={{
            ml: { xs: 0, md: 1 },
            fontSize: 11,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            color: T.text3,
            textTransform: 'uppercase',
          }}
        >
          Fond
        </Typography>
        <Pills
          options={Object.values(MAP_BASEMAPS).map((b) => ({
            id: b.id,
            label: b.label,
          }))}
          active={basemapId}
          onChange={(id) => setBasemapId(id as MapBasemapId)}
        />
        <Typography sx={{ ml: 'auto', fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
          {filteredComps.length} / {compositions.length} comps
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative', height: MAP_CONTAINER_HEIGHT_PX, width: '100%' }}>
        <ImperativeLeafletMap
          basemapId={basemapId}
          bienLat={bienLat}
          bienLng={bienLng}
          bienOk={bienOk}
          bienName={bien.name}
          filteredComps={filteredComps}
          radiusKm={radius}
        />

        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 1000,
            bgcolor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${T.border}`,
            borderRadius: 1.375,
            p: '10px 13px',
            fontSize: 10.5,
            color: T.text2,
            boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
            pointerEvents: 'none',
          }}
        >
          <Stack direction="row" sx={{ gap: 0.75,  alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ fontSize: 16, color: T.gold }}>★</Box>
            <span>Votre bien</span>
          </Stack>
          <Stack direction="row" sx={{ gap: 0.5,  alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: T.success }} />
            <span>★ 4.8+</span>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: T.goldDeep, ml: 0.5 }} />
            <span>4.5+</span>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function Pills<T extends string | number>({
  options,
  active,
  onChange,
}: {
  options: { id: T; label: string }[];
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <Stack direction="row" sx={{ gap: 0.5 }}>
      {options.map((opt) => (
        <Box
          key={String(opt.id)}
          component="button"
          onClick={() => onChange(opt.id)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            px: 1.125,
            py: 0.625,
            borderRadius: 0.875,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: '"Geist Mono", monospace',
            letterSpacing: '0.04em',
            bgcolor: opt.id === active ? '#F4CF5E' : '#fff',
            border: `1px solid ${opt.id === active ? '#c79b22' : 'rgba(20,17,10,0.07)'}`,
            color: opt.id === active ? '#14110a' : '#55504a',
          }}
        >
          {opt.label}
        </Box>
      ))}
    </Stack>
  );
}
