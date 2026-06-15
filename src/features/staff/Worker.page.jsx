import React, { useState, useCallback } from 'react';
import { Chip, Paper } from '@mui/material';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TeamRolesPageShell, { TeamRolesSectionHeader, teamRolesContentPaperSx } from './teamRolesLayout';
import PublicWorker from './components/PublicWorker';

function Worker() {
  const { t } = useTranslation('common');
  const [workersTotal, setWorkersTotal] = useState(0);
  const onWorkersTotalChange = useCallback((n) => {
    setWorkersTotal(typeof n === 'number' ? n : 0);
  }, []);

  return (
    <TeamRolesPageShell>
      <TeamRolesSectionHeader
        titleKey="Roles & Permissions"
        icon={<Users size={16} strokeWidth={2.4} color="#fff" />}
        chip={
          <Chip
            label={t('workers_header_count', { count: workersTotal })}
            size="small"
            sx={{
              bgcolor: '#E6B022',
              color: 'white !important',
              fontWeight: 700,
              fontSize: '11px',
              height: '22px',
            }}
          />
        }
      />
      <Paper elevation={0} sx={{ ...teamRolesContentPaperSx, px: { xs: 0.5, sm: 1 }, pt: 1, pb: 1.5 }}>
        <PublicWorker hidePageHeader onWorkersTotalChange={onWorkersTotalChange} />
      </Paper>
    </TeamRolesPageShell>
  );
}

export default Worker;
