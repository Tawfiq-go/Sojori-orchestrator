import { Box, Button, MenuItem, Select, Typography } from '@mui/material';
import { V3 } from './theme';

export type V3ScopeMode = 'template' | 'listing';

type ListingPick = { id: string; name: string };

type Props = {
  scope: V3ScopeMode;
  onScopeChange: (s: V3ScopeMode) => void;
  listings: ListingPick[];
  listingId: string | null;
  onListingChange: (id: string) => void;
  listingCount?: number;
  saving?: boolean;
  onSave: () => void;
};

export default function V3Header({
  scope,
  onScopeChange,
  listings,
  listingId,
  onListingChange,
  listingCount,
  saving,
  onSave,
}: Props) {
  const listing = listings.find(l => l.id === listingId);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        bgcolor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: `1px solid ${V3.b}`,
        px: 3,
        py: '11px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.125 }}>
        <Box
          sx={{
            width: 31,
            height: 31,
            borderRadius: '9px',
            background: `linear-gradient(135deg,${V3.ps},${V3.pd})`,
            color: '#1a1408',
            fontWeight: 800,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(184,133,26,0.30)',
          }}
        >
          S
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 14.5, letterSpacing: '-0.02em' }}>
          Sojori
          <Box
            component="span"
            sx={{
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: 8.5,
              color: V3.t3,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              ml: 0.75,
            }}
          >
            Orchestration · listing
          </Box>
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'inline-flex',
          bgcolor: V3.bg,
          border: `1px solid ${V3.b}`,
          borderRadius: '9px',
          p: '3px',
          gap: '1px',
          ml: 0.75,
        }}
      >
        {(
          [
            ['template', '◆', 'Template PM'],
            ['listing', '🏠', 'Par listing'],
          ] as const
        ).map(([id, ic, label]) => (
          <Button
            key={id}
            onClick={() => onScopeChange(id)}
            sx={{
              px: 1.625,
              py: '7px',
              borderRadius: '6px',
              fontSize: 12,
              fontWeight: 700,
              color: scope === id ? V3.t : V3.t3,
              bgcolor: scope === id ? V3.card : 'transparent',
              boxShadow: scope === id ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
              minWidth: 0,
              textTransform: 'none',
            }}
          >
            <span style={{ marginRight: 7 }}>{ic}</span>
            {label}
          </Button>
        ))}
      </Box>

      {scope === 'listing' && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.125,
            px: 1.5,
            py: '6px',
            bgcolor: V3.card,
            border: `1px solid ${V3.b}`,
            borderRadius: '9px',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '7px',
              bgcolor: V3.pt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
            }}
          >
            🏠
          </Box>
          <Select
            value={listingId ?? ''}
            onChange={e => onListingChange(String(e.target.value))}
            variant="standard"
            disableUnderline
            sx={{ fontSize: 12.5, fontWeight: 600, minWidth: 160 }}
          >
            {listings.map(l => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
          <Typography sx={{ color: V3.t3, fontSize: 9 }}>▾</Typography>
        </Box>
      )}

      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {listingCount != null && listingCount > 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.875,
              px: 1.375,
              py: '6px',
              bgcolor: V3.clientT,
              color: V3.client,
              borderRadius: '99px',
              fontFamily: '"Geist Mono", ui-monospace, monospace',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.03em',
              '&::before': { content: '"⇄"', fontSize: 12 },
            }}
          >
            SYNC TEMPLATE → {listingCount} LISTINGS
          </Box>
        )}
        <Button
          onClick={onSave}
          disabled={saving}
          sx={{
            px: 2.25,
            py: '9px',
            background: `linear-gradient(180deg,#cb9b2c,${V3.p})`,
            color: '#1a1408',
            borderRadius: '9px',
            fontSize: 12.5,
            fontWeight: 800,
            textTransform: 'none',
            boxShadow: '0 1px 2px rgba(135,97,25,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            '&:hover': { background: `linear-gradient(180deg,#cb9b2c,${V3.p})`, opacity: 0.92 },
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
}
