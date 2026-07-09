import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/dashboardTokens';
import { NotificationPreferencesSection } from '../features/notifications/NotificationPreferencesSection';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InfoOutlined from '@mui/icons-material/InfoOutlined';

/**
 * Préférences cloche dashboard du propriétaire (inbox alertes métier).
 * ≠ Admin WhatsApp (Task → Équipe) qui route les messages staff par numéro.
 */
export function NotificationPreferencesPage() {
  return (
    <DashboardWrapper breadcrumb={['Équipe', 'Notifications dashboard']}>
      <Box sx={{ py: 2.5, maxWidth: 920 }}>
        <Typography sx={{ fontSize: 26, fontWeight: 800, color: T.text, mb: 0.75 }}>
          Notifications dashboard
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.text3, mb: 2, maxWidth: 720 }}>
          Choisissez quels événements déclenchent une alerte dans la cloche du dashboard pour le
          propriétaire (réservation créée, annulée, message OTA, escalade orchestration, etc.).
          Chaque worker a sa propre configuration dans{' '}
          <b>Équipe → Workers → Modifier</b>.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1.25,
            alignItems: 'flex-start',
            p: 1.5,
            mb: 2.5,
            borderRadius: '12px',
            bgcolor: T.infoTint,
            border: `1px solid ${T.border}`,
          }}
        >
          <InfoOutlined sx={{ fontSize: 20, color: T.info, mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.text, mb: 0.5 }}>
              Distinct de l’admin WhatsApp staff
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>
              Les messages WhatsApp pour les admins terrain (résa, tâches, leads…) se configurent
              dans <b>Task → Équipe → Admin WhatsApp</b> (par numéro de téléphone). Cette page ne
              gère que la <b>cloche dashboard</b>.
            </Typography>
          </Box>
        </Box>

        <NotificationPreferencesSection />
      </Box>
    </DashboardWrapper>
  );
}

export default NotificationPreferencesPage;
