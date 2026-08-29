import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { isAxiosError } from 'axios';
import { getMenageBareme } from '../../services/fulltaskApi';
import { V3 } from './theme';
import {
  BAREME_LEVEL_LABELS,
  baremeScaleMax,
  baremeVerdict,
  resolveBaremeView,
  type BaremeRow,
  type BaremeViewState,
} from './menageBareme';

type Props = {
  listingId: string;
  /** État déjà chargé par le parent (évite un double fetch) — sinon le panneau charge seul. */
  view?: BaremeViewState | null;
};

const sectionSx = {
  border: `1px solid ${V3.b}`,
  borderRadius: '12px',
  bgcolor: V3.card,
  overflow: 'hidden',
};

/** Charge le barème ménage et résout l'état d'affichage (null = chargement). */
export function useMenageBareme(listingId: string | null): BaremeViewState | null {
  const [view, setView] = useState<BaremeViewState | null>(null);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    setView(null);
    (async () => {
      try {
        const body = await getMenageBareme(listingId);
        if (!cancelled) setView(resolveBaremeView({ ok: true, body }));
      } catch (e: unknown) {
        if (cancelled) return;
        const status = isAxiosError(e) ? (e.response?.status ?? null) : null;
        setView(resolveBaremeView({ ok: false, status }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return view;
}

/** Barème ménage — configuré vs réel 30 j (lecture seule). */
export default function V3MenageBaremePanel({ listingId, view: viewProp }: Props) {
  const ownView = useMenageBareme(viewProp === undefined ? listingId : null);
  const view = viewProp === undefined ? ownView : viewProp;

  const windowDays = view && 'windowDays' in view ? view.windowDays : 30;

  return (
    <Box sx={sectionSx}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${V3.b}`, bgcolor: V3.alt }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>
          Barème — configuré vs réel {windowDays} j
        </Typography>
        <Typography sx={{ fontSize: 11, color: V3.t3 }}>
          Durées configurées comparées aux ménages réellement effectués (lecture seule)
        </Typography>
      </Box>

      <Stack sx={{ px: 2, py: 1.5, gap: 0.75 }}>
        {view === null && (
          <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {view?.kind === 'unavailable' && (
          <Typography sx={{ fontSize: 12, color: V3.t3, py: 1.5, textAlign: 'center' }}>
            Barème disponible après la prochaine mise à jour.
          </Typography>
        )}

        {view?.kind === 'error' && (
          <Typography sx={{ fontSize: 12, color: V3.t3, py: 1.5, textAlign: 'center' }}>
            Barème indisponible pour le moment — réessayez plus tard.
          </Typography>
        )}

        {view?.kind === 'empty' && (
          <Typography sx={{ fontSize: 12, color: V3.t3, py: 1.5, textAlign: 'center' }}>
            Aucun ménage sur les {view.windowDays} derniers jours.
          </Typography>
        )}

        {view?.kind === 'rows' &&
          view.rows.map(row => (
            <BaremeRowView key={`${row.nature}-${row.level}`} row={row} />
          ))}

        {view?.kind === 'rows' && (
          <Typography sx={{ fontSize: 10.5, color: V3.t4, pt: 0.5, fontFamily: 'monospace' }}>
            barre = étendue réel min→max · trait plein = moyenne · trait doré = configuré
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function VerdictChip({ row }: { row: BaremeRow }) {
  const v = baremeVerdict(row);
  const base = {
    px: 1,
    py: '2px',
    borderRadius: '99px',
    fontSize: 10.5,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  } as const;
  if (v.kind === 'insufficient') {
    return <Box sx={{ ...base, bgcolor: V3.alt, color: V3.t4, border: `1px solid ${V3.b}` }}>Trop peu de données</Box>;
  }
  if (v.kind === 'no_data') {
    return <Box sx={{ ...base, bgcolor: V3.alt, color: V3.t4, border: `1px solid ${V3.b}` }}>—</Box>;
  }
  if (v.kind === 'juste') {
    return <Box sx={{ ...base, bgcolor: V3.taskT, color: V3.task }}>Juste</Box>;
  }
  const signed = `${v.deltaPct > 0 ? '+' : ''}${v.deltaPct} %`;
  if (v.kind === 'ecart') {
    return <Box sx={{ ...base, bgcolor: V3.pt, color: V3.pd, border: `1px solid ${V3.pt2}` }}>Écart {signed}</Box>;
  }
  return (
    <Box sx={{ ...base, bgcolor: V3.alt, color: V3.t3, border: `1px solid ${V3.b}` }}>
      Écart {signed} · à confirmer
    </Box>
  );
}

function BaremeRowView({ row }: { row: BaremeRow }) {
  const scale = baremeScaleMax(row);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scale) * 100))}%`;
  const hasRange = row.minRealMin != null && row.maxRealMin != null;

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: '10px',
        border: `1px solid ${V3.b}`,
        bgcolor: '#fff',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: V3.t }}>
          {row.label}
        </Typography>
        <Box
          sx={{
            px: 0.75,
            py: '1px',
            borderRadius: '99px',
            bgcolor: V3.alt,
            border: `1px solid ${V3.b}`,
            fontSize: 10,
            fontWeight: 700,
            color: V3.t3,
          }}
        >
          {BAREME_LEVEL_LABELS[row.level]}
        </Box>
        <Typography sx={{ fontSize: 10.5, color: V3.t4, fontFamily: 'monospace' }}>
          {row.count} ménage{row.count > 1 ? 's' : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: V3.t2, fontFamily: 'monospace' }}>
          {row.configuredMin != null ? `${row.configuredMin} min config.` : 'non configuré'}
          {row.avgRealMin != null ? ` · ${row.avgRealMin} min réel` : ''}
        </Typography>
        <VerdictChip row={row} />
      </Stack>

      <Box sx={{ position: 'relative', height: 14, borderRadius: '7px', bgcolor: V3.alt, overflow: 'hidden' }}>
        {hasRange && (
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              bottom: 3,
              left: pct(row.minRealMin as number),
              width: `calc(${pct(row.maxRealMin as number)} - ${pct(row.minRealMin as number)})`,
              minWidth: 2,
              borderRadius: '4px',
              bgcolor: V3.taskT,
              border: `1px solid ${V3.task}`,
            }}
          />
        )}
        {row.avgRealMin != null && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: pct(row.avgRealMin),
              width: 2,
              bgcolor: V3.task,
            }}
          />
        )}
        {row.configuredMin != null && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: pct(row.configuredMin),
              width: 2,
              bgcolor: V3.p,
            }}
          />
        )}
      </Box>
    </Box>
  );
}
