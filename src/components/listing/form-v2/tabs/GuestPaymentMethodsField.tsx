import { Box, Typography } from '@mui/material';

export type GuestPaymentMethod = 'cash' | 'card' | 'card_tpe' | 'room_charge';

const OPTIONS: Array<{ id: GuestPaymentMethod; label: string; hint: string }> = [
  { id: 'cash', label: '💵 Cash', hint: 'Espèces à la livraison' },
  { id: 'card_tpe', label: '💳 Carte (TPE)', hint: 'Terminal apporté à la livraison' },
  { id: 'room_charge', label: '🏨 Sur la note', hint: 'À régler à la réception au départ' },
  { id: 'card', label: '🔗 Carte en ligne', hint: 'Lien sécurisé + acompte 30 %' },
];

const ALLOWED = new Set<GuestPaymentMethod>(['cash', 'card', 'card_tpe', 'room_charge']);

export function normalizeGuestPaymentMethods(raw: unknown): GuestPaymentMethod[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: GuestPaymentMethod[] = [];
  for (const item of list) {
    const id = String(item ?? '').trim().toLowerCase() as GuestPaymentMethod;
    if (ALLOWED.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

type Props = {
  value: unknown;
  busy?: boolean;
  onChange: (next: GuestPaymentMethod[]) => void;
};

/** Modes extras guest — Options séjour, Navette, Service, Expériences, Courses, Prolonger. */
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
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>
        💳 Comment souhaitez-vous payer ?
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
        Modes proposés au voyageur (Options séjour, Navette, Service, Expériences, Courses,
        Prolonger). Carte en ligne = lien + acompte (défaut 30 % sur l’activité).
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: on ? 'warning.main' : 'divider',
                bgcolor: on ? 'rgba(184, 133, 26, 0.12)' : 'background.paper',
                color: on ? 'warning.dark' : 'text.secondary',
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
                textAlign: 'left',
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</Typography>
              <Typography sx={{ fontSize: 11.5, opacity: 0.85 }}>{opt.hint}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
