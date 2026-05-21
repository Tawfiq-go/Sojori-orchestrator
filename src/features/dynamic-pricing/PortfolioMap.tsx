// ════════════════════════════════════════════════════════════════════
// PortfolioMap.tsx — carte multi-pins · zones colorées + tooltip KPIs
// Hover sur une zone → tooltip avec listings marché · ADR · occupation · mes biens
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { PortfolioZoneStats } from './PortfolioView';
import DataEmptyPlaceholder from './DataEmptyPlaceholder';
import { getCityMapCatalog } from './cityMapCatalog';
import {
  latLngToMapStage,
  mapSubtitleForCity,
  resolveMapBounds,
} from './utils/portfolioMapGeo';

export interface PortfolioMapPin {
  id: string;
  listingName: string;
  performanceRatio: number;         // 0+ (1 = à potentiel)
  potentialMad: number;             // taille du pin
  aiEnabled: boolean;
  rating: number;
  lat: number;
  lng: number;
  /** @deprecated calculé dans la carte depuis lat/lng */
  x?: number;
  y?: number;
}

export interface PortfolioMapProps {
  pins: PortfolioMapPin[];
  /** Stats par zone — clé = zoneId */
  zoneStats: Record<string, PortfolioZoneStats>;
  /** Ville active (filtre géré par PortfolioCityScopeBar) */
  cityLabel?: string | null;
  onPinClick?: (id: string) => void;
}

function pinColor(p: PortfolioMapPin): string {
  if (!p.aiEnabled) return T.bg3;
  if (p.performanceRatio >= 0.75) return T.success;
  if (p.performanceRatio >= 0.40) return T.goldDeep;
  return T.error;
}

export default function PortfolioMap({
  pins, zoneStats, cityLabel, onPinClick,
}: PortfolioMapProps) {
  const [hoveredPin, setHoveredPin] = useState<PortfolioMapPin | null>(null);
  const [hoveredZone, setHoveredZone] = useState<{ zone: { id: string; name: string }; x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const cityCatalog = useMemo(() => getCityMapCatalog(cityLabel), [cityLabel]);
  const zones = cityCatalog?.zones ?? [];
  const showZones = zones.length > 0;
  const bounds = useMemo(() => resolveMapBounds(cityLabel, pins), [cityLabel, pins]);
  const positionedPins = useMemo(
    () =>
      pins.map((p) => {
        const { x, y } = latLngToMapStage(p.lat, p.lng, bounds);
        return { ...p, x, y };
      }),
    [pins, bounds],
  );

  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 560,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, p: '12px 16px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800 }}>🗺 Carte portefeuille</Typography>
        {cityLabel ? (
          <Typography sx={{
            ml: 'auto', fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
            color: T.goldDeep, letterSpacing: '0.04em',
          }}>
            {cityLabel} · {pins.length} pin{pins.length !== 1 ? 's' : ''}
          </Typography>
        ) : (
          <Typography sx={{
            ml: 'auto', fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 600,
            color: T.text3,
          }}>
            Toutes villes · {pins.length} pin{pins.length !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>
      <Typography sx={{
        px: 2, py: 0.75, fontSize: 10.5, color: T.text3, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2,
      }}>
        {mapSubtitleForCity(cityLabel)}
      </Typography>

      <Box ref={stageRef} sx={{
        flex: 1, position: 'relative',
        background: 'linear-gradient(135deg, #f8f4ea, #f0e9d6)',
        overflow: 'hidden', minHeight: 480,
      }}>
        {pins.length === 0 && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, zIndex: 2 }}>
            <DataEmptyPlaceholder compact title="Aucun pin" hint="Lat/lng requis (snapshot marché ou listing)" />
          </Box>
        )}
        <svg viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {showZones && zones.map(z => (
            <g key={z.id}>
              <path
                d={z.path} fill={z.fill} stroke="#c79b22" strokeWidth="2" opacity="0.75"
                onMouseEnter={(e) => {
                  const rect = stageRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoveredZone({ zone: z, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseMove={(e) => {
                  const rect = stageRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoveredZone(prev => prev?.zone.id === z.id
                    ? { zone: z, x: e.clientX - rect.left, y: e.clientY - rect.top }
                    : prev);
                }}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ cursor: 'default' }}
              />
              <text
                x={z.labelX}
                y={z.labelY}
                textAnchor="middle"
                fontSize="14"
                fontWeight="800"
                fill={z.labelColor}
                style={{ cursor: 'help', pointerEvents: 'all' }}
                onMouseEnter={(e) => {
                  const rect = stageRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoveredZone({ zone: z, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseMove={(e) => {
                  const rect = stageRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHoveredZone({ zone: z, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setHoveredZone(null)}
              >
                {z.name}
              </text>
              <text x={z.labelX} y={z.labelY + 16} textAnchor="middle"
                fontSize="9" fontFamily="Geist Mono" fontWeight="700"
                fill={z.labelColor === '#fff' ? 'rgba(255,255,255,0.85)' : 'rgba(20,17,10,0.65)'}
                style={{ pointerEvents: 'none' }}>
                {zoneStats[z.id]?.myListingsCount ?? 0} biens
              </text>
            </g>
          ))}
        </svg>

        {/* Pins biens */}
        {positionedPins.map(p => {
          const size = 12 + Math.min(14, p.potentialMad / 25000);
          return (
            <Box key={p.id}
              onMouseEnter={() => setHoveredPin(p)}
              onMouseLeave={() => setHoveredPin(null)}
              onClick={() => onPinClick?.(p.id)}
              sx={{
                position: 'absolute', left: `${(p.x / 1000) * 100}%`, top: `${(p.y / 480) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: size, height: size, borderRadius: '50%',
                bgcolor: pinColor(p),
                border: p.aiEnabled ? '2px solid #fff' : `2px dashed ${T.borderStrong}`,
                boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
                cursor: 'pointer', zIndex: 3,
                transition: 'transform 0.15s',
                '&:hover': { transform: 'translate(-50%, -50%) scale(1.25)', zIndex: 6 },
              }}
            />
          );
        })}

        {/* Tooltip pin */}
        {hoveredPin && (
          <Box sx={{
            position: 'absolute', left: `${(hoveredPin.x / 1000) * 100}%`, top: `calc(${(hoveredPin.y / 480) * 100}% - 22px)`,
            transform: 'translate(-50%, -100%)',
            bgcolor: 'rgba(20,17,10,0.96)', color: '#fff', px: 1.375, py: 0.875,
            borderRadius: 0.875, fontSize: 11, whiteSpace: 'nowrap', zIndex: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.30)', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, mb: 0.25 }}>{hoveredPin.listingName}</Typography>
            <Typography sx={{ fontSize: 10, color: T.gold, fontFamily: '"Geist Mono", monospace', fontWeight: 700 }}>
              {hoveredPin.potentialMad.toLocaleString('fr-FR')} MAD · ★ {hoveredPin.rating.toFixed(2)}
              {!hoveredPin.aiEnabled && ' · AI OFF'}
            </Typography>
          </Box>
        )}

        {/* Tooltip zone — déclenché par hover sur path SVG */}
        {hoveredZone && zoneStats[hoveredZone.zone.id] && (() => {
          const s = zoneStats[hoveredZone.zone.id];
          const tooltipX = Math.min(hoveredZone.x + 12, 720);
          const tooltipY = Math.max(hoveredZone.y - 12, 30);
          return (
            <Box sx={{
              position: 'absolute', left: tooltipX, top: tooltipY,
              bgcolor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)',
              border: `1px solid ${T.borderStrong}`, borderRadius: 1.375,
              p: '12px 14px', minWidth: 220, zIndex: 9,
              boxShadow: '0 12px 32px rgba(20,17,10,0.18)', pointerEvents: 'none',
            }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.875, mb: 1.125 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.005em' }}>
                  📍 {s.zoneName}
                </Typography>
                <Box sx={{
                  ml: 'auto', fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
                  bgcolor: T.goldTint, color: T.goldDeep,
                  px: 0.875, py: 0.125, borderRadius: '99px', letterSpacing: '0.04em',
                }}>
                  {s.myListingsCount} BIEN{s.myListingsCount !== 1 ? 'S' : ''}
                </Box>
              </Stack>
              <Stack sx={{ gap: 0.625 }}>
                <KvRow k="Listings actifs" v={`${s.airroiListings.toLocaleString('fr-FR')}`} sub="parc estimé" />
                <KvRow k="ADR médian" v={s.adrMedian.toLocaleString('fr-FR')} sub="MAD" />
                <KvRow k="Occupation" v={`${Math.round(s.occupancyAvg * 100)}%`} sub="moyenne" />
              </Stack>
            </Box>
          );
        })()}

        {/* Légende */}
        <Box sx={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 5,
          bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          border: `1px solid ${T.border}`, borderRadius: 1.25,
          p: '10px 12px', fontSize: 10.5, color: T.text2,
          boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        }}>
          <Typography sx={{
            fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
            color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75,
          }}>Performance vs potentiel</Typography>
          <LegendRow color={T.success} label="Over · ≥ 75%" />
          <LegendRow color={T.goldDeep} label="Par · 40-75%" />
          <LegendRow color={T.error} label="Under · < 40%" />
          <LegendRow color={T.bg3} dashed label="AI OFF" />
          <Typography sx={{
            mt: 1, pt: 0.75, borderTop: `1px solid ${T.border}`,
            fontSize: 9.5, color: T.text4, fontStyle: 'italic',
            }}>Taille = potentiel annuel · survol zone (nom) = KPIs · clic pin = fiche bien</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function KvRow({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.125 }}>
      <Typography sx={{
        fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, flex: 1,
      }}>{k}</Typography>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 13, fontWeight: 800,
        letterSpacing: '-0.005em',
      }}>{v}
        {sub && <Box component="span" sx={{ fontSize: 9.5, color: T.text3, ml: 0.375, fontWeight: 600 }}>{sub}</Box>}
      </Typography>
    </Stack>
  );
}

function LegendRow({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 0.375, fontSize: 10.5 }}>
      <Box sx={{
        width: 11, height: 11, borderRadius: '50%', bgcolor: color,
        border: dashed ? `1px dashed ${T.borderStrong}` : 'none',
      }} />
      <span>{label}</span>
    </Stack>
  );
}
