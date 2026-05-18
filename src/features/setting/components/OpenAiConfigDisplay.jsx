import React, { useState, useEffect } from 'react';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import GlobalTable from '../../../components/GlobalTable/GlobalTable';
import MDBox from 'components/MDBox';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOpenAiConfigById } from '../services/serverApi.adminConfig';
import AddOpenAiInitConfigurationgDialog from './AddOpenAIConfiguration';
import CreateOpenAIConfiguration from './CreateOpenAIConfiguration';
import ModOpeniaConfiguration from './ModOpeniaConfiguration.component ';
import BackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { Paper, Grid, Button, IconButton, CircularProgress, Switch, TextField, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { Link } from 'react-router-dom';
import { updateOpenAiConfig } from '../services/serverApi.adminConfig';
import { useLocation } from 'react-router-dom';
function OpenAiConfigDisplay() {
  const location = useLocation();
  const id = location?.state?.data;
  const [openAiConfigItem, setOpenAiConfigItem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogM, setOpenDialogM] = useState(false);
  const [dataOpenAi, setDataOpenAi] = useState(null);
  const [openAiIndex, setOpenAiIndex] = useState(null);
  const openAiConfigItems = async () => {
    try {
      const data = await getOpenAiConfigById(id);
      setOpenAiConfigItem(data?.data?.openAiConfig);
    } catch (error) {} finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    openAiConfigItems();
  }, [id]);
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
  const addAiConfig = newItem => {
    setOpenAiConfigItem(newItem);
    handleCloseDialog();
  };
  const handleDelete = async (openAiId, index) => {
    const confirmed = window.confirm('Are you sure you want to delete this item?');
    if (confirmed) {
      const newData = {
        ...openAiConfigItem
      };
      newData.configuration = newData.configuration?.filter((item, i) => i !== index);
      setOpenAiConfigItem(newData);
      const {
        _id,
        ...item
      } = newData;
      updateOpenAiConfig(_id, item).then(({
        data
      }) => {
        toast.success('enble has been Deleted');
      }).catch(error => {});
    }
  };
  const columns = [{
    field: 'field',
    header: 'Field',
    headerClassName: 'header-test',
    body: rowData => <span className="block mx-auto text-center  text-medium-aquamarine font-bold cursor-pointer">
          {rowData?.field}
        </span>
  }, {
    field: 'catName',
    header: 'catName',
    headerClassName: 'header-test',
    body: rowData => <span className="block mx-auto text-center  text-medium-aquamarine font-bold cursor-pointer">
          {rowData?.catName}
        </span>
  }, {
    field: 'value',
    header: 'Value',
    headerClassName: 'header-test',
    body: rowData => <span style={{
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }} title={rowData?.value} className="block mx-auto text-center  text-medium-aquamarine font-bold cursor-pointer">
          {rowData?.value}
        </span>
  }, {
    field: 'ranking',
    header: 'classement',
    headerClassName: 'header-test',
    body: rowData => <span style={{
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }} title={rowData?.ranking} className="block mx-auto text-center  text-medium-aquamarine font-bold cursor-pointer">
          {rowData?.ranking}
        </span>
  }, {
    field: 'agent',
    header: 'Agent',
    headerClassName: 'header-test',
    body: rowData => <span className="block mx-auto text-center  text-medium-aquamarine font-bold cursor-pointer">
          {rowData?.agent}
        </span>
  }, {
    field: 'enable',
    header: 'Enalbe',
    headerClassName: 'header-test',
    body: (rowData, options) => <span className="block mx-auto text-center text-medium-aquamarine font-bold cursor-pointer">
          <Switch onChange={e => editSwitch('enable', e.target.checked, options?.rowIndex || 0)} value="checked" checked={rowData?.enable} />
        </span>
  }, {
    field: 'RequireReservation',
    header: 'RequireReservation',
    headerClassName: 'header-test',
    body: (rowData, options) => <span className="block mx-auto text-center text-medium-aquamarine font-bold cursor-pointer">
          <Switch onChange={e => editSwitch('RequireReservation', e.target.checked, options?.rowIndex || 0)} value="checked" checked={rowData?.RequireReservation} />
        </span>
  }, {
    field: 'image',
    header: 'image',
    headerClassName: 'header-test',
    body: (rowData, options) => <span className="block mx-auto text-center text-medium-aquamarine font-bold cursor-pointer">
          <img src={rowData?.imageUrl} alt="" style={{
        width: '200px'
      }} />
        </span>
  }, {
    field: 'useImage',
    header: 'useImage',
    headerClassName: 'header-test',
    body: (rowData, options) => <span className="block mx-auto text-center text-medium-aquamarine font-bold cursor-pointer">
          <Switch onChange={e => editSwitch('useImage', e.target.checked, options?.rowIndex || 0)} value="checked" checked={rowData?.useImage} />
        </span>
  }, {
    field: 'null',
    header: 'Action',
    headerClassName: 'header-test',
    body: (rowData, options) => <div style={{
      textAlign: 'center'
    }}>
          <IconButton sx={{
        display: 'inline'
      }} onClick={() => handleOpenDialogM(rowData, options?.rowIndex || 0)}>
            <EditIcon />
          </IconButton>
          <IconButton sx={{
        display: 'inline'
      }} onClick={() => handleDelete(rowData._id, options?.rowIndex || 0)}>
            <DeleteIcon />
          </IconButton>
        </div>
  }];
  const editSwitch = (key, value, index) => {
    const newData = {
      ...openAiConfigItem
    };
    newData.configuration = newData.configuration.map((config, i) => {
      if (i === index) {
        return {
          ...config,
          [key]: value
        };
      }
      return config;
    });
    setOpenAiConfigItem(newData); //
    const {
      _id,
      ...item
    } = newData;
    updateOpenAiConfig(_id, item).then(({
      data
    }) => {
      toast.success('enble has been updated');
    }).catch(error => {});
  };
  return <DashboardLayout>
      
      <MDBox py={3}>
        <Grid container className="bordHeader mb-5" component={Paper}>
          <Grid item xs={12}>
            <span style={{
            fontSize: '38px',
            fontWeight: 'bold',
            margin: 'auto',
            padding: '22px',
            display: 'block',
            textAlign: 'center'
          }}>
              OpenAI Configuration
            </span>

            <ToastContainer position="top-right" autoClose={3000} />
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
              <Link to="/admin/setting/openAi" state={{
              data: '2'
            }}>
                <Button startIcon={<BackIcon />} sx={{
                background: 'rgb(42 201 201)',
                float: 'right',
                color: 'white !important',
                margin: '10px',
                '&:hover': {
                  background: '#06bf9d'
                }
              }} variant="contained" onClick={handleOpenDialog}>
                  Back
                </Button>
              </Link>
              <Button startIcon={<AddIcon />} sx={{
              background: 'rgb(42 201 201)',
              float: 'right',
              color: 'white !important',
              margin: '10px',
              '&:hover': {
                background: '#06bf9d'
              }
            }} variant="contained" onClick={handleOpenDialog}>
                Add
              </Button>
            </div>
          </Grid>
          {loading ? <Grid item cl={12} style={{
          margin: 'auto'
        }}>
              <CircularProgress size={30} />
            </Grid> : <GlobalTable data={openAiConfigItem?.configuration || []} columns={columns} hasPagination={false}

        // page={page}
        // onPageChange={setPage}
        // isNextDisabled={loading || openAiConfigItem.length < limit}
        // hasPagination={true}
        // limit={limit}
        // onLimitChange={setLimit}
        // rowsPerPageOptions={rowsPerPageOptions}
        />}
        </Grid>

        <ModOpeniaConfiguration open={openDialogM} onClose={handleCloseDialogM} openAiConfigItem={openAiConfigItem} setOpenAiConfigItem={setOpenAiConfigItem} dataOpenAi={dataOpenAi} openAiIndex={openAiIndex} />
        {/* <AddOpenAiInitConfigurationgDialog
          open={openDialog}
          onClose={handleCloseDialog}
          addAiConfig={addAiConfig}
          openAiConfigItem={openAiConfigItem}
         /> */}
        <CreateOpenAIConfiguration open={openDialog} onClose={handleCloseDialog} addAiConfig={addAiConfig} openAiConfigItem={openAiConfigItem} />
      </MDBox>
    </DashboardLayout>;
}
export default OpenAiConfigDisplay;
