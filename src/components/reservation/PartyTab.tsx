import { Box, Stack, Typography, Paper, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

const T = {
  primary: '#b8851a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  info: '#0673b3',
};

const CAP_LABEL: Record<string, string> = {
  checkin: 'Check-in',
  breakfast: 'Petit-déj',
  experiences: 'Expériences',
  access: 'Accès',
  wifi: 'WiFi',
};

const MODE_LABEL: Record<string, { label: string; color: string }> = {
  self: { label: 'Seul', color: T.info },
  proxy: { label: 'Chef le fait', color: T.primary },
  none: { label: 'Sans accès', color: T.text3 },
};

type GuestParty = {
  principalSlot?: number;
  groups?: Array<{ id: string; name: string }>;
  memberships?: Array<{ slot: number; groupId: string; role: 'chef' | 'member' }>;
  capabilities?: Array<{ slot: number; key: string; mode: string }>;
  phones?: Array<{ slot: number; waE164: string }>;
  updatedAt?: string;
};

function memberName(reservationDetails: Record<string, unknown>, slot: number): string {
  const gr = reservationDetails.guestRegistration as
    | { members?: Array<Record<string, unknown>> }
    | undefined;
  const m = gr?.members?.[slot];
  const first = String(m?.first_name ?? m?.firstName ?? '').trim();
  const last = String(m?.last_name ?? m?.lastName ?? '').trim();
  const name = `${first} ${last}`.trim();
  return name || `Voyageur ${slot + 1}`;
}

function slotCountOf(reservationDetails: Record<string, unknown>): number {
  const gr = reservationDetails.guestRegistration as
    | { nbre_guest_to_register?: number }
    | undefined;
  const n = Number(gr?.nbre_guest_to_register ?? reservationDetails.adults ?? 1);
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

export function PartyTab({ reservationDetails }: { reservationDetails: Record<string, unknown> }) {
  const party = (reservationDetails.guestParty ?? null) as GuestParty | null;
  const groups = party?.groups ?? [];
  const memberships = party?.memberships ?? [];
  const capabilities = party?.capabilities ?? [];
  const phones = party?.phones ?? [];
  const configured = groups.length > 0 || capabilities.length > 0;
  const slotCount = slotCountOf(reservationDetails);
  const slots = Array.from({ length: slotCount }, (_, i) => i);
  const capKeys = ['checkin', 'breakfast', 'experiences', 'access', 'wifi'];

  if (!configured) {
    return (
      <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg1 }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Espace voyageurs</Typography>
        <Typography sx={{ color: T.text2, fontSize: 14 }}>
          Le voyageur principal n’a pas encore déclaré les groupes ni qui fait quoi. Les slots
          d’enregistrement (fiches 1…{slotCount}) restent inchangés.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg1 }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 0.5 }}>Espace voyageurs</Typography>
        <Typography sx={{ color: T.text3, fontSize: 13 }}>
          Lecture seule — le voyageur principal déclare groupes et droits depuis WhatsApp.
          {party?.updatedAt ? ` Dernière MAJ ${new Date(party.updatedAt).toLocaleString('fr-FR')}.` : ''}
        </Typography>
      </Paper>

      {groups.map((g) => {
        const members = memberships.filter((m) => m.groupId === g.id);
        const chef = members.find((m) => m.role === 'chef');
        return (
          <Paper
            key={g.id}
            elevation={0}
            sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg2 }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, color: T.text }}>{g.name}</Typography>
              {chef ? (
                <Chip
                  size="small"
                  label={`Chef · ${memberName(reservationDetails, chef.slot)}`}
                  sx={{ bgcolor: T.primaryTint, color: T.primary, fontWeight: 600 }}
                />
              ) : null}
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {members.map((m) => (
                <Chip
                  key={`${g.id}-${m.slot}`}
                  size="small"
                  variant="outlined"
                  label={memberName(reservationDetails, m.slot)}
                />
              ))}
            </Stack>
          </Paper>
        );
      })}

      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg1, overflow: 'auto' }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 1 }}>Droits par voyageur</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Voyageur</TableCell>
              {capKeys.map((k) => (
                <TableCell key={k} sx={{ fontWeight: 700 }}>
                  {CAP_LABEL[k] ?? k}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((slot) => (
              <TableRow key={slot}>
                <TableCell>
                  {memberName(reservationDetails, slot)}
                  {slot === party?.principalSlot ? (
                    <Typography component="span" sx={{ color: T.text3, fontSize: 12 }}>
                      {' '}
                      · principal
                    </Typography>
                  ) : null}
                </TableCell>
                {capKeys.map((key) => {
                  const mode = capabilities.find((c) => c.slot === slot && c.key === key)?.mode ?? '—';
                  const meta = MODE_LABEL[mode];
                  return (
                    <TableCell key={key}>
                      {meta ? (
                        <Chip size="small" label={meta.label} sx={{ color: meta.color, fontWeight: 600 }} />
                      ) : (
                        mode
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 2, bgcolor: T.bg2 }}>
        <Typography sx={{ fontWeight: 700, color: T.text, mb: 0.75 }}>WhatsApp par slot (phase 2)</Typography>
        <Typography sx={{ color: T.text3, fontSize: 13, mb: 1 }}>
          Un numéro peut être noté ici. Aujourd’hui la whitelist reste unique par résa — un 2e chat
          indépendant n’est pas encore ouvert.
        </Typography>
        <Stack spacing={0.5}>
          {slots.map((slot) => {
            const phone = phones.find((p) => p.slot === slot)?.waE164;
            return (
              <Box key={slot} sx={{ display: 'flex', gap: 1, fontSize: 13, color: T.text2 }}>
                <span>{memberName(reservationDetails, slot)}</span>
                <span>{phone || '—'}</span>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}
