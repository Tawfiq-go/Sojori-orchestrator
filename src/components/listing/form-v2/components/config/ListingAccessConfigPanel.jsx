import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { Card, Field, sxInput } from '../../tabs/_shared';
import {
  useCreateListingAccess,
  useListingAccess,
  useUpdateListingAccess,
} from '../../hooks/useListingConfigHooks';
import { menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';

const DEFAULT_INSTRUCTIONS = [
  { id: 'parking', title: 'Parking', description: { enabled: false, value: '' }, code: { enabled: false, value: '' } },
  { id: 'building', title: 'Immeuble', description: { enabled: false, value: '' }, code: { enabled: false, value: '' } },
  { id: 'apartment', title: 'Appartement', description: { enabled: false, value: '' }, code: { enabled: false, value: '' } },
];

export default function ListingAccessConfigPanel({ listingId, listingName }) {
  const { data, isLoading, error, refetch } = useListingAccess(listingId);
  const updateMutation = useUpdateListingAccess();
  const createMutation = useCreateListingAccess();

  const isNotFound = Boolean(error?.notFound);
  const [form, setForm] = useState({
    listingId,
    listingName: listingName || '',
    receptionMode: { type: 'automatic' },
    instructions: DEFAULT_INSTRUCTIONS,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        listingId,
        listingName: data.listingName || listingName || '',
        receptionMode: data.receptionMode || { type: 'automatic' },
        instructions: data.instructions?.length ? data.instructions : DEFAULT_INSTRUCTIONS,
      });
      setDirty(false);
    }
  }, [data, listingId, listingName]);

  const handleSave = async () => {
    try {
      if (isNotFound || !data?._id) {
        await createMutation.mutateAsync(form);
      } else {
        await updateMutation.mutateAsync({ listingId, data: form });
      }
      toast.success('Accès enregistré');
      setDirty(false);
      refetch();
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  };

  const upd = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  if (!listingId) return <Alert severity="info">Enregistrez le listing d&apos;abord.</Alert>;
  if (isLoading && !data && !isNotFound) {
    return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={32} /></Box>;
  }
  if (error && !isNotFound) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Box>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
        Instructions d&apos;accès {listingName ? `· ${listingName}` : ''}
      </Typography>

      <Card title="Mode d'accueil" meta="receptionMode">
        <FormControl size="small" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={form.receptionMode?.type || 'automatic'}
            onChange={(e) => upd({ receptionMode: { type: e.target.value } })}
            sx={sxInput}
          >
            <MenuItem value="automatic">Automatique</MenuItem>
            <MenuItem value="physical">Accueil physique</MenuItem>
            <MenuItem value="lockbox">Lockbox</MenuItem>
            <MenuItem value="keypad">Code clavier</MenuItem>
          </Select>
        </FormControl>
      </Card>

      {(form.instructions || []).map((step, i) => (
        <Card key={step.id || i} title={step.title || `Étape ${i + 1}`}>
          <Field label="Description (FR)">
            <TextField
              size="small"
              fullWidth
              multiline
              rows={3}
              value={step.description?.value || ''}
              onChange={(e) => {
                const instructions = [...form.instructions];
                instructions[i] = {
                  ...instructions[i],
                  description: { enabled: true, value: e.target.value },
                };
                upd({ instructions });
              }}
              sx={sxInput}
            />
          </Field>
          <Field label="Code d'accès (optionnel)">
            <TextField
              size="small"
              fullWidth
              value={step.code?.value || ''}
              onChange={(e) => {
                const instructions = [...form.instructions];
                instructions[i] = {
                  ...instructions[i],
                  code: { enabled: Boolean(e.target.value), value: e.target.value },
                };
                upd({ instructions });
              }}
              sx={sxInput}
            />
          </Field>
        </Card>
      ))}

      <Stack direction="row" sx={{ mt: 2, justifyContent: 'flex-end' }}>
        <Button variant="contained" disabled={!dirty || updateMutation.isPending} onClick={handleSave} sx={menuBtnPrimary}>
          {updateMutation.isPending || createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </Stack>
    </Box>
  );
}
