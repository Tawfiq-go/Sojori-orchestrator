import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';
import { ExtraCatalogTable } from './ExtraCatalogTable';
import { fetchExtraStats, importExtrasFromPms, type ExtraCatalogStats } from './extrasApi';

function formatWhen(iso: string | null): string {
  if (!iso) return 'jamais';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR');
}

export function TasksExtrasConfigPage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [stats, setStats] = useState<ExtraCatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      setStats(await fetchExtraStats({ ownerId }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ownerId]);

  const onImport = async () => {
    if (needsOwnerPick) {
      toast.error('Sélectionnez un propriétaire PM dans la barre du haut.');
      return;
    }
    setImporting(true);
    try {
      const result = await importExtrasFromPms({ ownerId });
      toast.success(
        `Import Mews : ${result.total} produits (${result.minibar} mini-bar), ${result.categoriesCreated} catégories ledger.`,
      );
      await load();
      setReloadToken((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setImporting(false);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Task', 'Extra', 'Configuration']}>
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          Catalogue hôtel uniquement : copie les produits Mews (prix, TVA, ventes). Ça ne remplit
          jamais les frigos. Pour pousser le par dans les villas, ouvrir Liste extra.
        </Typography>
        {needsOwnerPick ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Sélectionnez un propriétaire PM pour importer les catégories ledger.
          </Alert>
        ) : null}
        {loading && !stats ? (
          <Typography variant="body2">Chargement…</Typography>
        ) : null}
        {stats ? (
          <Box component="ul" sx={{ pl: 2, mb: 2, lineHeight: 1.9 }}>
            <li>
              Produits en base : <strong>{stats.total}</strong> (actifs {stats.active})
            </li>
            <li>
              Mini-bar actifs : <strong>{stats.minibar}</strong>
            </li>
            <li>Dernier import : {formatWhen(stats.lastImportedAt)}</li>
          </Box>
        ) : null}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" disabled={importing} onClick={() => void onImport()}>
            {importing ? 'Import Mews…' : 'Importer depuis Mews'}
          </Button>
        </Stack>
      </Paper>
      <ExtraCatalogTable ownerId={ownerId} reloadToken={reloadToken} allowApply={false} />
    </DashboardWrapper>
  );
}
