import {
  Dialog,
  DialogContent,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Chip,
  Stack,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';
import type { Task } from '../../data/mockTasks';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit?: (task: Task) => void;
  onAssign?: (task: Task) => void;
}

// Helper pour formater les dates
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * TaskDetailsModal - Modal de visualisation complète d'une task
 *
 * Basé sur: sojori-dashboard/src/features/tasks/components/Calendar/DetailsTask.jsx
 *
 * Features:
 * - Affichage read-only de toutes les informations
 * - Sections organisées (Info principale, Dates, Affectation, Tarification, etc.)
 * - Badges de statut colorés
 * - Actions rapides (Edit, Assign)
 * - Design Aurora Soft Light
 */
export function TaskDetailsModal({
  open,
  onClose,
  task,
  onEdit,
  onAssign,
}: TaskDetailsModalProps) {
  if (!task) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    }
    onClose();
  };

  const handleAssign = () => {
    if (onAssign) {
      onAssign(task);
    }
    onClose();
  };

  const getStatusColor = (status: Task['status']) => {
    const map: Record<Task['status'], { bg: string; color: string; label: string }> = {
      'CREATED': { bg: t.infoTint, color: t.info, label: 'Créée' },
      'ASSIGNED': { bg: t.infoTint, color: t.info, label: 'Assignée' },
      'ACCEPTED': { bg: t.primaryTint, color: t.primary, label: 'Acceptée' },
      'IN_PROGRESS': { bg: t.warningTint, color: t.warning, label: 'En cours' },
      'COMPLETED': { bg: t.successTint, color: t.success, label: 'Complétée' },
      'CANCELLED_ADMIN': { bg: t.errorTint, color: t.error, label: 'Annulée' },
      'CANCELLED_CUSTOMER': { bg: t.errorTint, color: t.error, label: 'Annulée client' },
      'ARCHIVED': { bg: t.bg3, color: t.text3, label: 'Archivée' },
    };
    return map[status] || map['CREATED'];
  };

  const getPriorityColor = (priority: Task['priority']) => {
    const map: Record<Task['priority'], { bg: string; color: string }> = {
      'Normal': { bg: t.infoTint, color: t.info },
      'Urgent': { bg: t.warningTint, color: t.warning },
      'Critical': { bg: t.errorTint, color: t.error },
    };
    return map[priority] || map['Normal'];
  };

  const statusStyle = getStatusColor(task.status);
  const priorityStyle = getPriorityColor(task.priority);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            bgcolor: t.bg1,
            maxHeight: '90vh',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: t.bg2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.text, mb: 0.5 }}>
            {task.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
            {task.itemNumber}
          </Typography>
        </Box>

        {/* Status & Priority Badges */}
        <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
          <Chip
            label={statusStyle.label}
            size="small"
            sx={{
              bgcolor: statusStyle.bg,
              color: statusStyle.color,
              fontWeight: 600,
              fontSize: 11,
            }}
          />
          <Chip
            label={task.priority}
            size="small"
            sx={{
              bgcolor: priorityStyle.bg,
              color: priorityStyle.color,
              fontWeight: 600,
              fontSize: 11,
            }}
          />
        </Stack>

        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Section 1: Type & Origine */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <InfoIcon sx={{ color: t.primary }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>
                    Type de tâche
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                    {task.type} → {task.subType}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                  <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>
                    Origine
                  </Typography>
                  <Chip
                    label={task.origin === 'task' ? 'Tâche' : 'Client'}
                    size="small"
                    sx={{ fontSize: 11 }}
                  />
                </Box>
              </Stack>
            </Box>
          </Grid>

          {/* Section 2: Dates & Horaires */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
                height: '100%',
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CalendarIcon sx={{ fontSize: 18, color: t.primary }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    Dates & horaires
                  </Typography>
                </Stack>

                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                    Date de début
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.text }}>
                    {formatDate(task.startDate)}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                    Date de fin
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.text }}>
                    {formatDate(task.endDate)}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                    Horaires
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <ScheduleIcon sx={{ fontSize: 16, color: t.text3 }} />
                    <Typography sx={{ fontSize: 13, color: t.text }}>
                      {task.startHour} - {task.endHour}
                    </Typography>
                    <Chip
                      label={`${task.duration}h`}
                      size="small"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  </Stack>
                </Box>

                {task.createdAt && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                      Créée le
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: t.text3 }}>
                      {formatDateTime(task.createdAt)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Section 3: Affectation */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
                height: '100%',
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <PersonIcon sx={{ fontSize: 18, color: t.primary }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    Affectation
                  </Typography>
                </Stack>

                {task.staffName ? (
                  <>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: t.primary,
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {task.staffName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                          {task.staffName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: t.text3 }}>
                          Assigné
                        </Typography>
                      </Box>
                    </Stack>

                    <Box>
                      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                        Présence requise
                      </Typography>
                      <Chip
                        label={task.presence === 'Y' ? 'Présent' : 'Non présent'}
                        size="small"
                        sx={{
                          bgcolor: task.presence === 'Y' ? t.successTint : t.bg3,
                          color: task.presence === 'Y' ? t.success : t.text3,
                          fontSize: 11,
                        }}
                      />
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '8px',
                      bgcolor: t.warningTint,
                      border: `1px solid ${t.warning}`,
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 12, color: t.warning, fontWeight: 600 }}>
                      ⚠️ Non assignée
                    </Typography>
                    {onAssign && (
                      <Button
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={handleAssign}
                        sx={{ ...btnGhostSx, mt: 1, fontSize: 11 }}
                      >
                        Assigner maintenant
                      </Button>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Section 4: Propriété & Réservation */}
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <HomeIcon sx={{ fontSize: 18, color: t.primary }} />
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3 }}>
                      Propriété
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                      {task.listingName || 'Non spécifiée'}
                    </Typography>
                  </Box>
                </Stack>

                {task.reservationNumber && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: t.text3 }}>
                        Réservation
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                        {task.reservationNumber}
                      </Typography>
                    </Box>
                  </>
                )}

                {task.guestName && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: t.text3 }}>
                        Client
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                        {task.guestName}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Section 5: Tarification */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <MoneyIcon sx={{ fontSize: 18, color: t.primary }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    Tarification
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: t.text }}>
                    {task.price}
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: t.text3 }}>
                    {task.currency}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Chip
                    label={task.paid ? '✓ Payé' : '○ Non payé'}
                    size="small"
                    sx={{
                      bgcolor: task.paid ? t.successTint : t.warningTint,
                      color: task.paid ? t.success : t.warning,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  />
                  <Chip
                    label={task.paymentMode === 'cash' ? 'Cash' : 'Carte'}
                    size="small"
                    sx={{ fontSize: 11 }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Grid>

          {/* Section 6: Détails supplémentaires */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack spacing={1.5}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                  Détails supplémentaires
                </Typography>

                {task.mode && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                      Mode
                    </Typography>
                    <Chip
                      label={task.mode === 'Auto' ? 'Automatique' : 'Manuel'}
                      size="small"
                      sx={{ fontSize: 11 }}
                    />
                  </Box>
                )}

                {task.emergency && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.25 }}>
                      Urgence
                    </Typography>
                    <Chip
                      label={task.emergency}
                      size="small"
                      sx={{
                        ...priorityStyle,
                        fontSize: 11,
                      }}
                    />
                  </Box>
                )}

                {task.TS_VAL && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: t.success }} />
                    <Typography sx={{ fontSize: 12, color: t.success, fontWeight: 600 }}>
                      Confirmée
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Grid>

          {/* Section 7: Descriptions */}
          {task.descriptions && task.descriptions.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: t.bg2,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <DescriptionIcon sx={{ fontSize: 18, color: t.primary }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                      Notes & descriptions
                    </Typography>
                  </Stack>

                  {task.descriptions.map((desc, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1.5,
                        borderRadius: '6px',
                        bgcolor: t.bg1,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <Typography sx={{ fontSize: 13, color: t.text, whiteSpace: 'pre-wrap' }}>
                        {desc.description || <span style={{ color: t.text4, fontStyle: 'italic' }}>Pas de description</span>}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )}

          {/* Section 8: Images */}
          {task.images && task.images.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: t.bg2,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <ImageIcon sx={{ fontSize: 18, color: t.primary }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                      Images ({task.images.length})
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {task.images.map((img, index) => (
                      <Box
                        key={index}
                        component="img"
                        src={img.imageUrl}
                        sx={{
                          width: 100,
                          height: 100,
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: `1px solid ${t.border}`,
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      {/* Footer Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Button onClick={onClose} sx={btnGhostSx}>
          Fermer
        </Button>

        <Stack direction="row" spacing={1}>
          {onAssign && !task.staffName && (
            <Button
              startIcon={<AssignmentIcon />}
              onClick={handleAssign}
              sx={btnGhostSx}
            >
              Assigner
            </Button>
          )}
          {onEdit && (
            <Button
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={btnPrimarySx}
            >
              Modifier
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
