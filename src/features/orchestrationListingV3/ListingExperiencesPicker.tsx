import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { partnersApi, type PartnerService } from '../../services/partnersApi';
import { persistListingConciergeSlice } from '../listing/components/ConfigOrchestration/conciergeListingPersist';

type Props = {
  listingId: string;
  listingCityId?: string | null;
  /** Owner du listing (requis admin pour charger le catalogue PM). */
  listingOwnerId?: string | null;
  enabledIds: string[] | null | undefined;
  onSaved?: (ids: string[]) => void;
  /** Hauteur max de la liste (sidebar listing = plus haute). */
  maxHeight?: number;
};

function money(n: number) {
  return Number(n || 0)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ');
}

/**
 * Picker listing unifié : catalogue PM + Sojori, filtre provider / catégorie.
 * Plus de bascule « Source Sojori vs PM ».
 */
export function ListingExperiencesPicker({
  listingId,
  listingCityId,
  listingOwnerId,
  enabledIds,
  onSaved,
  maxHeight = 480,
}: Props) {
  const [rows, setRows] = useState<PartnerService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await partnersApi.listExperienceCatalog({
        scope: 'all',
        cityId: listingCityId || undefined,
        ownerId: listingOwnerId || undefined,
      });
      setRows(list);
      if (enabledIds === undefined || enabledIds === null) {
        setSelected(new Set(list.map((r) => r.id)));
      } else {
        setSelected(new Set(enabledIds.map(String)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Catalogue expériences indisponible');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [listingCityId, listingOwnerId, enabledIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const id = r.providerId || (r.partnerId ? String(r.partnerId) : `owner:${r.ownerId || ''}`);
      const name = r.providerName || (r.partnerId ? 'Sojori' : 'Mes expériences');
      map.set(id, name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rows]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const pid = r.providerId || (r.partnerId ? String(r.partnerId) : `owner:${r.ownerId || ''}`);
      if (providerFilter !== 'all' && pid !== providerFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (!needle) return true;
      const hay = `${r.title} ${r.category} ${r.providerName || ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, providerFilter, categoryFilter, q]);

  const allIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) {
        for (const id of allIds) next.delete(id);
      } else {
        for (const id of allIds) next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const ids = Array.from(selected);
      await persistListingConciergeSlice(listingId, {
        enabledExperienceIds: ids,
        conciergeSource: 'own',
        conciergePartnerId: null,
      });
      onSaved?.(ids);
      toast.success(
        ids.length
          ? `${ids.length} expérience${ids.length > 1 ? 's' : ''} active${ids.length > 1 ? 's' : ''} sur ce listing`
          : 'Aucune expérience active sur ce listing',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.55 }}>
        Aucune expérience pour la ville de ce listing. Créez-les dans{' '}
        <b>Expériences → Catalogue</b>, ou activez le catalogue Sojori (Admin).
      </Typography>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
        Cochez les expériences à activer sur ce listing. Le guest les verra en <b>J → Expériences</b>
        (Transport et Courses restent dans le hub J).
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 1,
          mb: 1.25,
        }}
      >
        <TextField
          select
          size="small"
          label="Provider"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <MenuItem value="all">Tous les providers</MenuItem>
          {providers.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Catégorie"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <MenuItem value="all">Toutes les catégories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Rechercher"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titre, catégorie…"
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
          Activer sur ce listing ({selected.size}/{rows.length}
          {filtered.length !== rows.length ? ` · filtre ${filtered.length}` : ''})
        </Typography>
        <Button size="small" onClick={toggleAllFiltered} sx={{ textTransform: 'none', fontSize: 11.5 }}>
          {allOn ? 'Tout décocher (filtre)' : 'Tout cocher (filtre)'}
        </Button>
      </Box>

      <Box
        sx={{
          maxHeight,
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          px: 1,
          py: 0.5,
          bgcolor: 'background.paper',
        }}
      >
        {filtered.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', p: 1.5 }}>
            Aucun résultat pour ces filtres.
          </Typography>
        ) : (
          filtered.map((r) => {
            const prices = (r.formules || []).map((f) => Number(f.priceMad) || 0);
            const min = prices.length ? Math.min(...prices) : 0;
            const provider = r.providerName || (r.partnerId ? 'Sojori' : 'Mes expériences');
            return (
              <FormControlLabel
                key={r.id}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                }
                label={
                  <Box sx={{ py: 0.4 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 650, lineHeight: 1.25 }}>
                      {r.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {provider}
                      </Box>
                      {r.category ? ` · ${r.category}` : ''}
                      {min > 0 ? ` · dès ${money(min)} MAD` : ''}
                    </Typography>
                  </Box>
                }
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  m: 0,
                  py: 0.45,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                  width: '100%',
                }}
              />
            );
          })
        )}
      </Box>

      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          disabled={saving}
          onClick={() => void save()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Enregistrer la sélection
        </Button>
      </Box>
    </Box>
  );
}

export default ListingExperiencesPicker;
