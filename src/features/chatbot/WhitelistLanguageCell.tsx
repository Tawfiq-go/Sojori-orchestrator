import { Box, Stack, Typography } from '@mui/material';
import { CHATBOT_T as T } from './chatbotTokens';

/** Libellé court langue réservation (OTA / guestLanguage). */
export function formatDefaultLanguageShort(guestLanguage?: string | null): string {
  const iso = String(guestLanguage ?? 'fr').slice(0, 2).toLowerCase();
  if (iso === 'en') return 'Ang';
  if (iso === 'es') return 'ES';
  if (iso === 'ar') return 'AR';
  return 'FR';
}

/** Libellé court langue choisie sur WhatsApp (FRA, ENG, …). */
export function formatWhatsAppLanguageShort(whatsappSelectedLanguage?: string | null): string | null {
  const code = String(whatsappSelectedLanguage ?? '').trim().toUpperCase();
  if (code === 'ENG') return 'Ang';
  if (code === 'FRA') return 'FR';
  if (code === 'ES') return 'ES';
  if (code === 'AR') return 'AR';
  return null;
}

type Props = {
  guestLanguage?: string | null;
  whatsappSelectedLanguage?: string | null;
  compact?: boolean;
};

/** Deux lignes : FR : Default · Ang : WhatsApp */
export default function WhitelistLanguageCell({
  guestLanguage,
  whatsappSelectedLanguage,
  compact = false,
}: Props) {
  const defCode = formatDefaultLanguageShort(guestLanguage);
  const waCode = formatWhatsAppLanguageShort(whatsappSelectedLanguage);
  const fontSize = compact ? 11 : 11.5;

  return (
    <Stack spacing={0.25}>
      <Typography sx={{ fontSize, fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap' }}>
        {defCode} :{' '}
        <Box component="span" sx={{ fontWeight: 500, color: T.text3 }}>
          Default
        </Box>
      </Typography>
      <Typography
        sx={{
          fontSize,
          fontWeight: 600,
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          color: waCode ? T.primaryDeep : T.text4,
        }}
      >
        {waCode ?? '—'} :{' '}
        <Box component="span" sx={{ fontWeight: 500, color: waCode ? T.text3 : T.text4 }}>
          WhatsApp
        </Box>
      </Typography>
    </Stack>
  );
}
