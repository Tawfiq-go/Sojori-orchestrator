import { Alert, Box, Chip, Typography } from '@mui/material';
import {
  WorkerAdminSwitch,
  WorkerSidebarAccessToggles,
  WF,
} from '../../staff/components/workerFormDesign';
import {
  buildLandlordPermissionGroups,
  DEFAULT_LANDLORD_DASHBOARD_GRANTS,
  isLandlordReadAllAccess,
  type FeatureGrant,
} from '../../../utils/ownerRoutePermissions';

export const LANDLORD_FORM_SECTIONS = [
  { id: 'basic-info', label: 'Identité', icon: '👤' },
  { id: 'contract', label: 'Contrat PM', icon: '📊' },
  { id: 'listings-access', label: 'Annonces', icon: '🏠' },
  { id: 'dashboard-access', label: 'Dashboard', icon: '🔐' },
];

type LandlordDashboardPanelProps = {
  hasAccess: boolean;
  onHasAccessChange: (on: boolean) => void;
  grants: FeatureGrant[];
  previousGrants?: FeatureGrant[];
  onGrantsChange: (next: FeatureGrant[]) => void;
  onPreviousGrantsChange?: (next: FeatureGrant[]) => void;
  disabled?: boolean;
};

export function LandlordDashboardAccessPanel({
  hasAccess,
  onHasAccessChange,
  grants,
  previousGrants = [],
  onGrantsChange,
  onPreviousGrantsChange,
  disabled = false,
}: LandlordDashboardPanelProps) {
  const groups = buildLandlordPermissionGroups();
  const isReadAll = isLandlordReadAllAccess(grants);

  const applyReadAll = (on: boolean) => {
    if (on) {
      if (!isLandlordReadAllAccess(grants)) {
        onPreviousGrantsChange?.(grants);
      }
      onGrantsChange([{ feature: '*', actions: ['get'] }]);
      return;
    }
    onGrantsChange(
      previousGrants?.length ? previousGrants : [...DEFAULT_LANDLORD_DASHBOARD_GRANTS],
    );
    onPreviousGrantsChange?.([]);
  };

  return (
    <Box>
      <WorkerAdminSwitch
        label="Accès au dashboard Sojori"
        hint="Si oui, le propriétaire pourra se connecter à l'orchestrator avec les pages cochées ci-dessous (lecture seule)."
        checked={hasAccess}
        disabled={disabled}
        onChange={onHasAccessChange}
      />
      {hasAccess ? (
        <Box sx={{ mt: 1 }}>
          <WorkerAdminSwitch
            label="Accès à toutes les pages Owner"
            hint="Lecture seule sur tout le menu (Pricing, Task, Orchestration…). Désactivez pour choisir section par section."
            checked={isReadAll}
            disabled={disabled}
            onChange={applyReadAll}
          />
          {isReadAll ? (
            <Chip
              size="small"
              label="Toutes les pages Owner — lecture seule"
              sx={{ bgcolor: WF.primaryTint, color: WF.primaryDeep, fontWeight: 700 }}
            />
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 12, color: WF.text3, mb: 1.25, lineHeight: 1.45 }}>
                Par défaut : <strong>Tableau de bord</strong>, <strong>Réservations</strong> et{' '}
                <strong>Finances</strong>. Le PM peut activer Pricing, Task, Orchestration, Inbox, etc.
                <br />
                Ex. <strong>Réservations</strong> activé → Liste, Planning et Paiements inclus (grisés).
              </Typography>
              <WorkerSidebarAccessToggles
                groups={groups}
                grants={grants}
                disabled={disabled}
                pageGrantActions={['get']}
                onChange={onGrantsChange}
              />
            </Box>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ borderRadius: '12px', mt: 1 }}>
          Aucun accès dashboard — fiche et contrat PM conservés, pas de connexion orchestrator.
        </Alert>
      )}
    </Box>
  );
}
