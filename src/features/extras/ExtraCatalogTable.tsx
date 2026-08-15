import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { listExtras, patchExtra, type ExtraProduct } from './extrasApi';

export function ExtraCatalogTable({
  ownerId,
  rows,
  loading,
  onRowsChange,
}: {
  ownerId?: string | null;
  rows: ExtraProduct[];
  loading: boolean;
  onRowsChange: (rows: ExtraProduct[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [minibarOnly, setMinibarOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (minibarOnly && !r.isMinibar) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, minibarOnly]);

  const services = useMemo(() => {
    const s = new Set(filtered.map((r) => r.serviceName));
    return [...s].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [filtered]);

  const onToggleActive = async (row: ExtraProduct) => {
    setBusyId(row.productId);
    try {
      const next = await patchExtra(row.productId, { isActive: !row.isActive }, { ownerId });
      onRowsChange(rows.map((r) => (r.productId === next.productId ? next : r)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un extra…"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={minibarOnly}
              onChange={(e) => setMinibarOnly(e.target.checked)}
              size="small"
            />
          }
          label="Mini-bar uniquement"
        />
        <Typography variant="body2" color="text.secondary">
          {loading
            ? 'Chargement…'
            : `${filtered.length} / ${rows.length} extra${rows.length > 1 ? 's' : ''}`}
          {services.length ? ` · ${services.length} services` : ''}
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={() => {
            void listExtras({}, { ownerId }).then(onRowsChange).catch((e) => {
              toast.error(e instanceof Error ? e.message : 'Chargement impossible');
            });
          }}
        >
          Actualiser
        </Button>
      </Stack>
      <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Extra</TableCell>
              <TableCell align="right">Prix Mews</TableCell>
              <TableCell align="right">Prix effectif</TableCell>
              <TableCell align="center">Mini-bar</TableCell>
              <TableCell align="center">Actif</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.productId} sx={{ opacity: row.isActive ? 1 : 0.5 }}>
                <TableCell>{row.serviceName}</TableCell>
                <TableCell>
                  {row.label}
                  {row.missingFromPms ? (
                    <Typography component="span" sx={{ ml: 1, color: '#b45309', fontSize: 11 }}>
                      absent PMS
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell align="right">
                  {row.price} {row.currency}
                </TableCell>
                <TableCell align="right">
                  {row.effectivePrice} {row.currency}
                </TableCell>
                <TableCell align="center">{row.isMinibar ? 'oui' : '—'}</TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={row.isActive}
                    disabled={busyId === row.productId}
                    onChange={() => void onToggleActive(row)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}
