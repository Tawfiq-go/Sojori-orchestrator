import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { toast } from 'react-toastify';
import { MEDIA_GRID_THEME as T } from '../../../components/listing/upload/mediaGridConstants';
import {
  fetchPropertyTypes,
  syncPropertyTypesFromRu,
  type PropertyTypeRow,
} from '../api/listingMappingApi';

export function PropertyTypesMappingPanel() {
  const [rows, setRows] = useState<PropertyTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPropertyTypes());
    } catch (e: unknown) {
      toast.error(`Property types: ${String(e)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPropertyTypesFromRu();
      toast.success('Property types synchronisés depuis RU');
      await load();
    } catch (e: unknown) {
      toast.error(`Sync RU: ${String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: T.text }}>
            Property types RU
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            Mongo srv-listing · propertytypes — PropertyTypeID à l’import / publish RU
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
          disabled={syncing}
          onClick={() => void handleSync()}
          sx={{ textTransform: 'none' }}
        >
          Sync RU
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID RU</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>manageRoomType</TableCell>
                <TableCell>Mongo _id</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{row.rentalPropertyTypeId ?? '—'}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.manageRoomType ? 'oui' : 'non'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row._id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default PropertyTypesMappingPanel;
