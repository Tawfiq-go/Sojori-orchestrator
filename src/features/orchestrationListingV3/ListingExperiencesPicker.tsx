import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { partnersApi, type PartnerService } from '../../services/partnersApi';
import {
  fetchListingConciergeArrays,
  persistListingConciergeSlice,
} from '../listing/components/ConfigOrchestration/conciergeListingPersist';

type Props = {
  listingId: string;
  listingCityId?: string | null;
  /** Owner du listing (requis admin pour charger le catalogue PM). */
  listingOwnerId?: string | null;
  enabledIds: string[] | null | undefined;
  onSaved?: (ids: string[]) => void;
  /** Hauteur max de la grille (sidebar listing = plus haute). */
  maxHeight?: number;
  /**
   * Filtre catalogue : expériences J3 (hors transport/room_service),
   * ou plats Room Service uniquement.
   */
  kindFilter?: 'experience' | 'room_service' | 'villa_experience';
};

function money(n: number) {
  return Number(n || 0)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ');
}

/**
 * Picker listing : cartes 3/ligne + toggle Activer (own + marché forSale).
 * Opt-in strict — rien d’activé tant que non basculé + enregistré.
 */
export function ListingExperiencesPicker({
  listingId,
  listingCityId,
  listingOwnerId,
  enabledIds,
  onSaved,
  maxHeight = 560,
  kindFilter = 'experience',
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
      const byKind = list.filter((r) => {
        const k = r.kind || 'experience';
        if (kindFilter === 'room_service') return k === 'room_service';
        if (kindFilter === 'villa_experience') return k === 'villa_experience';
        return k !== 'room_service' && k !== 'transport' && k !== 'villa_experience';
      });
      setRows(byKind);
      const kindIdSet = new Set(byKind.map((r) => String(r.id)));
      if (enabledIds === undefined || enabledIds === null) {
        setSelected(new Set());
      } else {
        setSelected(new Set(enabledIds.map(String).filter((id) => kindIdSet.has(id))));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Catalogue expériences indisponible');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [listingCityId, listingOwnerId, enabledIds, kindFilter]);

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
      // Même champ enabledExperienceIds : fusionner avec l’autre kind pour ne pas l’écraser.
      const current = await fetchListingConciergeArrays(listingId);
      const prevIds = (current.enabledExperienceIds ?? []).map(String);
      const catalogIds = new Set(rows.map((r) => String(r.id)));
      const keptOther = prevIds.filter((id) => !catalogIds.has(id));
      const ids = [...keptOther, ...Array.from(selected)];
      await persistListingConciergeSlice(listingId, {
        enabledExperienceIds: ids,
        conciergeSource: 'own',
        conciergePartnerId: null,
      });
      onSaved?.(ids);
      const n = selected.size;
      const noun =
        kindFilter === 'room_service'
          ? n > 1
            ? 'plats Room Service'
            : 'plat Room Service'
          : kindFilter === 'villa_experience'
            ? n > 1
              ? 'ambiances en villa'
              : 'ambiance en villa'
            : n > 1
              ? 'expériences'
              : 'expérience';
      toast.success(
        n ? `${n} ${noun} actif${n > 1 ? 's' : ''} sur ce listing` : `Aucun ${noun} actif sur ce listing`,
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
        {kindFilter === 'room_service' ? (
          <>
            Aucun plat Room Service pour ce listing. Créez-en dans{' '}
            <b>Expériences → Catalogue</b> (type Room Service), puis activez-les ici.
          </>
        ) : (
          <>
            Aucune expérience pour la ville de ce listing. Créez les vôtres dans{' '}
            <b>Expériences → Catalogue</b>, ou activez des activités for sale du Marché puis
            activez-les ici.
          </>
        )}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
        {kindFilter === 'room_service' ? (
          <>
            Activez sur <b>ce listing</b> les plats Room Service visibles pour le guest. Le
            déclenchement WhatsApp se gère dans <b>Orchestration → Room Service</b>.
          </>
        ) : (
          <>
            Activez sur <b>ce listing</b> les expériences visibles pour le guest (vos activités +
            for sale). Rien n’est activé automatiquement.
          </>
        )}
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
          Actives {selected.size}/{rows.length}
          {filtered.length !== rows.length ? ` · filtre ${filtered.length}` : ''}
        </Typography>
        <Button size="small" onClick={toggleAllFiltered} sx={{ textTransform: 'none', fontSize: 11.5 }}>
          {allOn ? 'Tout désactiver (filtre)' : 'Tout activer (filtre)'}
        </Button>
      </Box>

      <Box
        sx={{
          maxHeight,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        {filtered.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', p: 1.5 }}>
            Aucun résultat pour ces filtres.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(6, 1fr)',
              },
              gap: 1,
            }}
          >
            {filtered.map((r) => {
              const prices = (r.formules || []).map((f) => Number(f.priceMad) || 0);
              const min = prices.length ? Math.min(...prices) : 0;
              const provider = r.providerName || (r.partnerId ? 'Sojori' : 'Mes expériences');
              const on = selected.has(r.id);
              const photo = Array.isArray(r.photos) ? r.photos.find(Boolean) : undefined;
              return (
                <Box
                  key={r.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: on ? 'warning.main' : 'divider',
                    bgcolor: on ? 'rgba(184, 133, 26, 0.06)' : 'background.paper',
                    overflow: 'hidden',
                    minHeight: 140,
                  }}
                >
                  {photo ? (
                    <Box
                      component="img"
                      src={photo}
                      alt=""
                      sx={{
                        width: '100%',
                        height: 72,
                        objectFit: 'cover',
                        display: 'block',
                        bgcolor: 'action.hover',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 72,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600 }}>
                        {r.category || 'Expérience'}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {r.title}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.35 }}>
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {provider}
                      </Box>
                      {r.category ? ` · ${r.category}` : ''}
                      {min > 0 ? ` · dès ${money(min)} MAD` : ''}
                    </Typography>

                    <Box
                      sx={{
                        mt: 'auto',
                        pt: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: on ? 'success.dark' : 'text.secondary',
                        }}
                      >
                        {on ? 'Activée' : 'Désactivée'}
                      </Typography>
                      <Switch
                        size="small"
                        checked={on}
                        onChange={() => toggle(r.id)}
                        inputProps={{ 'aria-label': on ? 'Désactiver' : 'Activer' }}
                        color="warning"
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 1.75, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="contained"
          disabled={saving}
          onClick={() => void save()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Enregistrer
        </Button>
      </Box>
    </Box>
  );
}

export default ListingExperiencesPicker;
