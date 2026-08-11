/**
 * Inbox Resa Proprio — mêmes échanges que Inbox Resa (n° Réservation),
 * filtrés sur l’allowlist whatsapp_owner_bookers du PM.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BookingWhatsAppTabV2 from './BookingWhatsAppTabV2';
import * as fulltaskApi from '../../services/fulltaskApi';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useAuth } from '../../hooks/useAuth';
import { resolveTasksUserScope } from '../../services/fulltaskTasksService';
import { normalizeOwnerId } from '../../utils/fulltaskMappers';

type BookerRow = {
  whatsappPhone?: string;
  enabled?: boolean;
  banned?: boolean;
};

export default function OwnerBookingInboxTab() {
  const { user } = useAuth();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const ownerId = useMemo(
    () =>
      normalizeOwnerId(requestOwnerId) ||
      (scope.canAccessAllOwners ? undefined : normalizeOwnerId(scope.ownerId)) ||
      undefined,
    [requestOwnerId, scope],
  );

  const [phones, setPhones] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAllowlist = useCallback(async () => {
    if (!scopeFetchReady) return;
    if (!ownerId && scope.canAccessAllOwners) {
      // Admin sans filtre owner : on ne peut pas filtrer → liste vide + hint
      setPhones([]);
      setError('Sélectionnez un propriétaire (PM) pour voir ses bookers.');
      return;
    }
    if (!ownerId) {
      setPhones([]);
      return;
    }
    try {
      setError(null);
      const res = await fulltaskApi.listOwnerBookers({ ownerId });
      const rows = (res?.data || res || []) as BookerRow[];
      const list = (Array.isArray(rows) ? rows : [])
        .filter((b) => b.enabled !== false && !b.banned)
        .map((b) => String(b.whatsappPhone || '').replace(/\D/g, ''))
        .filter((p) => p.length >= 8);
      setPhones([...new Set(list)]);
    } catch {
      setPhones([]);
      setError('Impossible de charger l’allowlist Resa Proprio.');
    }
  }, [ownerId, scope.canAccessAllOwners, scopeFetchReady]);

  useEffect(() => {
    void loadAllowlist();
  }, [loadAllowlist]);

  if (phones === null) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Chargement allowlist…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          bgcolor: 'rgba(15,118,110,0.06)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          N° Réservation (+212 669-742611) · {phones.length} booker(s)
        </Typography>
        {error ? (
          <Typography variant="caption" color="warning.main">
            {error}
          </Typography>
        ) : null}
        <Button
          component={RouterLink}
          to="/communications/owner-booking"
          size="small"
          variant="outlined"
          sx={{ ml: 'auto', textTransform: 'none' }}
        >
          Gérer les numéros
        </Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <BookingWhatsAppTabV2
          phoneAllowlist={phones}
          emptyHint={
            phones.length
              ? 'Aucun échange encore pour ces bookers sur la ligne Réservation.'
              : 'Ajoutez un numéro dans Allowlist Resa Proprio pour voir les échanges.'
          }
        />
      </Box>
    </Box>
  );
}
