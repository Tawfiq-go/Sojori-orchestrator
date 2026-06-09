import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { TYPO } from './SHARED';

export type DeparturePreviewDraft = Record<string, unknown>;

type PreviewData = {
  message: string;
  reservation: {
    reservationNumber: string;
    guestFirstName: string;
    adults: number;
    nights: number;
  };
  listing: { name: string };
};

interface Props {
  listingId?: string;
  ownerId?: string;
  draft: DeparturePreviewDraft;
  title?: string;
}

export default function DepartureMessageLivePreview({
  listingId,
  ownerId,
  draft,
  title = 'Aperçu message voyageur',
}: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey = JSON.stringify(draft);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const canFetch = Boolean(listingId || ownerId);
    if (!canFetch) {
      setData(null);
      setError('Sélectionnez un listing ou un propriétaire pour l’aperçu.');
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = listingId
          ? await listingsService.postDepartureMessagePreview(listingId, draft)
          : await listingsService.postDepartureMessagePreviewByOwner(ownerId!, draft);
        if (payload && typeof payload === 'object' && 'message' in payload) {
          setData(payload as PreviewData);
        } else {
          setError('Aperçu indisponible');
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as Error)?.message ||
          'Aucune réservation trouvée pour cet aperçu';
        setError(msg);
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [listingId, ownerId, draftKey, draft]);

  const subtitle = data
    ? `Dernière résa · ${data.reservation.reservationNumber || '—'} · ${data.reservation.guestFirstName} · ${data.reservation.adults} adulte(s) · ${data.reservation.nights} nuit(s) · ${data.listing.name}`
    : 'Basé sur la dernière réservation confirmée';

  return (
    <Box sx={{ mt: 2 }}>
      <Typography sx={{ ...TYPO.bodyBold, fontSize: 13, mb: 0.25 }}>{title}</Typography>
      <Typography sx={{ ...TYPO.monoHelp, fontSize: 10.5, mb: 1 }}>{subtitle}</Typography>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          bgcolor: T.bg2,
          border: `1px dashed ${T.border}`,
          minHeight: 120,
          position: 'relative',
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} sx={{ color: T.primary }} />
          </Box>
        )}
        {!loading && error && (
          <Typography sx={{ fontSize: 12, color: T.text3, fontStyle: 'italic' }}>{error}</Typography>
        )}
        {!loading && data?.message && (
          <Typography
            sx={{
              ...TYPO.caption,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: T.text,
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.message}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
