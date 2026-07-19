import { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { toast } from 'react-toastify';
import {
  ORCHESTRATION_ADMIN_OWNER_ID,
  isOrchestrationAdminOwnerRow,
} from '../../constants/orchestrationAdmin';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import {
  syncAdminTemplateToAllOwners,
  syncAdminTemplateToOwnerSimple,
} from '../../features/listing/utils/syncAdminTemplateToOwner';
import { getOwnerListLabel } from '../../utils/ownerDisplay.utils';

/**
 * Bouton top-bar : Template Admin → sync tous les PMs (ou un PM si sélectionné).
 */
export default function TemplateAdminSyncPmsButton() {
  const { selectedOwnerId, owners } = useAdminOwnerFilter();
  const [syncing, setSyncing] = useState(false);

  const sel = String(selectedOwnerId || '').trim();
  const selectedOwner = (owners || []).find(
    (o) => String(o?._id ?? o?.id) === sel,
  );
  const isTemplateAdmin =
    !sel ||
    sel === ORCHESTRATION_ADMIN_OWNER_ID ||
    isOrchestrationAdminOwnerRow(selectedOwner);

  const handleClick = async () => {
    setSyncing(true);
    try {
      if (isTemplateAdmin) {
        const result = await syncAdminTemplateToAllOwners();
        if (result.ok) {
          toast.success(
            `Template Admin → ${result.synced} PM(s)${result.failed > 0 ? ` · ${result.failed} échec(s)` : ''}`,
          );
        } else {
          toast.error(result.lines.join(' · ') || 'Sync PMs échouée');
        }
        return;
      }

      const name = getOwnerListLabel(selectedOwner) || sel;
      const result = await syncAdminTemplateToOwnerSimple(sel);
      if (result.ok) {
        toast.success(`${name} — ${result.lines.join(' · ')}`);
      } else {
        toast.error(`${name} — ${result.lines.join(' · ')}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync échouée');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      size="small"
      variant="contained"
      disabled={syncing}
      onClick={() => void handleClick()}
      startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
      sx={{
        flexShrink: 0,
        textTransform: 'none',
        fontWeight: 700,
        fontSize: 12,
        whiteSpace: 'nowrap',
        bgcolor: '#B8851A',
        '&:hover': { bgcolor: '#9a6f15' },
        boxShadow: 'none',
      }}
    >
      {syncing
        ? 'Sync…'
        : isTemplateAdmin
          ? 'Synchroniser les PMs'
          : 'Sync ce PM'}
    </Button>
  );
}
