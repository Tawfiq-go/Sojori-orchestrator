import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Divider,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { useAdminView } from '../../hooks/useAdminView';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { getOwners } from '../../services/teamDashboardApi';
import { getOwnerListLabel } from '../../utils/ownerDisplay.utils';
import { autocompleteOptionLiProps } from '../../utils/autocompleteOptionLiProps';
import type { AdminSidebarMode } from '../../utils/pmSimulationSession';
import { tokens as t } from './dashboardTokens';

/**
 * « La vue » (2026-09-03) — le seul contrôle admin de la topbar.
 *
 * Remplace la bannière ambre de la simulation PM et le sélecteur central
 * « Tous / un PM ». Un chip discret à gauche de l'engrenage : gris sur la
 * plateforme, doré avec les initiales quand un owner est sélectionné. Le
 * popover choisit l'owner et la sidebar (owner, admin, les deux).
 *
 * Tout ce qui se passe derrière est inchangé : startSimulation / stopSimulation
 * (audit serveur start / stop / page_view / heartbeat) et le scope des appels API.
 */

type OwnerRow = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  fillCompany?: { companyName?: string };
};

const PLATFORM = { __platform: true as const, _id: '' };
type Option = OwnerRow | typeof PLATFORM;

function isPlatform(o: Option | null): o is typeof PLATFORM {
  return Boolean(o && (o as typeof PLATFORM).__platform);
}

function ownerRowId(o: OwnerRow | null | undefined): string {
  if (!o) return '';
  return String(o._id ?? o.id ?? '').trim();
}

function initialsOf(label: string): string {
  const parts = label.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIDEBAR_LABELS: Record<AdminSidebarMode, string> = {
  owner: 'Owner',
  admin: 'Admin',
  both: 'Les deux',
};

export function AdminViewChip() {
  const {
    canSimulate,
    isActive,
    snapshot,
    startSimulation,
    stopSimulation,
    sidebarMode,
    setSidebarMode,
  } = useAdminView();
  const { resetAdminScope } = useAdminOwnerFilter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  // Texte du champ contrôlé : MUI remet sinon le libellé de la valeur
  // sélectionnée à chaque rafraîchissement des options (chaque frappe).
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchor);

  const fetchOwners = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = (await getOwners({
        page: 0,
        limit: 60,
        deleted: false,
        banned: false,
        search_text: q.trim(),
      })) as { data?: OwnerRow[] };
      const rows = Array.isArray(res?.data) ? res.data : [];
      setOptions(
        rows
          .filter((o) => ownerRowId(o))
          .sort((a, b) =>
            getOwnerListLabel(a).localeCompare(getOwnerListLabel(b), 'fr', { sensitivity: 'base' }),
          ),
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void fetchOwners(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, search, fetchOwners]);

  const openPopover = useCallback((el: HTMLElement) => {
    // Champ vide à l'ouverture : on tape directement le nom cherché.
    setInputValue('');
    setSearch('');
    setAnchor(el);
  }, []);

  const currentOption = useMemo<Option>(() => {
    if (!isActive || !snapshot) return PLATFORM;
    return (
      options.find((o) => ownerRowId(o) === snapshot.ownerId) ?? {
        _id: snapshot.ownerId,
        firstName: snapshot.ownerLabel,
        email: snapshot.ownerEmail,
      }
    );
  }, [isActive, snapshot, options]);

  const choose = useCallback(
    (option: Option | null) => {
      const current = snapshot?.ownerId || '';
      if (!option || isPlatform(option)) {
        if (!current) {
          setAnchor(null);
          return;
        }
        stopSimulation();
        resetAdminScope();
      } else {
        const id = ownerRowId(option);
        if (!id || id === current) {
          setAnchor(null);
          return;
        }
        // Un seul état : l'owner sélectionné vit dans la simulation, le filtre
        // historique repasse sur « plateforme » pour ne pas garder deux vérités.
        resetAdminScope();
        startSimulation(id, { label: getOwnerListLabel(option), email: option.email });
      }
      setAnchor(null);
      // Rechargement complet, même URL : chaque page garde ses propres caches
      // (react-query, stores, hooks maison) et toutes ne réagissent pas au
      // changement de vue. Un reload garantit que TOUT ce qui est affiché
      // vient de la nouvelle identité. Le délai laisse partir l'audit start/stop.
      window.setTimeout(() => window.location.reload(), 400);
    },
    [snapshot?.ownerId, startSimulation, stopSimulation, resetAdminScope],
  );

  if (!canSimulate) return null;

  const label = isActive && snapshot ? snapshot.ownerLabel : 'Plateforme';
  const chipSx = isActive
    ? {
        border: `1px solid ${t.primaryDeep}`,
        bgcolor: t.primaryTint,
        color: t.text,
      }
    : {
        border: `1px solid ${t.border}`,
        bgcolor: 'transparent',
        color: t.text2,
      };

  return (
    <>
      <Tooltip
        title={
          isActive
            ? `Vue owner : ${label} · sidebar ${SIDEBAR_LABELS[sidebarMode].toLowerCase()}`
            : 'Vue plateforme · choisir un owner'
        }
      >
        <ButtonBase
          onClick={(e) => openPopover(e.currentTarget)}
          aria-label="Choisir la vue : owner et sidebar"
          aria-haspopup="dialog"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            height: 32,
            maxWidth: 220,
            px: 0.75,
            pr: 1,
            gap: 0.75,
            borderRadius: '9px',
            fontFamily: 'inherit',
            fontSize: 12.5,
            fontWeight: 600,
            transition: 'background-color .18s ease, border-color .18s ease',
            '&:hover': { bgcolor: isActive ? t.primaryTint : t.bg2 },
            ...chipSx,
          }}
        >
          {isActive ? (
            <Avatar
              sx={{
                width: 20,
                height: 20,
                fontSize: 9,
                fontWeight: 800,
                bgcolor: t.primaryDeep,
                color: '#fff',
              }}
            >
              {initialsOf(label)}
            </Avatar>
          ) : (
            <PublicOutlinedIcon sx={{ fontSize: 16, color: t.text3 }} />
          )}
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </Box>
          <ExpandMoreIcon sx={{ fontSize: 15, color: t.text3, flexShrink: 0 }} />
        </ButtonBase>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 320,
              p: 1.5,
              borderRadius: '12px',
              border: `1px solid ${t.border}`,
              boxShadow: '0 12px 40px rgba(20,17,10,0.12)',
            },
          },
        }}
      >
        <Typography sx={sectionLabelSx}>Je regarde</Typography>
        <Autocomplete<Option, false, true, false>
          autoHighlight
          disableClearable
          loading={loading}
          options={[PLATFORM, ...options]}
          value={currentOption}
          inputValue={inputValue}
          onChange={(_, option) => choose(option)}
          onInputChange={(_, next, reason) => {
            if (reason === 'input') {
              setInputValue(next);
              setSearch(next);
            } else if (reason === 'clear') {
              setInputValue('');
              setSearch('');
            }
          }}
          filterOptions={(rows) => rows}
          getOptionLabel={(o) => (isPlatform(o) ? 'Plateforme (tous les owners)' : getOwnerListLabel(o))}
          isOptionEqualToValue={(a, b) =>
            isPlatform(a) ? isPlatform(b) : !isPlatform(b) && ownerRowId(a) === ownerRowId(b)
          }
          noOptionsText={loading ? 'Chargement…' : 'Aucun owner'}
          size="small"
          slotProps={{ listbox: { style: { maxHeight: 280 } }, popper: { sx: { zIndex: 1500 } } }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={isActive && snapshot ? `${snapshot.ownerLabel} · changer d'owner…` : 'Rechercher un owner…'}
              autoFocus
            />
          )}
          renderOption={(props, option) => {
            const { key, liProps } = autocompleteOptionLiProps(props);
            if (isPlatform(option)) {
              return (
                <Box component="li" key={key ?? 'platform'} {...liProps} sx={{ py: 0.75, px: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PublicOutlinedIcon sx={{ fontSize: 16, color: t.text3 }} />
                    <Typography variant="body2" fontWeight={700}>
                      Plateforme (tous les owners)
                    </Typography>
                  </Stack>
                </Box>
              );
            }
            const secondary = [option.email, option.fillCompany?.companyName || option.companyName]
              .filter(Boolean)
              .join(' · ');
            return (
              <Box component="li" key={key ?? ownerRowId(option)} {...liProps} sx={{ py: 0.75, px: 1.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {getOwnerListLabel(option)}
                  </Typography>
                  {secondary ? (
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {secondary}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            );
          }}
        />

        <Typography sx={{ ...sectionLabelSx, mt: 1.5 }}>Sidebar</Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={sidebarMode}
          onChange={(_, next: AdminSidebarMode | null) => {
            if (next) setSidebarMode(next);
          }}
          aria-label="Sidebar affichée"
        >
          {(['owner', 'admin', 'both'] as AdminSidebarMode[]).map((mode) => (
            <ToggleButton key={mode} value={mode} sx={{ textTransform: 'none', fontSize: 12.5, py: 0.5 }}>
              {SIDEBAR_LABELS[mode]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12, color: t.text3 }}>
            {isActive ? 'Vue owner fidèle · journalisée' : 'Session admin · rien de journalisé'}
          </Typography>
          {isActive ? (
            <Button size="small" onClick={() => choose(PLATFORM)} sx={{ textTransform: 'none', fontSize: 12.5 }}>
              Quitter la vue
            </Button>
          ) : null}
        </Stack>
      </Popover>
    </>
  );
}

const sectionLabelSx = {
  fontFamily: 'Geist Mono, monospace',
  fontSize: 10.5,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: t.text3,
  mb: 0.75,
};
