// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Configuration Task Templates View
// Version simplifiée adaptée du legacy (~5124 lignes → ~400 lignes)
// Affiche les catégories d'orchestration avec toggle enabled/disabled
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Switch,
  Chip,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  getOrchestratorTaskTemplate,
  updateOrchestratorTaskTemplate,
  type TaskTemplate,
} from '../../services/orchestratorConfigService';

// Noms des catégories (alignés avec legacy)
const CATEGORY_LABELS: Record<string, string> = {
  registration: '🔐 Enregistrement Voyageurs',
  arrival_choose: '🎫 Choix Heure Arrivée',
  arrival_declare: '📍 Déclaration Arrivée',
  departure_choose: '🚪 Choix Heure Départ',
  departure_declare: '👋 Déclaration Départ',
  cleaning_free: '🧹 Ménage Inclus',
  cleaning_paid: '💰 Ménage Supplémentaire',
  cleaning_sojori: '🧹 Ménage Géré Sojori',
  transport: '🚗 Transport Invité',
  groceries: '🛒 Courses Invité',
  custom_request: '📝 Demande Personnalisée',
  support: '🆘 Aide & Support',
  maintenance: '🔧 Réparations',
  welcome: '👋 Message de Bienvenue',
  weather: '🌤️ Rappel complet avant X jours',
  local_recommendations: '📍 Recommandations Locales',
  feedback_during_stay: '💬 Feedback Séjour',
  thank_you: '🙏 Message Merci',
  review_request: '⭐ Demande Avis',
};

// Mode labels
const MODE_LABELS: Record<string, { label: string; color: string }> = {
  ORCHESTRATION: { label: 'Orchestration', color: '#8B5CF6' },
  NOTIFICATION_ONLY: { label: 'Notification seulement', color: '#FF9800' },
  MANUAL: { label: 'Manuel', color: '#6B7280' },
};

// Admin template owner ID (aligné avec legacy)
const ADMIN_OWNER_ID = '67f5416ff145a6002e46c2f3';

interface ConfigTaskTemplateViewProps {
  targetOwnerId?: string;
}

const ConfigTaskTemplateView: React.FC<ConfigTaskTemplateViewProps> = ({ targetOwnerId }) => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TaskTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Use admin owner ID by default
  const ownerId = targetOwnerId || ADMIN_OWNER_ID;

  // Fetch template
  useEffect(() => {
    fetchTemplate();
  }, [ownerId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrchestratorTaskTemplate(ownerId);
      if (response.success) {
        const rawCategories = response.data.categories || [];
        setCategories(Array.isArray(rawCategories) ? rawCategories : []);
      }
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Aucune configuration trouvée. Créez une configuration via le dashboard legacy.');
      } else {
        setError(err.message || 'Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle category enabled
  const handleToggleEnabled = async (categoryIndex: number, currentEnabled: boolean) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      enabled: !currentEnabled,
    };

    setCategories(updatedCategories);

    try {
      setSaving(true);
      await updateOrchestratorTaskTemplate(
        ownerId,
        updatedCategories
      );
    } catch (err: any) {
      alert(`Erreur lors de la sauvegarde: ${err.message}`);
      // Rollback
      setCategories(categories);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Configuration non disponible</Typography>
          <Typography sx={{ fontSize: 13 }}>
            {error}
          </Typography>
          <Button
            variant="contained"
            size="small"
            href="https://dashboard.sojori.com/admin/orchestrator?tab=configuration&configTab=orchestration"
            target="_blank"
            sx={{ mt: 2, textTransform: 'none' }}
          >
            Ouvrir dans le dashboard legacy
          </Button>
        </Alert>
      </Box>
    );
  }

  const enabledCount = categories.filter((c) => c.enabled).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Stats */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Card sx={{ flex: 1, border: '1px solid var(--border)', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6', mb: 0.5 }}>
              {categories.length}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Catégories Total
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, border: '1px solid var(--border)', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#4CAF50', mb: 0.5 }}>
              {enabledCount}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Actives
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Alert severity="info">
          Aucune catégorie configurée. Utilisez le dashboard legacy pour créer la configuration initiale.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {categories.map((category, index) => (
            <Accordion
              key={index}
              sx={{
                border: '1px solid var(--border)',
                borderRadius: '8px !important',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  margin: '0 !important',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  },
                }}
              >
                {/* Toggle */}
                <Switch
                  checked={category.enabled}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggleEnabled(index, category.enabled);
                  }}
                  disabled={saving}
                  size="small"
                />

                {/* Category Name */}
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {CATEGORY_LABELS[category.categoryName] || category.categoryName}
                  </Typography>
                </Box>

                {/* Mode Chip */}
                <Chip
                  label={MODE_LABELS[category.mode]?.label || category.mode}
                  size="small"
                  sx={{
                    fontSize: 11,
                    height: 24,
                    bgcolor: `${MODE_LABELS[category.mode]?.color || '#999'}20`,
                    color: MODE_LABELS[category.mode]?.color || '#999',
                    fontWeight: 600,
                  }}
                />

                {/* Status Icon */}
                {category.enabled ? (
                  <CheckIcon sx={{ fontSize: 20, color: '#4CAF50' }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 20, color: '#999' }} />
                )}
              </AccordionSummary>

              <AccordionDetails sx={{ pt: 0, pb: 2 }}>
                <Box sx={{ pl: 6 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Mode */}
                    {category.mode && (
                      <InfoRow
                        label="Mode"
                        value={MODE_LABELS[category.mode]?.label || category.mode}
                      />
                    )}

                    {/* Assignment Strategy */}
                    {category.orchestration?.assignmentStrategy && (
                      <InfoRow
                        label="Stratégie d'assignation"
                        value={category.orchestration.assignmentStrategy}
                      />
                    )}

                    {/* Create Task Before */}
                    {category.orchestration?.createTaskBefore?.value && category.orchestration?.createTaskBefore?.unit && (
                      <InfoRow
                        label="Créer tâche avant"
                        value={`${category.orchestration.createTaskBefore.value} ${category.orchestration.createTaskBefore.unit}`}
                      />
                    )}

                    {/* AI Orchestration */}
                    {category.aiOrchestration?.considerListingResponsibility !== undefined && (
                      <InfoRow
                        label="AI Orchestration"
                        value={
                          category.aiOrchestration.considerListingResponsibility
                            ? 'Activé (responsabilité listing)'
                            : 'Désactivé'
                        }
                      />
                    )}
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
                    href="https://dashboard.sojori.com/admin/orchestrator?tab=configuration&configTab=orchestration"
                    target="_blank"
                    sx={{ mt: 2, textTransform: 'none', fontSize: 12 }}
                  >
                    Éditer dans le dashboard legacy
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 160 }}>
      {label}:
    </Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value}</Typography>
  </Box>
);

export default ConfigTaskTemplateView;
