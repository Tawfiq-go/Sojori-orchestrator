import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import GlobalTable from '../../../components/GlobalTable/GlobalTable';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOpenAiInit, removeOpenAiInit } from '../services/serverApi.adminConfig';
import AddOpenAiInitDialog from './AddOpenAI.component ';
import ModifyOpenAiInitDialog from './ModifyOpenAI.component';
import { AddCircleOutline as AddIcon } from '@mui/icons-material';
import { Button, CircularProgress, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import OpenAILogo from '../../../helpers/OpenAILogo';
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
const CreateButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});
function OpenAiInit() {
  const {
    t
  } = useTranslation('common');
  const [openAiItem, setOpenAiItem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogM, setOpenDialogM] = useState(false);
  const [dataOpenAi, setDataOpenAi] = useState(null);
  const [openAiIndex, setOpenAiIndex] = useState(null);
  const openAiItems = async () => {
    try {
      const data = await getOpenAiInit();
      setOpenAiItem(data.data?.openAiInits);
    } catch (error) {} finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    openAiItems();
  }, []);
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
  const handleCloseDialogM = () => {
    setOpenDialogM(false);
  };
  const handleOpenDialogM = (data, index) => {
    setOpenDialogM(true);
    setDataOpenAi(data);
    setOpenAiIndex(index);
  };
  const addOpenAiInit = newItem => {
    setOpenAiItem([...openAiItem, newItem.data?.openAiInit]);
    handleCloseDialog();
  };
  const handleDelete = async (openAiId, index) => {
    const confirmed = window.confirm(t('Are you sure you want to delete this item?'));
    if (confirmed) {
      removeOpenAiInit(openAiId).then(response => {
        if (response.status === 200) {
          const updatedData = openAiItem.filter((item, i) => i !== index);
          setOpenAiItem(updatedData);
          toast.success(t('Deleted Successfully'));
        } else {}
      });
    }
  };
  const columns = [{
    field: "type",
    header: t('Type'),
    headerClassName: "header-test",
    body: rowData => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          {rowData?.type}
        </span>
  }, {
    field: "api_key",
    header: t('Api key'),
    headerClassName: "header-test",
    body: rowData => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          {rowData?.api_key}
        </span>
  }, {
    field: "embedding_model",
    header: t('Embedding model'),
    headerClassName: "header-test",
    body: rowData => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          {rowData?.embedding_model}
        </span>
  }, {
    field: "null",
    header: t('Action'),
    headerClassName: "header-test",
    body: (rowData, options) => <div className="flex items-center justify-center gap-2">
            <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenDialogM(rowData, options?.rowIndex || 0)}>
              <EditOffIcon className="text-white" />
            </button>
            <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDelete(rowData._id, options?.rowIndex || 0)}>
              <DeleteSweepIcon className="text-white" />
            </button>
          </div>
  }];
  return <>
      <ToastContainer />
      <div className="card px-4 pb-4 !border-none">
        <Box className="flex items-center justify-between mb-4">
          <Box className="flex items-center gap-2">
            <OpenAILogo size={40} />
            <span className="text-2xl font-bold">{t('Init')}</span>
          </Box>
          <CreateButton variant="contained" endIcon={<AddIcon />} onClick={handleOpenDialog}>
            {t('Add OpenAI Init')}
          </CreateButton>
        </Box>
        {loading ? <div className="flex items-center justify-center h-full">
            <CircularProgress style={{
          color: SOJORI_COLORS.primary
        }} />
          </div> : <GlobalTable data={openAiItem} columns={columns} hasPagination={false} />}
        <AddOpenAiInitDialog open={openDialog} onClose={handleCloseDialog} addOpenAiInit={addOpenAiInit} />
        <ModifyOpenAiInitDialog open={openDialogM} onClose={handleCloseDialogM} setOpenAiItem={setOpenAiItem} openAiItem={openAiItem} index={openAiIndex} dataOpenAi={dataOpenAi} />
      </div>
    </>;
}
export default OpenAiInit;
