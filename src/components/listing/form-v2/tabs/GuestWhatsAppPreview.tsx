import { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, MenuItem, Select, Typography } from '@mui/material';
import { fetchGuestPreview, type GuestPreview } from '../../../../services/guestPreviewApi';
import { FOCUS_CODES, type GuestPreviewFocus, doorSummary } from './guestPreviewText';
import { extractHttpErrorMessage } from '../../../../utils/extractHttpErrorMessage';

type Props = {
  listingId: string;
  focus: GuestPreviewFocus;
  /** Hôtel : types de chambre à simuler (cadence ménage). */
  roomTypes?: Array<{ id: string; name: string }>;
  /** Rechargé quand cette valeur change (après un Enregistrer). */
  refreshKey?: number | string;
};

/**
 * « 💬 Ce que le voyageur voit » — la liste du menu telle que le chatbot l'envoie,
 * la ligne de cette rubrique mise en avant, et l'état de la porte en une phrase.
 * Lecture seule, calculée par srv-fullchatbot sur un voyageur fictif.
 */
export function GuestWhatsAppPreview({ listingId, focus, roomTypes = [], refreshKey }: Props) {
  const [preview, setPreview] = useState<GuestPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [roomTypeId, setRoomTypeId] = useState<string>('');
  const [phase, setPhase] = useState<'pre_arrival' | 'in_stay'>('pre_arrival');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchGuestPreview(listingId, { lang, roomTypeId: roomTypeId || undefined, phase });
      setPreview(p);
    } catch (e) {
      setPreview(null);
      setError(extractHttpErrorMessage(e, 'Aperçu indisponible'));
    } finally {
      setLoading(false);
    }
  }, [listingId, lang, roomTypeId, phase]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const focusCodes = new Set(FOCUS_CODES[focus]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
        <Select size="small" value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'en')} sx={{ fontSize: 12.5 }}>
          <MenuItem value="fr">Français</MenuItem>
          <MenuItem value="en">English</MenuItem>
        </Select>
        <Select
          size="small"
          value={phase}
          onChange={(e) => setPhase(e.target.value as 'pre_arrival' | 'in_stay')}
          sx={{ fontSize: 12.5 }}
        >
          <MenuItem value="pre_arrival">Avant l’arrivée</MenuItem>
          <MenuItem value="in_stay">Pendant le séjour</MenuItem>
        </Select>
        {roomTypes.length ? (
          <Select
            size="small"
            displayEmpty
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(String(e.target.value))}
            sx={{ fontSize: 12.5, minWidth: 160 }}
          >
            <MenuItem value="">Type de chambre : hôtel</MenuItem>
            {roomTypes.map((rt) => (
              <MenuItem key={rt.id} value={rt.id}>
                {rt.name}
              </MenuItem>
            ))}
          </Select>
        ) : null}
        <Button size="small" onClick={() => void load()} disabled={loading} sx={{ textTransform: 'none' }}>
          Actualiser
        </Button>
      </Box>

      {loading && !preview ? (
        <CircularProgress size={18} />
      ) : error ? (
        <Typography sx={{ fontSize: 12.5, color: 'warning.dark' }}>{error}</Typography>
      ) : preview ? (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, alignItems: 'start' }}>
          <Box
            aria-label="Liste WhatsApp Menu Sojori"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '16px',
              p: 1.25,
              bgcolor: '#ece5dd',
              fontSize: 12.5,
              lineHeight: 1.4,
            }}
          >
            <Box sx={{ bgcolor: '#fff', borderRadius: '10px', p: 1, mb: 0.75, boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{preview.menu.header}</Typography>
              <Typography sx={{ fontSize: 12.5 }}>{preview.menu.body}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>{preview.menu.footer}</Typography>
              <Typography sx={{ fontSize: 12.5, color: '#0f6e63', fontWeight: 700, textAlign: 'center', mt: 0.75 }}>
                ▤ {preview.menu.button}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#fff', borderRadius: '10px', overflow: 'hidden' }}>
              {preview.menu.rows.map((r) => {
                const hot = focusCodes.has(r.code);
                return (
                  <Box
                    key={r.id}
                    data-code={r.code}
                    data-hot={hot ? 'true' : 'false'}
                    sx={{
                      px: 1,
                      py: 0.6,
                      borderBottom: '1px solid #eee',
                      bgcolor: hot ? 'rgba(15,110,99,0.10)' : 'transparent',
                      outline: hot ? '1px solid rgba(15,110,99,0.5)' : 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: hot ? 750 : 600 }}>{r.title}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{r.description}</Typography>
                  </Box>
                );
              })}
              {!preview.menu.rows.some((r) => focusCodes.has(r.code)) ? (
                <Typography sx={{ px: 1, py: 0.75, fontSize: 11.5, color: 'warning.dark' }}>
                  La ligne de cette rubrique n’apparaît pas dans le menu avec la configuration actuelle.
                </Typography>
              ) : null}
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Cette rubrique, vue du voyageur</Typography>
            {doorSummary(preview, focus).map((line) => (
              <Typography key={line} sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                {line}
              </Typography>
            ))}
            <Typography sx={{ mt: 1, fontSize: 11.5, color: 'text.secondary' }}>
              Calculé par le chatbot sur un voyageur fictif ({preview.phase === 'in_stay' ? 'pendant le séjour' : 'avant l’arrivée'}
              {roomTypeId ? `, ${roomTypes.find((r) => r.id === roomTypeId)?.name || 'type choisi'}` : ''}). Rien n’est envoyé.
            </Typography>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
