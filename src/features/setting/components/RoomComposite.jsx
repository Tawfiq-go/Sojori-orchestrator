import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getRoomComposites, updateRoomComposite, createRoomComposite } from '../services/serverApi.adminConfig';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { CircularProgress, Paper, Typography, Switch } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ModifyRoomComposite from './ModifyRoomComposite';
function RoomComposite() {
  const {
    t
  } = useTranslation('common'); // Use common namespace
  const [composites, setComposites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedComposite, setSelectedComposite] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fetchRoomComposites = async () => {
    setIsLoading(true);
    try {
      const response = await getRoomComposites();
      if (response.data) {
        if (response.data.success) {
          const rooms = response.data.data?.rooms || response.data.rooms || [];
          setComposites(rooms);
        } else {
          if (response.data.message) {
            toast.info(response.data.message);
          }
          setComposites([]);
        }
      } else {
        setComposites([]);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('error.fetchRoomComposites');
      toast.error(errorMessage);
      setComposites([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchRoomComposites();
  }, []);
  const handleCreate = async () => {
    try {
      const response = await createRoomComposite();
      if (response.data && response.data.sucess) {
        toast.success(response.data.message || t('success.createRoomComposites'));
        await fetchRoomComposites();
      } else {
        const message = response.data?.message || t('error.createRoomComposites');
        toast.error(message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('error.createRoomComposites');
      toast.error(errorMessage);
    }
  };
  const onDragEnd = async result => {
    if (!result.destination) return;
    const items = Array.from(composites);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setComposites(updatedItems);
    setIsUpdating(true);
    try {
      const response = await updateRoomComposite({
        rooms: updatedItems
      });
      if (response.data && response.data.success) {
        toast.success(t('success.updateRoomOrder'));
        if (response.data.data && response.data.data.rooms) {
          setComposites(response.data.data.rooms);
        }
      } else {
        const message = response.data?.message || t('error.updateRoomOrder');
        toast.error(message);
        fetchRoomComposites();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || t('error.updateRoomOrder');
      toast.error(errorMessage);
      fetchRoomComposites();
    } finally {
      setIsUpdating(false);
    }
  };
  const handleEdit = composite => {
    setSelectedComposite(composite);
    setIsEditDialogOpen(true);
  };
  const handleEditSuccess = () => {
    fetchRoomComposites();
    setIsEditDialogOpen(false);
    setSelectedComposite(null);
  };
  const handleSwitchChange = async (composite, field, value) => {
    try {
      const updatedComposites = composites.map(item => item.rentalId === composite.rentalId ? {
        ...item,
        [field]: value
      } : item);
      const response = await updateRoomComposite({
        rooms: updatedComposites
      });
      if (response.data && response.data.success) {
        toast.success(t('success.updateRoomComposite'));
        setComposites(updatedComposites);
      } else {
        toast.error(response.data?.message || t('error.updateRoomComposite'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('error.updateRoomComposite'));
    }
  };
  return <Box sx={{
    mx: 'auto',
    pb: 4
  }}>
      <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3,
      px: 1
    }}>
        <Typography variant="h5" component="h1" sx={{
        fontWeight: 600
      }}>
          {t('Room Composites')}
        </Typography>
        
        {composites.length === 0 && <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={isLoading || isUpdating} className="!text-white" sx={{
        background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
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
          background: 'linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%)'
        },
        '&:active': {
          transform: 'translateY(0)'
        }
      }}>
            {t('Create Room Composites')}
          </Button>}
      </Box>

      <ToastContainer position="top-right" autoClose={3000} />
      
      {isLoading ? <Box display="flex" justifyContent="center" alignItems="center" sx={{
      minHeight: '400px',
      backgroundColor: '#fafafa',
      borderRadius: '12px',
      border: '1px solid #f0f0f0'
    }}>
          <CircularProgress sx={{
        color: '#00b4b4'
      }} />
        </Box> : composites.length === 0 ? <Paper elevation={0} sx={{
      p: 5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      backgroundColor: '#fafafa',
      borderRadius: '12px',
      border: '1px solid #f0f0f0'
    }}>
          <Typography variant="h6" sx={{
        color: '#666',
        mb: 2,
        fontWeight: 500
      }}>
            {t('No room composites found')}
          </Typography>
          <Typography variant="body1" sx={{
        color: '#888',
        mb: 3,
        textAlign: 'center',
        maxWidth: '500px'
      }}>
            {t('Create room composites to define different types of rooms in your properties.')}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={isLoading || isUpdating} className="!text-white" sx={{
        background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
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
          background: 'linear-gradient(135deg, #E55A2B 0%, #FF6B35 100%)'
        },
        '&:active': {
          transform: 'translateY(0)'
        }
      }}>
            {t('Create Room Composites')}
          </Button>
        </Paper> : <Paper elevation={0} sx={{
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #f0f0f0'
    }}>
          <Box sx={{
        p: 3,
        backgroundColor: '#fafafa',
        borderBottom: '1px solid #f0f0f0'
      }}>
            <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
              <Box>
                <Typography variant="h6" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                  {t('Room Composites Overview')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {composites.length}{t(' room types defined')}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{
        p: 3
      }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="composites">
                {provided => <Box {...provided.droppableProps} ref={provided.innerRef} sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
                    {composites.map((composite, index) => <Draggable key={composite.rentalId} draggableId={composite.rentalId} index={index}>
                        {(provided, snapshot) => <Paper ref={provided.innerRef} {...provided.draggableProps} elevation={0} sx={{
                  p: 2,
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  backgroundColor: snapshot.isDragging ? 'rgba(0, 180, 180, 0.04)' : 'white',
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }
                }}>
                            <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                              <Box {...provided.dragHandleProps}>
                                <DragIndicatorIcon sx={{
                        color: '#bbb'
                      }} />
                              </Box>
                              
                              <Box sx={{
                      flexGrow: 1
                    }}>
                                <Box sx={{
                        mb: 1
                      }}>
                                  <Typography variant="body2" color="text.secondary" component="span" sx={{
                          fontWeight: 500
                        }}>
                                    {t('Rental ID: ')}
                                  </Typography>
                                  <Typography variant="body2" component="span" sx={{
                          ml: 1
                        }}>
                                    {composite.rentalId}
                                  </Typography>
                                </Box>
                                <Box sx={{
                        mb: 1
                      }}>
                                  <Typography variant="body2" color="text.secondary" component="span" sx={{
                          fontWeight: 500
                        }}>
                                    {t('Rental Name: ')}
                                  </Typography>
                                  <Typography variant="body2" component="span" sx={{
                          ml: 1
                        }}>
                                    {composite.roomName}
                                  </Typography>
                                </Box>
                                {composite.RoomNameSojori && <Box sx={{
                        mt: 1
                      }}>
                                    <Box sx={{
                          mb: 0.5
                        }}>
                                      <Typography variant="body2" color="text.secondary" component="span" sx={{
                            fontWeight: 500
                          }}>
                                        {t('English Sojori Name: ')}
                                      </Typography>
                                      <Typography variant="body2" component="span" sx={{
                            ml: 1
                          }}>
                                        {composite.RoomNameSojori.en}
                                      </Typography>
                                    </Box>
                                    <Box sx={{
                          mb: 0.5
                        }}>
                                      <Typography variant="body2" color="text.secondary" component="span" sx={{
                            fontWeight: 500
                          }}>
                                        {t('French Sojori Name: ')}
                                      </Typography>
                                      <Typography variant="body2" component="span" sx={{
                            ml: 1
                          }}>
                                        {composite.RoomNameSojori.fr}
                                      </Typography>
                                    </Box>
                                    <Box sx={{
                          mb: 0.5
                        }}>
                                      <Typography variant="body2" color="text.secondary" component="span" sx={{
                            fontWeight: 500
                          }}>
                                        {t('Spanish Sojori Name: ')}
                                      </Typography>
                                      <Typography variant="body2" component="span" sx={{
                            ml: 1
                          }}>
                                        {composite.RoomNameSojori.es}
                                      </Typography>
                                    </Box>
                                  </Box>}
                              </Box>
                              
                              <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                                <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                                  <Typography variant="body2">{t('Enable')}</Typography>
                                  <Switch checked={composite.enable} onChange={e => handleSwitchChange(composite, 'enable', e.target.checked)} sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#00b4b4',
                            '& + .MuiSwitch-track': {
                              backgroundColor: '#00b4b4'
                            }
                          }
                        }} />
                                </Box>
                                
                                <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                                  <Typography variant="body2">{t('Use Bed')}</Typography>
                                  <Switch checked={composite.useBed} onChange={e => handleSwitchChange(composite, 'useBed', e.target.checked)} sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#00b4b4',
                            '& + .MuiSwitch-track': {
                              backgroundColor: '#00b4b4'
                            }
                          }
                        }} />
                                </Box>

                                <IconButton onClick={() => handleEdit(composite)} sx={{
                        color: '#00b4b4',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 180, 180, 0.08)'
                        }
                      }}>
                                  <ModeEditOutlineOutlinedIcon />
                                </IconButton>
                              </Box>
                            </Box>
                          </Paper>}
                      </Draggable>)}
                    {provided.placeholder}
                  </Box>}
              </Droppable>
            </DragDropContext>
          </Box>
        </Paper>}

      <ModifyRoomComposite open={isEditDialogOpen} onClose={() => {
      setIsEditDialogOpen(false);
      setSelectedComposite(null);
    }} selectedComposite={selectedComposite} allComposites={composites} isCreating={false} onSuccess={handleEditSuccess} />
    </Box>;
}
export default RoomComposite;
