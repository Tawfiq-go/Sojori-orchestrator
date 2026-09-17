// Lecture seule — Espace voyageurs (Party) sur la fiche résa.
import { Box, Chip, Stack, Typography, Paper } from '@mui/material';

const T = {
  primary: '#b8851a',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  bg: '#fafaf7',
  ok: '#0a8f5e',
  warn: '#c46506',
  mut: '#7a756c',
};

type CapMode = 'self' | 'proxy' | 'none';

type GuestParty = {
  version?: number;
  principalSlot?: number;
  groups?: Array<{ id: string; name: string }>;
  memberships?: Array<{ slot: number; groupId: string; role: 'chef' | 'member' }>;
  capabilities?: Array<{ slot: number; key: string; mode: CapMode }>;
  phones?: Array<{ slot: number; waE164: string; status: string }>;
  updatedAt?: string;
};

const MODE_LABEL: Record<CapMode, string> = {
  self: 'Fait seul',
  proxy: 'Chef le fait',
  none: 'Pas d’accès',
};

const KEY_LABEL: Record<string, string> = {
  checkin: 'Check-in',
  breakfast: 'Petit-déj',
  experiences: 'Expériences',
  access: 'Accès',
  wifi: 'WiFi',
};

function modeColor(mode: CapMode): string {
  if (mode === 'self') return T.ok;
  if (mode === 'proxy') return T.warn;
  return T.mut;
}

export function GuestPartySection({
  guestParty,
  adults,
}: {
  guestParty?: GuestParty | null;
  adults?: number;
}) {
  if (!guestParty || !Array.isArray(guestParty.groups) || guestParty.groups.length === 0) {
    const multi = (Number(adults) || 0) >= 2;
    if (!multi) return null;
    return (
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2, bgcolor: T.bg, border: `1px solid ${T.border}`, borderRadius: 2 }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 650, color: T.text }}>
          Espace voyageurs
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: T.text3, mt: 0.5, lineHeight: 1.5 }}>
          Pas encore déclaré sur WhatsApp. Le voyageur principal peut ouvrir « Voyageurs » dans
          le menu pour nommer les groupes et définir qui fait quoi.
        </Typography>
      </Paper>
    );
  }

  const groups = guestParty.groups;
  const memberships = guestParty.memberships || [];
  const capabilities = guestParty.capabilities || [];
  const phones = guestParty.phones || [];
  const slots = [...new Set(memberships.map((m) => m.slot))].sort((a, b) => a - b);

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, mb: 2, bgcolor: T.bg, border: `1px solid ${T.border}`, borderRadius: 2 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 650, color: T.text }}>
          Espace voyageurs
        </Typography>
        <Chip
          size="small"
          label={`Principal · V${(guestParty.principalSlot ?? 0) + 1}`}
          sx={{ bgcolor: 'rgba(184,133,26,0.12)', color: T.primary, fontWeight: 650, fontSize: 11 }}
        />
      </Stack>

      <Stack spacing={1.25} sx={{ mb: 1.5 }}>
        {groups.map((g) => {
          const members = memberships.filter((m) => m.groupId === g.id);
          const chef = members.find((m) => m.role === 'chef');
          return (
            <Box key={g.id}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                {g.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.text2 }}>
                Chef : Voyageur {(chef?.slot ?? 0) + 1}
                {' · '}
                {members.map((m) => `V${m.slot + 1}`).join(', ')}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 0.75, letterSpacing: 0.4 }}>
        DROITS PAR VOYAGEUR
      </Typography>
      <Stack spacing={0.75}>
        {slots.map((slot) => {
          const caps = capabilities.filter((c) => c.slot === slot);
          const phone = phones.find((p) => p.slot === slot);
          return (
            <Box
              key={slot}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                alignItems: 'center',
                py: 0.5,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, minWidth: 88 }}>
                Voyageur {slot + 1}
              </Typography>
              {(['checkin', 'breakfast', 'experiences', 'access', 'wifi'] as const).map((key) => {
                const mode = (caps.find((c) => c.key === key)?.mode || 'self') as CapMode;
                return (
                  <Chip
                    key={key}
                    size="small"
                    label={`${KEY_LABEL[key]} · ${MODE_LABEL[mode]}`}
                    sx={{
                      fontSize: 10.5,
                      height: 22,
                      bgcolor: 'transparent',
                      border: `1px solid ${modeColor(mode)}33`,
                      color: modeColor(mode),
                    }}
                  />
                );
              })}
              {phone && (
                <Chip
                  size="small"
                  label={`WA ·${phone.waE164.slice(-4)} (${phone.status})`}
                  sx={{ fontSize: 10.5, height: 22 }}
                />
              )}
            </Box>
          );
        })}
      </Stack>

      {guestParty.updatedAt && (
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
          Mis à jour {new Date(guestParty.updatedAt).toLocaleString('fr-FR')}
        </Typography>
      )}
    </Paper>
  );
}
