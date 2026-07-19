import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

export type ApplyListingOption = { id: string; name: string; active: boolean; ownerId?: string };

type Props = {
  open: boolean;
  listings: ApplyListingOption[];
  loading?: boolean;
  applying?: boolean;
  onClose: () => void;
  /** Applique toujours à la liste d’IDs résolue (actives / toutes / cochées). */
  onApply: (listingIds: string[]) => Promise<void>;
};

type Scope = 'active' | 'all';
type Mode = 'all' | 'selected';

/**
 * Owner / PM : appliquer le modèle orchestration — actives seulement ou tout le parc.
 */
export default function ApplyOwnerModelToListingsDialog({
  open,
  listings,
  loading = false,
  applying = false,
  onClose,
  onApply,
}: Props) {
  const [scope, setScope] = useState<Scope>('active');
  const [mode, setMode] = useState<Mode>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeCount = useMemo(() => listings.filter((l) => l.active).length, [listings]);
  const inactiveCount = listings.length - activeCount;

  const visible = useMemo(
    () => (scope === 'active' ? listings.filter((l) => l.active) : listings),
    [listings, scope],
  );

  useEffect(() => {
    if (!open) return;
    setScope('active');
    setMode('all');
    setSelectedIds(listings.filter((l) => l.active).map((l) => l.id));
  }, [open, listings]);

  useEffect(() => {
    if (!open) return;
    // Quand on change de périmètre, resynchroniser la sélection sur le visible.
    setSelectedIds(visible.map((l) => l.id));
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps -- reset sélection au changement de scope

  const allSelected = visible.length > 0 && selectedIds.length === visible.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < visible.length;

  const targetIds = mode === 'all' ? visible.map((l) => l.id) : selectedIds;

  const canSubmit = useMemo(() => {
    if (applying || loading || visible.length === 0) return false;
    return targetIds.length > 0;
  }, [applying, loading, visible.length, targetIds.length]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAllVisible = () => {
    setSelectedIds(allSelected ? [] : visible.map((l) => l.id));
  };

  const submit = async () => {
    try {
      await onApply(targetIds);
      onClose();
    } catch {
      /* toast déjà affiché ; garder la modale ouverte */
    }
  };

  return (
    <Dialog open={open} onClose={applying ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
        Appliquer le modèle aux listings
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
          Copie le modèle orchestration vers les annonces choisies (flows, timing, relances, rappels
          staff, escalades, messages).
        </Typography>

        <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary', mb: 0.5 }}>
          PÉRIMÈTRE
        </Typography>
        <RadioGroup
          value={scope}
          onChange={(_, v) => setScope(v as Scope)}
          sx={{ mb: 1.5 }}
        >
          <FormControlLabel
            value="active"
            control={<Radio size="small" />}
            label={`Annonces actives uniquement (${activeCount})`}
          />
          <FormControlLabel
            value="all"
            control={<Radio size="small" />}
            label={`Toutes les annonces — actives + inactives (${listings.length}${
              inactiveCount > 0 ? ` · ${inactiveCount} inactive${inactiveCount > 1 ? 's' : ''}` : ''
            })`}
          />
        </RadioGroup>

        {visible.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'warning.main' }}>
            {scope === 'active'
              ? 'Aucune annonce active pour ce compte.'
              : 'Aucune annonce trouvée pour ce compte.'}
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary', mb: 0.5 }}>
              CIBLE
            </Typography>
            <RadioGroup value={mode} onChange={(_, v) => setMode(v as Mode)} sx={{ mb: 1 }}>
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label={
                  scope === 'active'
                    ? `Toutes les actives affichées (${visible.length})`
                    : `Toutes les annonces affichées (${visible.length})`
                }
              />
              <FormControlLabel
                value="selected"
                control={<Radio size="small" />}
                label="Sélectionner dans la liste"
              />
            </RadioGroup>

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
                <List dense disablePadding>
                  {mode === 'selected' && (
                    <ListItem disablePadding>
                      <ListItemButton onClick={toggleAllVisible} dense>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary="Tout cocher / décocher (liste affichée)"
                          primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  )}
                  {visible.map((l) => {
                    const checked = selectedIds.includes(l.id);
                    return (
                      <ListItem key={l.id} disablePadding>
                        <ListItemButton
                          onClick={mode === 'selected' ? () => toggleOne(l.id) : undefined}
                          dense
                          disabled={mode !== 'selected'}
                        >
                          {mode === 'selected' && (
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Checkbox
                                edge="start"
                                size="small"
                                checked={checked}
                                tabIndex={-1}
                                disableRipple
                              />
                            </ListItemIcon>
                          )}
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <span>{l.name}</span>
                                <Chip
                                  label={l.active ? 'Active' : 'Inactive'}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    bgcolor: l.active ? 'rgba(10,143,94,0.12)' : 'rgba(0,0,0,0.06)',
                                    color: l.active ? '#0a8f5e' : 'text.secondary',
                                  }}
                                />
                              </Box>
                            }
                            secondary={l.id}
                            primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                            secondaryTypographyProps={{ fontSize: 11 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={applying} sx={{ textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!canSubmit}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {applying
            ? 'Application…'
            : `Appliquer à ${targetIds.length} annonce${targetIds.length > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
