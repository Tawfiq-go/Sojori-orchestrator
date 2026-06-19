import { Box, Tooltip, Typography } from '@mui/material';
import { useAuth } from '../../../../hooks/useAuth';
import { hasAdminAccess } from '../../../../utils/rbac.utils';
import {
  findListingStructureField,
  isListingDescriptionFieldSyncedToRu,
  isListingFieldRequired,
  isListingFieldRu,
  type ListingStructureDoc,
} from '../../../../utils/listingFieldFlags';
import { useIsRuImportedField } from '../ListingFormImportedContext';

const badgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 28,
  height: 20,
  px: 0.5,
  borderRadius: '4px',
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  transition: 'all 0.2s ease',
};

type FieldIndicatorProps = {
  field: string;
  listingStructure?: ListingStructureDoc | null;
  inferRuWhenMissing?: boolean;
  dense?: boolean;
  adminOnlyGate?: boolean;
};

/** Badge R / * comme legacy dashboard (ListingStructure). */
export function FieldIndicator({
  field,
  listingStructure,
  inferRuWhenMissing = false,
  dense = false,
  adminOnlyGate = true,
}: FieldIndicatorProps) {
  const { user } = useAuth();
  const isAdmin = Boolean(user && hasAdminAccess(user.role));
  const isImported = useIsRuImportedField(field);

  if (!field) return null;
  if (adminOnlyGate && !isAdmin) {
    return null;
  }

  const fieldInfo = findListingStructureField(listingStructure, field);

  let showRu = false;
  let showReq = false;
  if (fieldInfo) {
    showRu = isListingFieldRu(fieldInfo);
    showReq = isListingFieldRequired(fieldInfo);
  } else if (inferRuWhenMissing && isListingDescriptionFieldSyncedToRu(field)) {
    showRu = true;
  }

  const showImported = isAdmin && isImported;

  if (!showRu && !showReq && !showImported) return null;

  const indicators: React.ReactNode[] = [];

  if (showImported) {
    indicators.push(
      <Tooltip
        key="imported"
        title="Valeur importée depuis Rentals United (import Airbnb / RU)"
        arrow
        placement="top"
      >
        <Box
          component="span"
          sx={{
            ...badgeSx,
            backgroundColor: 'rgba(10, 143, 94, 0.12)',
            color: '#0a8f5e',
            '&:hover': { backgroundColor: 'rgba(10, 143, 94, 0.2)' },
          }}
        >
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700, lineHeight: 1 }}>
            I
          </Typography>
        </Box>
      </Tooltip>,
    );
  }

  if (showRu) {
    indicators.push(
      <Tooltip
        key="ru"
        title="Donnée envoyée ou mappée vers Rentals United"
        arrow
        placement="top"
      >
        <Box
          component="span"
          sx={{
            ...badgeSx,
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            color: '#4a90e2',
            '&:hover': { backgroundColor: 'rgba(74, 144, 226, 0.2)' },
          }}
        >
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 1 }}>
            R
          </Typography>
        </Box>
      </Tooltip>,
    );
  }

  if (showReq) {
    indicators.push(
      <Tooltip
        key="req"
        title="Champ obligatoire pour une annonce valide"
        arrow
        placement="top"
      >
        <Box
          component="span"
          sx={{
            ...badgeSx,
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            color: '#b91c1c',
            '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.14)' },
          }}
        >
          <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 700, lineHeight: 1 }}>
            *
          </Typography>
        </Box>
      </Tooltip>,
    );
  }

  const inner = (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ml: dense ? 0 : 0.75,
        verticalAlign: 'middle',
      }}
    >
      {indicators}
    </Box>
  );

  return inner;
}

export default FieldIndicator;
