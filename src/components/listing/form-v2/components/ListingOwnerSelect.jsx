/**
 * Affectation propriétaire — visible admin / super-admin uniquement (parité legacy ChannelManager).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField, Typography } from '@mui/material';
import { useAuth } from '../../../../hooks/useAuth';
import { hasAdminAccess } from '../../../../utils/rbac.utils';
import { getOwnersAllPages } from '../../../../services/teamDashboardApi';
import { getOwnerListLabel } from '../../../../utils/ownerDisplay.utils';
import { isMongoObjectId } from '../../../../utils/listingId';
import { Card, Field, sxInput } from '../tabs/_shared';

export default function ListingOwnerSelect({ values = {}, onChange }) {
  const { user } = useAuth();
  const isAdmin = hasAdminAccess(user?.role);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    setLoading(true);
    void getOwnersAllPages({ search_text: '' })
      .then((rows) => {
        if (!cancelled) setOwners(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOwners([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const ownerId = String(values.ownerId || values.owner?._id || '').trim();

  const selected = useMemo(() => {
    if (!ownerId) return null;
    const fromList = owners.find((o) => String(o?._id ?? o?.id) === ownerId);
    if (fromList) return fromList;
    if (values.owner && typeof values.owner === 'object' && String(values.owner._id ?? '') === ownerId) {
      return values.owner;
    }
    return null;
  }, [ownerId, owners, values.owner]);

  const handleChange = useCallback(
    (_, option) => {
      if (!option) {
        onChange?.({ ownerId: null, owner: null });
        return;
      }
      const id = String(option._id ?? option.id ?? '');
      onChange?.({
        ownerId: id || null,
        owner: {
          _id: id,
          firstName: option.firstName,
          lastName: option.lastName,
          email: option.email ?? option.email_addresses?.[0]?.email_address,
        },
      });
    },
    [onChange],
  );

  if (!isAdmin) return null;

  return (
    <Card
      title="👤 Propriétaire"
      meta="Admin · compte PM lié au listing (RU, villes, orchestration)"
    >
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
        Requis pour publier vers Rentals United et pour le mapping ville / devise dans{' '}
        <strong>Localisation</strong>.
      </Typography>
      <Field label="Propriétaire (Owner)" required>
        <Autocomplete
          size="small"
          openOnFocus
          autoHighlight
          loading={loading}
          options={owners}
          value={selected}
          onChange={handleChange}
          isOptionEqualToValue={(a, b) =>
            String(a?._id ?? a?.id ?? '') === String(b?._id ?? b?.id ?? '')
          }
          getOptionLabel={(o) => (o ? getOwnerListLabel(o) : '') || '—'}
          noOptionsText={loading ? 'Chargement…' : 'Aucun propriétaire'}
          loadingText="Chargement des propriétaires…"
          slotProps={{ listbox: { style: { maxHeight: 360 } } }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Rechercher un propriétaire…"
              sx={sxInput}
            />
          )}
        />
      </Field>
      {ownerId && !isMongoObjectId(ownerId) && (
        <Typography sx={{ fontSize: 11, color: 'warning.main', mt: 1 }}>
          Identifiant propriétaire invalide — sélectionnez un compte dans la liste.
        </Typography>
      )}
    </Card>
  );
}
