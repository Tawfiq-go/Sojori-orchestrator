import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Tabs, Tab, Box, CircularProgress, Card, CardContent, CardMedia, Divider, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { toast } from 'react-toastify';
import { getWhatsappConfig, getLanguages, updateWhatsappConfig } from '../services/serverApi.adminConfig';
import WhatsAppConfigModal from './WhatsAppConfigModal';
import defaultAvatar from 'assets/images/placeholder.jpg';
import { Edit } from 'lucide-react';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledButton = styled(Button)({
  background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
  color: 'white',
  padding: '8px 24px',
  borderRadius: '8px',
  height: '42px',
  fontWeight: 600,
  fontSize: '14px',
  textTransform: 'none',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  }
});
const StyledTab = styled(Tab)(({
  theme
}) => ({
  minWidth: 120,
  '&.Mui-selected': {
    color: "#00bfa5",
    fontWeight: 'bold'
  }
}));
const ContentWrapper = styled(Box)(({
  theme
}) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));
const FeatureItem = styled(Box)(({
  theme
}) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  transition: 'background-color 0.3s',
  '&:hover': {
    backgroundColor: theme.palette.grey[200]
  }
}));
function WhatsApp() {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappConfig, setWhatsappConfig] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [whatsappConfigId, setWhatsappConfigId] = useState(null);
  const [featureOrder, setFeatureOrder] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getWhatsappConfig();
      const {
        whatsappConfig
      } = response.data;
      setWhatsappConfig(whatsappConfig);
      setWhatsappConfigId(whatsappConfig._id);
      setFeatureOrder(whatsappConfig.features);
    } catch (error) {
      setError(t('Failed to fetch WhatsApp configuration. Please try again later.'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  const fetchLanguages = useCallback(async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed to fetch languages'));
    }
  }, []);
  useEffect(() => {
    fetchData();
    fetchLanguages();
  }, [fetchData, fetchLanguages]);
  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);
  const handleOnDragEnd = useCallback(async result => {
    if (!result.destination) return;
    const items = Array.from(featureOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFeatureOrder(items);
    try {
      const updatedConfig = {
        ...whatsappConfig,
        features: items
      };
      await updateWhatsappConfig(whatsappConfigId, updatedConfig);
      setWhatsappConfig(updatedConfig);
      toast.success(t('Order updated successfully!'));
    } catch (error) {
      toast.error(t('Failed to update order.'));
    }
  }, [featureOrder, whatsappConfig, whatsappConfigId]);
  const handleUpdateConfig = useCallback(updatedConfig => {
    setWhatsappConfig(updatedConfig);
    setFeatureOrder(updatedConfig.features);
  }, []);
  if (error) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <Typography color="error">{error}</Typography>
            </Box>;
  }
  if (isLoading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>;
  }
  return <Box p={4} className="relative card">
            {whatsappConfig ? <Box className="flex gap-3">
                    <WhatsAppTabs t={t} whatsappConfig={whatsappConfig} featureOrder={featureOrder} languages={languages} handleOnDragEnd={handleOnDragEnd} activeTab={activeTab} handleTabChange={handleTabChange} />
                    <Box mt={2} className="absolute top-4 right-4">
                        <StyledButton onClick={handleOpenModal} className="!text-white">
                            <Edit />
                        </StyledButton>
                    </Box>
                </Box> : <Typography>{t('No WhatsApp configuration found.')}</Typography>}
            {whatsappConfig && <WhatsAppConfigModal open={modalOpen} onClose={handleCloseModal} setWhatsappConfig={handleUpdateConfig} config={whatsappConfig} configId={whatsappConfigId} featureOrder={featureOrder} languages={languages} activeTab={activeTab} />}
        </Box>;
}
function WhatsAppTabs({
  t,
  whatsappConfig,
  featureOrder,
  languages,
  handleOnDragEnd,
  activeTab,
  handleTabChange
}) {
  return <Box sx={{
    width: '100%'
  }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="WhatsApp configuration tabs" variant="scrollable" scrollButtons="auto" indicatorColor="secondary">
                <StyledTab label={t('WhatsApp Info')} id="whatsapp-tab-0" aria-controls="whatsapp-tabpanel-0" />
                <StyledTab label={t('Blog Info')} id="whatsapp-tab-1" aria-controls="whatsapp-tabpanel-1" />
                <StyledTab label={t('WhatsApp Media')} id="whatsapp-tab-2" aria-controls="whatsapp-tabpanel-2" />
                <StyledTab label={t('Image Info')} id="whatsapp-tab-3" aria-controls="whatsapp-tabpanel-3" />
                <StyledTab label={t('Features')} id="whatsapp-tab-4" aria-controls="whatsapp-tabpanel-4" />
            </Tabs>
            <div className="p-4">
                <TabPanel value={activeTab} index={0}>
                    <MultiLingualContent t={t} title={t('Title')} content={whatsappConfig.title} languages={languages} />
                    <Divider sx={{
          my: 2
        }} />
                    <MultiLingualContent t={t} title={t('Description')} content={whatsappConfig.description} languages={languages} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                    <MultiLingualContent t={t} title={t('Blog Title')} content={whatsappConfig.blogTitle || {}} languages={languages} />
                    <Divider sx={{
          my: 2
        }} />
                    <MultiLingualContent t={t} title={t('Blog Description')} content={whatsappConfig.blogDescription || {}} languages={languages} />
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                        <CardMedia component={whatsappConfig.vdUrl?.includes('/MS/videos/') ? 'video' : 'img'} src={whatsappConfig.vdUrl || defaultAvatar} controls={whatsappConfig.vdUrl?.includes('/MS/videos/')} alt={t('WhatsApp Media')} sx={{
          maxWidth: 400,
          height: 500,
          margin: 'auto',
          objectFit: 'contain'
        }} />
                </TabPanel>
                <TabPanel value={activeTab} index={3}>
                        <CardMedia component="img" image={whatsappConfig.imageUrl || defaultAvatar} alt={t('WhatsApp Config')} sx={{
          maxWidth: 400,
          margin: 'auto'
        }} />
                        <CardContent>
                            <MultiLingualContent t={t} title={t('Image Title')} content={whatsappConfig.imageTitle || {}} languages={languages} />
                            <Divider sx={{
            my: 2
          }} />
                            <MultiLingualContent t={t} title={t('Image Description')} content={whatsappConfig.imageDescription || {}} languages={languages} />
                        </CardContent>
                </TabPanel>
                <TabPanel value={activeTab} index={4}>
                    <FeaturesList t={t} featureOrder={featureOrder} handleOnDragEnd={handleOnDragEnd} languages={languages} />
                </TabPanel>
            </div>
        </Box>;
}
function TabPanel(props) {
  const {
    children,
    value,
    index,
    ...other
  } = props;
  return <div role="tabpanel" hidden={value !== index} id={`whatsapp-tabpanel-${index}`} aria-labelledby={`whatsapp-tab-${index}`} {...other}>
            {value === index && children}
        </div>;
}
function MultiLingualContent({
  t,
  title,
  content,
  languages
}) {
  return <Box>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            {Object.entries(content).map(([langId, text]) => <Tooltip key={langId} title={text} arrow>
                    <Typography variant="body2" gutterBottom>
                        <strong>{languages.find(lang => lang._id === langId)?.name || 'Unknown'}:</strong> {text}
                    </Typography>
                </Tooltip>)}
        </Box>;
}
function FeaturesList({
  t,
  featureOrder,
  handleOnDragEnd,
  languages
}) {
  return <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="features">
                {provided => <div {...provided.droppableProps} ref={provided.innerRef}>
                        {featureOrder.map((feature, index) => <Draggable key={feature._id} draggableId={feature._id} index={index}>
                                {provided => <Box {...provided.dragHandleProps}>
                                        <FeatureItem ref={provided.innerRef} {...provided.draggableProps}>
                                            <IconButton {...provided.dragHandleProps}>
                                                <DragIndicatorIcon />
                                            </IconButton>
                                            <Box flexGrow={1}>
                                                <Typography variant="subtitle1">{t('Feature {number}', {
                    number: index + 1
                  })}</Typography>
                                                <MultiLingualContent t={t} content={feature.txt} languages={languages} />
                                            </Box>
                                            <Box>
                                                <img src={feature.iconUrl || defaultAvatar} alt="icon" style={{
                  width: 32,
                  height: 32,
                  objectFit: 'contain'
                }} />
                                            </Box>
                                        </FeatureItem>
                                    </Box>}
                            </Draggable>)}
                        {provided.placeholder}
                    </div>}
            </Droppable>
        </DragDropContext>;
}
export default WhatsApp;
