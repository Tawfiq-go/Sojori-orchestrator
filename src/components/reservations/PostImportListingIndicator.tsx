import { Box, Tooltip } from '@mui/material';
import {
  isPostImportOrchestrationPending,
  POST_IMPORT_LISTING_TOOLTIP,
  type PostImportReservationLike,
} from '../../utils/postImportOrchestration';
import { dashboardTokens as T } from '../../design/sojoriBrandTokens';

type Props = {
  reservation: PostImportReservationLike;
};

/** Badge « I » devant le nom du listing — post-import, orchestration non lancée. */
export function PostImportListingIndicator({ reservation }: Props) {
  if (!isPostImportOrchestrationPending(reservation)) return null;

  return (
    <Tooltip title={POST_IMPORT_LISTING_TOOLTIP} arrow placement="top">
      <Box
        component="span"
        aria-label="Import RU — orchestration en attente"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 18,
          height: 18,
          borderRadius: '4px',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: '"Geist Mono", monospace',
          lineHeight: 1,
          color: T.primaryDeep,
          bgcolor: 'rgba(196, 101, 6, 0.14)',
          border: `1px solid rgba(196, 101, 6, 0.35)`,
          cursor: 'help',
        }}
      >
        I
      </Box>
    </Tooltip>
  );
}
