import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LayoutGrid, List } from 'lucide-react';
import ModifyStaffPlanning from './ModifyStaffPlanning';
import ModifyStaffPlanningNew from './ModifyStaffPlanningNew';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
};

/**
 * Wrapper component that allows switching between old and new planning views
 */
const ModifyStaffPlanningWrapper = ({ open, handleClose, staff, onStaffUpdate }) => {
  const [useNewView, setUseNewView] = useState(true); // Default to new view

  if (!open) return null;

  return (
    <>
      {/* View Switcher Button - Floating on top */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: useNewView ? 'calc(90vw - 80px)' : '620px',
            zIndex: 1400,
            transition: 'right 0.3s ease',
          }}
        >
          <Tooltip title={useNewView ? 'Basculer vers vue liste' : 'Basculer vers vue calendrier'}>
            <IconButton
              onClick={() => setUseNewView(!useNewView)}
              sx={{
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: `2px solid ${SOJORI_COLORS.primary}`,
                '&:hover': {
                  backgroundColor: SOJORI_COLORS.primary,
                  color: 'white',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {useNewView ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </IconButton>
          </Tooltip>
        </div>
      )}

      {/* Render the selected view */}
      {useNewView ? (
        <ModifyStaffPlanningNew
          open={open}
          handleClose={handleClose}
          staff={staff}
          onStaffUpdate={onStaffUpdate}
        />
      ) : (
        <ModifyStaffPlanning
          open={open}
          handleClose={handleClose}
          staff={staff}
          onStaffUpdate={onStaffUpdate}
        />
      )}
    </>
  );
};

export default ModifyStaffPlanningWrapper;
