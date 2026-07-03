import { Box, Stack, Typography } from '@mui/material';
import type { MenuOptionInterpretation } from './whatsappMenuAvailability';
import { CHATBOT_T as T } from './chatbotTokens';

const DOT: Record<'green' | 'red' | 'yellow', string> = {
  green: T.success,
  red: T.error,
  yellow: T.warning,
};

const RING: Record<'green' | 'red' | 'yellow', string> = {
  green: 'rgba(10,143,94,0.15)',
  red: 'rgba(200,30,30,0.12)',
  yellow: 'rgba(196,101,6,0.14)',
};

function OptionRow({ row }: { row: MenuOptionInterpretation }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '52px 1fr' },
        gap: { xs: 0.5, sm: 1.25 },
        py: 1.25,
        px: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: RING[row.listColor],
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center',  minWidth: 52 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: DOT[row.listColor],
            flexShrink: 0,
            boxShadow: `0 0 0 3px ${RING[row.listColor]}`,
          }}
        />
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 15,
            fontWeight: 800,
            color: T.text,
            lineHeight: 1,
          }}
        >
          {row.code}
        </Typography>
      </Stack>

      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: T.text, mb: 0.35 }}>
          {row.label}
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.45 }}>
          <Box component="span" sx={{ fontWeight: 700, color: T.text3 }}>
            Config :
          </Box>{' '}
          {row.configRule}
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: DOT[row.listColor], mt: 0.5, lineHeight: 1.45 }}>
          {row.situation}
        </Typography>
        {row.situationDetail && (
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.35, lineHeight: 1.4 }}>
            {row.situationDetail}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function WhatsappMenuInterpretationPanel({
  options,
  listingName,
  guestLabel,
  checkInLabel,
  checkOutLabel,
}: {
  options: MenuOptionInterpretation[];
  listingName?: string;
  guestLabel?: string;
  checkInLabel?: string;
  checkOutLabel?: string;
}) {
  const counts = {
    green: options.filter((o) => o.listColor === 'green').length,
    yellow: options.filter((o) => o.listColor === 'yellow').length,
    red: options.filter((o) => o.listColor === 'red').length,
  };

  return (
    <Box>
      {(listingName || guestLabel) && (
        <Box sx={{ mb: 1.5, p: 1.25, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
          {listingName && (
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text }}>{listingName}</Typography>
          )}
          {guestLabel && (
            <Typography sx={{ fontSize: 12.5, color: T.text2, mt: 0.25 }}>{guestLabel}</Typography>
          )}
          {(checkInLabel || checkOutLabel) && (
            <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
              {checkInLabel && `Arrivée ${checkInLabel}`}
              {checkInLabel && checkOutLabel ? ' · ' : ''}
              {checkOutLabel && `Départ ${checkOutLabel}`}
            </Typography>
          )}
        </Box>
      )}

      <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap',  mb: 1.5 }}>
        <LegendDot color="green" label={`${counts.green} actives`} />
        <LegendDot color="yellow" label={`${counts.yellow} condition / bientôt`} />
        <LegendDot color="red" label={`${counts.red} inactives`} />
      </Stack>

      <Stack spacing={1}>
        {options.map((row) => (
          <OptionRow key={row.code} row={row} />
        ))}
      </Stack>

      {options.length === 0 && (
        <Typography sx={{ fontSize: 13, color: T.text3, fontStyle: 'italic', py: 2, textAlign: 'center' }}>
          Aucune option menu — synchronisez le snapshot listing (Config Orch.)
        </Typography>
      )}
    </Box>
  );
}

function LegendDot({ color, label }: { color: 'green' | 'red' | 'yellow'; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DOT[color] }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: T.text2 }}>{label}</Typography>
    </Stack>
  );
}

/** Pastilles compactes pour la liste (A…L) */
export function WhatsappMenuDots({
  options,
  onClick,
  loading,
}: {
  options: MenuOptionInterpretation[];
  onClick?: () => void;
  loading?: boolean;
}) {
  if (loading) {
    return <Typography sx={{ fontSize: 11, color: T.text3 }}>…</Typography>;
  }

  if (!options.length) {
    return (
      <Typography sx={{ fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
        Pas de config
      </Typography>
    );
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.35,
        alignItems: 'center',
        border: 'none',
        bgcolor: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        p: 0.25,
        borderRadius: 1,
        '&:hover': onClick ? { bgcolor: T.primaryTint } : undefined,
      }}
    >
      {options.map((o) => (
        <Box
          key={o.code}
          title={`${o.code} — ${o.situation}`}
          sx={{
            width: 22,
            height: 22,
            borderRadius: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9.5,
            fontWeight: 800,
            fontFamily: '"Geist Mono", monospace',
            color: '#fff',
            bgcolor: DOT[o.listColor],
          }}
        >
          {o.code.length <= 2 ? o.code : o.code.charAt(0)}
        </Box>
      ))}
    </Box>
  );
}
