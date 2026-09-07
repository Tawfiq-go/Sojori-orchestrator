import { Box, Typography } from '@mui/material';

export type GuestPaymentMethod = 'cash' | 'card';

const OPTIONS: Array<{ id: GuestPaymentMethod; label: string }> = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Carte' },
];

export function normalizeGuestPaymentMethods(raw: unknown): GuestPaymentMethod[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: GuestPaymentMethod[] = [];
  for (const item of list) {
    const id = String(item ?? '').trim().toLowerCase();
    if ((id === 'cash' || id === 'card') && !out.includes(id)) out.push(id);
  }
  return out;
}

type Props = {
  value: unknown;
  busy?: boolean;
  onChange: (next: GuestPaymentMethod[]) => void;
};

/** Cash / Carte — extras guest (Options séjour, Navette, Service, Prolonger). */
export function GuestPaymentMethodsField({ value, busy, onChange }: Props) {
  const selected = normalizeGuestPaymentMethods(value);
  const shown = selected.length ? selected : (['cash'] as GuestPaymentMethod[]);

  const toggle = (id: GuestPaymentMethod) => {
    const has = shown.includes(id);
    const next = has ? shown.filter((x) => x !== id) : [...shown, id];
    onChange(next.length ? next : ['cash']);
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Paiement extras</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
        Cash et Carte pour Options séjour, Navette, Service, Expériences, Courses et Prolonger le séjour.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {OPTIONS.map((opt) => {
          const on = shown.includes(opt.id);
          return (
            <Box
              key={opt.id}
              component="button"
              type="button"
              disabled={busy}
              onClick={() => toggle(opt.id)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: on ? 'warning.main' : 'divider',
                bgcolor: on ? 'rgba(184, 133, 26, 0.12)' : 'background.paper',
                color: on ? 'warning.dark' : 'text.secondary',
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {opt.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
