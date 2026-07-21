import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { T } from '../_tokens';
import type { CompRow } from './CompsTable';

function airbnbListingUrl(id: string | null | undefined): string | null {
  const s = String(id ?? '').trim();
  if (!/^\d{5,20}$/.test(s)) return null;
  return `https://www.airbnb.fr/rooms/${s}`;
}

function fmtMad(n: number): string {
  if (!n || n <= 0) return '—';
  return `${n.toLocaleString('fr-FR')} MAD`;
}

function fmtPct(n: number): string {
  if (n <= 0) return '—';
  return `${Math.round(n * 100)} %`;
}

function deltaPct(self: number, other: number): string | null {
  if (self <= 0 || other <= 0) return null;
  const d = Math.round(((self - other) / other) * 100);
  if (d === 0) return '=';
  return `${d > 0 ? '+' : ''}${d} %`;
}

function deltaPts(self: number, other: number): string | null {
  if (self <= 0 || other <= 0) return null;
  const d = Math.round(self * 100) - Math.round(other * 100);
  if (d === 0) return '=';
  return `${d > 0 ? '+' : ''}${d} pts`;
}

type RowDef = {
  label: string;
  self: string;
  comp: string;
  delta?: string | null;
  highlight?: 'good' | 'warn';
};

function buildRows(self: CompRow, comp: CompRow): RowDef[] {
  const adrDelta = deltaPct(self.adrTtm, comp.adrTtm);
  const occDelta = deltaPts(self.occupancyTtm, comp.occupancyTtm);
  const revDelta = deltaPct(self.revenueTtm, comp.revenueTtm);
  const ratingDelta =
    self.rating > 0 && comp.rating > 0
      ? `${self.rating >= comp.rating ? '+' : ''}${(self.rating - comp.rating).toFixed(2)}`
      : null;

  return [
    {
      label: 'Note · avis',
      self:
        self.rating > 0
          ? `★ ${self.rating.toFixed(2)} · ${self.reviews} avis`
          : '—',
      comp: `★ ${comp.rating.toFixed(2)} · ${comp.reviews} avis`,
      delta: ratingDelta,
    },
    {
      label: 'Chambres · lits · sdb · pers.',
      self: [self.bedrooms, self.beds, self.baths, self.guests]
        .map((v) => (v != null && v !== 0 ? String(v) : '—'))
        .join(' · '),
      comp: [comp.bedrooms, comp.beds, comp.baths, comp.guests]
        .map((v) => (v != null && v !== 0 ? String(v) : '—'))
        .join(' · '),
    },
    {
      label: 'Superhost',
      self: self.superhost == null ? '—' : self.superhost ? 'oui' : 'non',
      comp: comp.superhost == null ? '—' : comp.superhost ? 'oui' : 'non',
    },
    {
      label: 'ADR TTM',
      self: fmtMad(self.adrTtm),
      comp: fmtMad(comp.adrTtm),
      delta: adrDelta,
      highlight:
        self.adrTtm > 0 && comp.adrTtm > 0
          ? self.adrTtm >= comp.adrTtm
            ? 'good'
            : 'warn'
          : undefined,
    },
    {
      label: 'Occupation TTM',
      self: fmtPct(self.occupancyTtm),
      comp: fmtPct(comp.occupancyTtm),
      delta: occDelta,
      highlight:
        self.occupancyTtm > 0 && comp.occupancyTtm > 0
          ? self.occupancyTtm >= comp.occupancyTtm
            ? 'good'
            : 'warn'
          : undefined,
    },
    {
      label: 'RevPAR TTM',
      self: self.revparTtm ? fmtMad(self.revparTtm) : '—',
      comp: comp.revparTtm ? fmtMad(comp.revparTtm) : '—',
    },
    {
      label: 'Revenu TTM (12 mois)',
      self: fmtMad(self.revenueTtm),
      comp: fmtMad(comp.revenueTtm),
      delta: revDelta,
      highlight:
        self.revenueTtm > 0 && comp.revenueTtm > 0
          ? self.revenueTtm >= comp.revenueTtm
            ? 'good'
            : 'warn'
          : undefined,
    },
  ];
}

export interface CompCompareModalProps {
  open: boolean;
  self: CompRow | null;
  comp: CompRow | null;
  selfSourceHint?: string;
  onClose: () => void;
}

export default function CompCompareModal({
  open,
  self,
  comp,
  selfSourceHint,
  onClose,
}: CompCompareModalProps) {
  if (!self || !comp) return null;

  const rows = buildRows(self, comp);
  const compUrl = airbnbListingUrl(comp.airbnbListingId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 17, pb: 1 }}>
        Comparer · votre bien vs concurrent
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: T.goldTint,
              border: `1px solid ${T.gold}`,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.goldDeep, mb: 0.5 }}>
              VOTRE BIEN
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{self.name}</Typography>
            {selfSourceHint ? (
              <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.5 }}>{selfSourceHint}</Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: T.bg2,
              border: `1px solid ${T.border}`,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3, mb: 0.5 }}>
              CONCURRENT · {comp.distanceMeters != null ? `${Math.round(comp.distanceMeters)} m` : '—'}
            </Typography>
            <Typography sx={{ fontWeight: 700 }}>{comp.name}</Typography>
            {compUrl ? (
              <Box
                component="a"
                href={compUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: 10, color: T.goldDeep, fontWeight: 700, mt: 0.5, display: 'inline-block' }}
              >
                ↗ Voir sur Airbnb
              </Box>
            ) : null}
          </Box>
        </Stack>

        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <Box component="thead">
            <Box component="tr">
              <Th>Indicateur</Th>
              <Th>Vous</Th>
              <Th>Concurrent</Th>
              <Th>Δ</Th>
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((r) => (
              <Box component="tr" key={r.label}>
                <Td muted>{r.label}</Td>
                <Td bold={!!r.highlight}>{r.self}</Td>
                <Td>{r.comp}</Td>
                <Td
                  mono
                  color={
                    r.delta?.startsWith('+')
                      ? T.success
                      : r.delta?.startsWith('-')
                        ? T.error
                        : T.text3
                  }
                >
                  {r.delta ?? '—'}
                </Td>
              </Box>
            ))}
          </Box>
        </Box>

        <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 2, lineHeight: 1.5 }}>
          Données snapshot comps (AirROI) · 0 $ API supplémentaire · pas de scrape Airbnb direct.
          Pour photos / équipements détaillés, ouvrez l’annonce Airbnb.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        {compUrl ? (
          <Button
            component="a"
            href={compUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ouvrir Airbnb
          </Button>
        ) : null}
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: T.goldDeep, textTransform: 'none' }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="th"
      sx={{
        textAlign: 'left',
        p: '8px 10px',
        fontSize: 10,
        fontWeight: 800,
        color: T.text3,
        textTransform: 'uppercase',
        borderBottom: `1px solid ${T.border}`,
        bgcolor: T.bg2,
      }}
    >
      {children}
    </Box>
  );
}

function Td({
  children,
  mono,
  muted,
  bold,
  color,
}: {
  children: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Box
      component="td"
      sx={{
        p: '10px',
        borderBottom: `1px solid ${T.border}`,
        fontFamily: mono ? '"Geist Mono", monospace' : undefined,
        fontSize: mono ? 11.5 : 12.5,
        color: color ?? (muted ? T.text3 : T.text),
        fontWeight: bold ? 700 : 400,
      }}
    >
      {children}
    </Box>
  );
}
