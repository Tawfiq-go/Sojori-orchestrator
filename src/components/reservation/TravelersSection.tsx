import { useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Avatar,
  Chip,
} from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import { type Traveler } from '../../data/mockReservations';

interface TravelersSectionProps {
  travelers: Traveler[];
  onUpdate: (travelers: Traveler[]) => void;
  maxTravelers?: number;
}

export function TravelersSection({ travelers, onUpdate, maxTravelers }: TravelersSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);

  const handleAdd = () => {
    setEditingTraveler(null);
    setModalOpen(true);
  };

  const handleEdit = (traveler: Traveler) => {
    setEditingTraveler(traveler);
    setModalOpen(true);
  };

  const handleDelete = (travelerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce voyageur ?')) {
      onUpdate(travelers.filter(t => t.id !== travelerId));
    }
  };

  const handleSave = (traveler: Traveler) => {
    if (editingTraveler) {
      // Update existing
      onUpdate(travelers.map(t => t.id === traveler.id ? traveler : t));
    } else {
      // Add new
      onUpdate([...travelers, traveler]);
    }
    setModalOpen(false);
  };

  const statusCounts = {
    COMPLETE: travelers.filter(t => t.status === 'COMPLETE').length,
    DRAFT: travelers.filter(t => t.status === 'DRAFT').length,
    NOT_REGISTERED: travelers.filter(t => t.status === 'NOT_REGISTERED').length,
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
            👥 Voyageurs ({travelers.length}{maxTravelers ? `/${maxTravelers}` : ''})
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <StatusBadge count={statusCounts.COMPLETE} label="Validés" color={t.success} />
            <StatusBadge count={statusCounts.DRAFT} label="Brouillons" color={t.warning} />
            <StatusBadge count={statusCounts.NOT_REGISTERED} label="Non inscrits" color={t.error} />
          </Stack>
        </Box>
        <Button
          onClick={handleAdd}
          disabled={maxTravelers ? travelers.length >= maxTravelers : false}
          sx={{
            textTransform: 'none',
            bgcolor: t.primary,
            color: '#fff',
            fontWeight: 600,
            px: 2,
            py: 1,
            '&:hover': { bgcolor: t.primaryDeep },
            '&:disabled': { bgcolor: t.bg3, color: t.text3 }
          }}
        >
          ➕ Ajouter voyageur
        </Button>
      </Stack>

      {/* Travelers list */}
      {travelers.length === 0 ? (
        <Box sx={{
          p: 4,
          textAlign: 'center',
          bgcolor: t.bg2,
          borderRadius: '12px',
          border: `1px dashed ${t.border}`,
        }}>
          <Typography sx={{ fontSize: 14, color: t.text3, mb: 2 }}>
            Aucun voyageur enregistré
          </Typography>
          <Button
            onClick={handleAdd}
            sx={{
              textTransform: 'none',
              color: t.primary,
              fontWeight: 600,
            }}
          >
            ➕ Ajouter le premier voyageur
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {travelers.map(traveler => (
            <TravelerCard
              key={traveler.id}
              traveler={traveler}
              onEdit={() => handleEdit(traveler)}
              onDelete={() => handleDelete(traveler.id)}
            />
          ))}
        </Stack>
      )}

      {/* Add/Edit Modal */}
      <TravelerModal
        open={modalOpen}
        traveler={editingTraveler}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </Box>
  );
}

// Status badge helper
function StatusBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ fontSize: 11, color: t.text3 }}>
        <strong>{count}</strong> {label}
      </Typography>
    </Box>
  );
}

// Traveler card
function TravelerCard({ traveler, onEdit, onDelete }: {
  traveler: Traveler;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    COMPLETE: { color: t.success, bg: t.successTint, label: '✅ Validé' },
    DRAFT: { color: t.warning, bg: t.warningTint, label: '📝 Brouillon' },
    NOT_REGISTERED: { color: t.error, bg: t.errorTint, label: '❌ Non inscrit' },
  };

  const status = statusConfig[traveler.status];

  return (
    <Box sx={{
      p: 2,
      bgcolor: t.bg1,
      border: `1px solid ${t.border}`,
      borderRadius: '12px',
      transition: 'all 0.2s',
      '&:hover': {
        boxShadow: '0 4px 12px rgba(26,20,8,0.08)',
        transform: 'translateY(-1px)',
      }
    }}>
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Avatar */}
        <Avatar sx={{
          width: 48,
          height: 48,
          bgcolor: status.bg,
          color: status.color,
          fontSize: 16,
          fontWeight: 700,
        }}>
          {traveler.firstName[0]}{traveler.lastName[0]}
        </Avatar>

        {/* Info */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {traveler.firstName} {traveler.lastName}
            </Typography>
            <Chip
              label={status.label}
              size="small"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                height: 20,
                bgcolor: status.bg,
                color: status.color,
                border: `1px solid ${status.color}`,
              }}
            />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ fontSize: 11, color: t.text3 }}>
            {traveler.nationality && (
              <span>🌍 {traveler.nationality}</span>
            )}
            {traveler.passportNumber && (
              <span>🛂 {traveler.passportNumber}</span>
            )}
            {traveler.dateOfBirth && (
              <span>
                🎂 {new Date(traveler.dateOfBirth).toLocaleDateString('fr-FR')}
                {' '}({calculateAge(traveler.dateOfBirth)} ans)
              </span>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={onEdit}
            sx={{
              color: t.text2,
              '&:hover': { bgcolor: t.bg2 }
            }}
          >
            ✏️
          </IconButton>
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{
              color: t.error,
              '&:hover': { bgcolor: t.errorTint }
            }}
          >
            🗑️
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

// Add/Edit Modal
function TravelerModal({ open, traveler, onClose, onSave }: {
  open: boolean;
  traveler: Traveler | null;
  onClose: () => void;
  onSave: (traveler: Traveler) => void;
}) {
  const [firstName, setFirstName] = useState(traveler?.firstName || '');
  const [lastName, setLastName] = useState(traveler?.lastName || '');
  const [nationality, setNationality] = useState(traveler?.nationality || '');
  const [passportNumber, setPassportNumber] = useState(traveler?.passportNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState(traveler?.dateOfBirth || '');
  const [status, setStatus] = useState<'COMPLETE' | 'DRAFT' | 'NOT_REGISTERED'>(traveler?.status || 'DRAFT');

  const handleSubmit = () => {
    if (!firstName || !lastName) {
      alert('Prénom et nom sont obligatoires');
      return;
    }

    const newTraveler: Traveler = {
      id: traveler?.id || `t-${Date.now()}`,
      firstName,
      lastName,
      nationality,
      passportNumber,
      dateOfBirth,
      status,
      passportPhoto: traveler?.passportPhoto,
    };

    onSave(newTraveler);
    resetForm();
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setNationality('');
    setPassportNumber('');
    setDateOfBirth('');
    setStatus('DRAFT');
  };

  // Load traveler data when modal opens
  useState(() => {
    if (traveler) {
      setFirstName(traveler.firstName);
      setLastName(traveler.lastName);
      setNationality(traveler.nationality);
      setPassportNumber(traveler.passportNumber);
      setDateOfBirth(traveler.dateOfBirth);
      setStatus(traveler.status);
    } else {
      resetForm();
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ pb: 2, borderBottom: `1px solid ${t.border}` }}>
        {traveler ? '✏️ Modifier le voyageur' : '➕ Ajouter un voyageur'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              required
              label="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <TextField
              fullWidth
              required
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Stack>

          <TextField
            fullWidth
            label="Nationalité"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Ex: France, USA, Morocco"
          />

          <TextField
            fullWidth
            label="Numéro de passeport"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            placeholder="Ex: P1234567"
          />

          <TextField
            fullWidth
            type="date"
            label="Date de naissance"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth>
            <InputLabel>Statut</InputLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)} label="Statut">
              <MenuItem value="COMPLETE">✅ Validé (passeport scanné + vérifié)</MenuItem>
              <MenuItem value="DRAFT">📝 Brouillon (en cours)</MenuItem>
              <MenuItem value="NOT_REGISTERED">❌ Non inscrit</MenuItem>
            </Select>
          </FormControl>

          {/* Upload passport photo (MOCK) */}
          <Box sx={{
            p: 2,
            bgcolor: t.bg2,
            borderRadius: '8px',
            border: `1px dashed ${t.border}`,
            textAlign: 'center',
          }}>
            <Typography sx={{ fontSize: 12, color: t.text3, mb: 1 }}>
              📸 Photo passeport (optionnel)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                fontSize: 12,
              }}
            >
              📁 Sélectionner fichier
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${t.border}`, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: t.text2,
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: t.primary,
            color: '#fff',
            fontWeight: 600,
            px: 3,
            '&:hover': { bgcolor: t.primaryDeep }
          }}
        >
          💾 {traveler ? 'Mettre à jour' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper function
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
