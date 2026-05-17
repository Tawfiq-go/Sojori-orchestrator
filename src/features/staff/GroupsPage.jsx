// pages/admin/groups/GroupsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Typography, CircularProgress, IconButton, Popover, Chip, Stack, Box, Paper, TextField, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { toast, ToastContainer } from 'react-toastify';
import SearchIcon from '@mui/icons-material/Search';
import RemoveRedEye from '@mui/icons-material/RemoveRedEye';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteOutline from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import GlobalFilter from 'components/GlobalFilter/GlobalFilter';
import ListingGlobalFilter from 'features/listing/components/ListingGlobalFilter';
import GlobalPaginationCompact from 'components/GlobalPaginationCompact/GlobalPaginationCompact';
import CreateGroupDialog from './components/CreateGroupDialog';
import UpdateGroupDialog from './components/UpdateGroupDialog';
import { getGroups, createGroup, updateGroup, deleteGroup } from './services/serverApi.task';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { getOwnerListLabel } from 'utils/ownerDisplay.utils';
import { canSelectOwnerInAdminFilter } from 'utils/taskScope.utils';
import { Roles } from '../../constants/roles';
import { can } from '../../utils/permissions';
import { styled } from '@mui/material/styles';
import TeamRolesPageShell, { TeamRolesSectionHeader, teamRolesContentPaperSx, TEAM_ROLES_FILTER_WRAP_CLASS_COMPACT } from './teamRolesLayout';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    height: '40px',
    borderRadius: '4px 0 0 4px',
    backgroundColor: 'white',
    '& fieldset': {
      border: `1px solid ${SOJORI_COLORS.gray[300]}`,
      borderRight: 'none'
    },
    '&:hover fieldset': {
      borderColor: SOJORI_COLORS.gray[500],
      borderRight: 'none'
    },
    '&.Mui-focused fieldset': {
      borderColor: SOJORI_COLORS.primary,
      borderRight: 'none',
      borderWidth: '2px'
    }
  },
  '& .MuiInputBase-input': {
    padding: '9px 14px',
    height: '22px',
    color: SOJORI_COLORS.gray[700],
    '&::placeholder': {
      color: SOJORI_COLORS.gray[500],
      opacity: 1
    }
  }
});
const SearchButton = styled(IconButton)({
  height: '40px',
  width: '40px',
  borderRadius: '0 4px 4px 0',
  backgroundColor: SOJORI_COLORS.primary,
  border: `1px solid ${SOJORI_COLORS.primary}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  },
  '& .MuiSvgIcon-root': {
    color: 'white'
  }
});
export default function GroupsPage() {
  const {
    t
  } = useTranslation('common');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const {
    user
  } = useSelector(state => state.auth);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { requestOwnerId, owners: ownerRows, ownersLoading } = useAdminOwnerFilter();
  const canUseCrossOwnerUi = canSelectOwnerInAdminFilter(user);
  const ownerLabelById = useMemo(() => {
    const m = new Map();
    (ownerRows || []).forEach((o) => m.set(String(o._id), getOwnerListLabel(o) || o.email || String(o._id)));
    return m;
  }, [ownerRows]);
  const [permAnchorEl, setPermAnchorEl] = useState(null);
  const [permRow, setPermRow] = useState(null);

  // Permission checks
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  const [canDelete, setCanDelete] = useState(can('delete'));
  const handleSearchInputChange = event => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setSearchText(newValue);
    setPage(0);
  };
  const handleSearchClick = () => {
    setSearchText(inputValue);
    setPage(0);
  };
  const handleClearFilters = () => {
    setSearchText('');
    setInputValue('');
    setPage(0);
  };
  const resetEnabled = Boolean(inputValue && inputValue.trim() !== '');
  useEffect(() => {
    fetchGroups();
  }, [page, limit, searchText, user, canUseCrossOwnerUi, requestOwnerId]);
  async function fetchGroups() {
    setLoading(true);
    try {
      if (user.role === 'Worker' && !user.ownerId) {
        setGroups([]);
        setTotalCount(0);
        setIsNextDisabled(true);
        return;
      }
      if (canUseCrossOwnerUi || requestOwnerId != null) {
        const res = await getGroups(requestOwnerId);
        const items = res?.data?.groups || [];
        const total = items.length;
        setGroups(items);
        setTotalCount(total);
        setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
      }
    } catch (e) {
      setGroups([]);
      setTotalCount(0);
      setIsNextDisabled(true);
    } finally {
      setLoading(false);
    }
  }
  const onCreate = async payload => {
    await createGroup(payload);
    toast.success(t('Group created'));
    setOpenCreate(false);
    fetchGroups();
  };
  const onUpdate = async (id, payload) => {
    await updateGroup(id, payload);
    toast.success(t('Group updated'));
    setOpenEdit(false);
    setSelectedGroup(null);
    fetchGroups();
  };
  const onDelete = async row => {
    if (!window.confirm(t('Delete this group?'))) return;
    await deleteGroup(row._id);
    toast.success(t('Group deleted'));
    fetchGroups();
  };
  const columns = [...(canUseCrossOwnerUi ? [{
    field: 'ownerId',
    header: t('Owner'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: row => <span className="font-medium text-gray-600">
                {ownerLabelById.get(String(row.ownerId)) || String(row.ownerId || '')}
              </span>
  }] : []), {
    field: 'name',
    header: t('Name'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: row => <span className="font-medium">{row.name}</span>
  }, {
    field: 'description',
    header: t('Description'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: row => <span className="font-medium">{row.description}</span>
  },
  //   field: 'featureGrants',
  //   header: t('Permissions'),
  //   body: (row) => (
  //     <div className="flex items-center gap-1">
  //       {Array.isArray(row.featureGrants) && row.featureGrants.length > 0 ? (
  //         <>
  //           {row.featureGrants.some(
  //             (g) => g.feature === '*' || (g.actions || []).includes('*'),
  //           ) ? (
  //             <Chip
  //               size="small"
  //               label="Admin-level"
  //               color="success"
  //               variant="outlined"
  //             />
  //           ) : (
  //             <Chip
  //               size="small"
  //               label={`${row.featureGrants.length} grants`}
  //               color="default"
  //               variant="outlined"
  //             />
  //           )}
  //           <IconButton
  //             size="small"
  //             onClick={(e) => {
  //               setPermAnchorEl(e.currentTarget);
  //               setPermRow(row);
  //             }}
  //             className="!text-medium-aquamarine ml-1"
  //           >
  //             <RemoveRedEye fontSize="small" />
  //           </IconButton>
  //         </>
  //       ) : (
  //         <span className="text-gray-400 text-sm">{t('No permissions')}</span>
  //       )}
  //     </div>
  //   ),
  // },
  ...(canUpdate ? [{
    field: 'action',
    header: t('Action'),
    headerStyle: {
      justifyContent: 'center'
    },
    body: row => <div className="flex items-center justify-center gap-1">
                <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => {
        setSelectedGroup(row);
        setOpenEdit(true);
      }}>
                  <EditOffIcon className="text-white" />
                </button>
              </div>
  }] : [])];
  return <TeamRolesPageShell>
      <ToastContainer position="top-right" autoClose={3000} />

      <TeamRolesSectionHeader titleKey="Groups" icon={<GroupsIcon sx={{
      fontSize: 18,
      color: '#fff'
    }} />} chip={<Chip label={t('groups_header_count', {
      count: totalCount
    })} size="small" sx={{
      bgcolor: SOJORI_COLORS.primary,
      color: 'white !important',
      fontWeight: 700,
      fontSize: '11px',
      height: '22px'
    }} />} />

      <Paper elevation={0} sx={{
      ...teamRolesContentPaperSx,
      px: {
        xs: 0.5,
        sm: 1
      },
      pt: 1,
      pb: 1.5
    }}>
      <div className={TEAM_ROLES_FILTER_WRAP_CLASS_COMPACT}>
        <GlobalFilter filterContent={<ListingGlobalFilter searchFilter={<div className="flex items-center">
                  <StyledTextField placeholder={t('Search by name...')} value={inputValue} onChange={handleSearchInputChange} variant="outlined" size="small" sx={{
            width: '200px'
          }} InputProps={{
            style: {
              paddingRight: 0
            }
          }} />
                  <SearchButton onClick={handleSearchClick} className="!text-white">
                    <SearchIcon className="!text-white" />
                  </SearchButton>
                  <Tooltip title={<span style={{
            whiteSpace: 'pre-line',
            fontSize: 15
          }}>{t('Search by group name')}</span>} arrow placement="bottom">
                    <IconButton size="small" sx={{
              marginLeft: '4px',
              background: '#fff',
              height: '40px',
              width: '40px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale
              }
            }}>
                      <InfoOutlinedIcon sx={{
                color: SOJORI_COLORS.primary
              }} />
                    </IconButton>
                  </Tooltip>
                </div>} countryFilter={<span />} cityFilter={<span />} unitTypeFilter={<span />} rightExtraContent={<span />} onReset={handleClearFilters} resetEnabled={resetEnabled} showAddButton={Boolean(canCreate)} onAddClick={() => setOpenCreate(true)} addButtonLabel={t('New Group')} />} paginationContent={totalCount > 0 ? <GlobalPaginationCompact currentPage={page} totalItems={totalCount} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={n => {
          setLimit(n);
          setPage(0);
        }} itemsPerPageOptions={[5, 10, 20, 50]} loading={loading} itemType="groups" /> : null} />
      </div>

      <Box sx={{
        bgcolor: '#fff',
        borderRadius: 1
      }}>
        {loading ? <div className="flex items-center justify-center h-64">
            <CircularProgress sx={{
            color: SOJORI_COLORS.primary
          }} />
          </div> : <GlobalTable dense data={groups} columns={columns} hasPagination={false} />}
      </Box>

      {/* Create */}
      <CreateGroupDialog open={openCreate} onClose={() => setOpenCreate(false)} onSubmit={onCreate} ownerPicker={canUseCrossOwnerUi ? {
        loading: ownersLoading,
        options: ownerRows
      } : null} />

      {/* Edit */}
      {selectedGroup && <UpdateGroupDialog open={openEdit} onClose={() => setOpenEdit(false)} group={selectedGroup} onSubmit={payload => onUpdate(selectedGroup._id, payload)} />}

      {/* Permissions popover */}
      <Popover
      // className="!mb-2 !text-gray-700 !font-semibold bg-black"
      open={Boolean(permAnchorEl)} anchorEl={permAnchorEl} onClose={() => {
        setPermAnchorEl(null);
        setPermRow(null);
      }} anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left'
      }} transformOrigin={{
        vertical: 'top',
        horizontal: 'left'
      }} PaperProps={{
        sx: {
          p: 2,
          minWidth: 280,
          maxWidth: 360,
          borderRadius: 2,
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          background: '#fff'
        }
      }}>
        {permRow ? <Box>
            <Typography variant="subtitle2" className="!mb-2 !text-gray-700 !font-semibold ">
              {permRow.name} — {t('Permissions')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{
            flexWrap: 'wrap',
            gap: '8px !important'
          }}>
              {(permRow.featureGrants || []).map((g, idx) => <Chip key={idx} size="small" variant="outlined" label={`${g.feature} `} />)}
            </Stack>
          </Box> : null}
      </Popover>
      </Paper>
    </TeamRolesPageShell>;
}
