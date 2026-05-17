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

  if (!field) return null;
  if (adminOnlyGate && (!user || !hasAdminAccess(user.role))) {
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

  if (!showRu && !showReq) return null;

  const indicators: React.ReactNode[] = [];

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
