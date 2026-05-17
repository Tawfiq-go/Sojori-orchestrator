import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, Box, Typography, Card, CardContent, Switch, Chip, Alert, Button, Divider, Container, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import { getAIConfigs, updateAIConfig } from '../services/serverApi.ai';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';

// Couleurs Sojori - Orange branding
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F6B',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  purple: '#9C27B0',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575'
  }
};
const AIConfigManager = () => {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current user from Redux
  const {
    user
  } = useSelector(state => state.auth);
  const userId = user?._id || user?.id;
  const userRole = user?.role;

  // Check if user is admin (can see all configs) or property manager (see only own config)
  const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
  useEffect(() => {
    fetchConfigs();
  }, []);
  const fetchConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAIConfigs();

      // Si l'API retourne un tableau vide ou undefined, initialiser comme tableau vide
      const allConfigs = Array.isArray(data) ? data : [];
      let filteredData = allConfigs;

      // Pour les Property Managers (non-admin)
      if (!isAdmin && userId) {
        // Chercher la config du PM dans les données
        const userConfig = allConfigs.find(config => config.property_manager_id === userId);
        if (userConfig) {
          // Config existe pour ce PM
          filteredData = [userConfig];
        } else {
          // Pas de config trouvée, créer une config par défaut (AI OFF)

          const defaultConfig = {
            property_manager_id: userId,
            property_manager_name: `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'Property Manager',
            property_manager_email: user?.email || 'N/A',
            enabled: false,
            // AI OFF par défaut
            version: '1.0.0',
            ai_models: {
              primary: 'gpt-4-turbo',
              fallback: 'claude-3-haiku-20240307',
              use_fallback: true,
              max_retries: 2,
              timeout_seconds: 10
            }
          };
          filteredData = [defaultConfig];
          toast.info('Configuration AI par défaut créée (désactivée)', {
            autoClose: 3000
          });
        }
      } else if (isAdmin) {
        // Admin voit tout
        if (allConfigs.length === 0) {
          // Créer une config globale par défaut
          const globalDefault = {
            property_manager_id: null,
            property_manager_name: 'All Listings',
            property_manager_email: 'All Property Managers',
            enabled: false,
            version: '1.0.0',
            ai_models: {
              primary: 'gpt-4-turbo',
              fallback: 'claude-3-haiku-20240307',
              use_fallback: true,
              max_retries: 2,
              timeout_seconds: 10
            }
          };
          filteredData = [globalDefault];
        } else {
          filteredData = allConfigs;
        }
      }
      setConfigs(filteredData);
    } catch (err) {
      setError(err.message || 'Erreur lors de la récupération des configurations');
      toast.error('Erreur de chargement des configurations AI');

      // Même en cas d'erreur, créer une config par défaut pour PM
      if (!isAdmin && userId && user) {
        const defaultConfig = {
          property_manager_id: userId,
          property_manager_name: `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || 'Property Manager',
          property_manager_email: user?.email || 'N/A',
          enabled: false,
          version: '1.0.0',
          ai_models: {
            primary: 'gpt-4-turbo',
            fallback: 'claude-3-haiku-20240307',
            use_fallback: true,
            max_retries: 2,
            timeout_seconds: 10
          }
        };
        setConfigs([defaultConfig]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleToggleAI = async config => {
    const propertyManagerId = config.property_manager_id || 'global';
    const newEnabledState = !config.enabled;
    try {
      await updateAIConfig(propertyManagerId, newEnabledState);
      toast.success(`AI ${newEnabledState ? 'activée' : 'désactivée'} pour ${config.property_manager_name}`);

      // Update local state
      setConfigs(prevConfigs => prevConfigs.map(c => (c.property_manager_id || 'global') === propertyManagerId ? {
        ...c,
        enabled: newEnabledState
      } : c));
    } catch (err) {
      toast.error(`Erreur lors de la mise à jour: ${err.message}`);
    }
  };
  const columns = [{
    field: 'property_manager_name',
    headerName: 'Property Manager',
    flex: 1,
    minWidth: 280,
    renderCell: params => <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5
    }}>
          <Box sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        background: params.row.enabled ? `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryLight} 100%)` : SOJORI_COLORS.gray[200],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease'
      }}>
            <SmartToyIcon fontSize="small" sx={{
          color: params.row.enabled ? '#fff' : SOJORI_COLORS.gray[500]
        }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight="600" sx={{
          color: '#2c3e50'
        }}>
              {params.row.property_manager_name}
            </Typography>
            <Typography variant="caption" sx={{
          color: SOJORI_COLORS.gray[600]
        }}>
              {params.row.property_manager_email}
            </Typography>
          </Box>
        </Box>
  }, {
    field: 'enabled',
    headerName: 'Statut',
    width: 140,
    renderCell: params => <Chip icon={params.row.enabled ? <AutoAwesomeIcon /> : <BlockIcon />} label={params.row.enabled ? 'Actif' : 'Inactif'} sx={{
      bgcolor: params.row.enabled ? SOJORI_COLORS.primaryPale : SOJORI_COLORS.gray[100],
      color: params.row.enabled ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[600],
      fontWeight: 600,
      border: `1px solid ${params.row.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[300]}`,
      '& .MuiChip-icon': {
        color: params.row.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[500]
      }
    }} size="small" />
  }, {
    field: 'ai_models',
    headerName: 'Modèles AI',
    width: 220,
    renderCell: params => <Box>
          <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mb: 0.5
      }}>
            <PsychologyIcon sx={{
          fontSize: 14,
          color: SOJORI_COLORS.info
        }} />
            <Typography variant="caption" fontWeight="500" sx={{
          color: '#2c3e50'
        }}>
              {params.row.ai_models?.primary || 'N/A'}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{
        color: SOJORI_COLORS.gray[600],
        fontSize: '0.7rem'
      }}>
            Fallback: {params.row.ai_models?.fallback || 'N/A'}
          </Typography>
        </Box>
  }, {
    field: 'version',
    headerName: 'Version',
    width: 100,
    renderCell: params => <Chip label={`v${params.row.version}`} size="small" sx={{
      bgcolor: SOJORI_COLORS.gray[100],
      color: SOJORI_COLORS.gray[700],
      fontWeight: 500,
      fontSize: '0.75rem'
    }} />
  }, {
    field: 'actions',
    headerName: 'Activer/Désactiver',
    width: 180,
    sortable: false,
    headerAlign: 'center',
    align: 'center',
    renderCell: params => <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1
    }}>
          <Switch checked={params.row.enabled} onChange={() => handleToggleAI(params.row)} sx={{
        '& .MuiSwitch-switchBase.Mui-checked': {
          color: SOJORI_COLORS.primary
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          backgroundColor: SOJORI_COLORS.primary
        }
      }} />
          <Typography variant="caption" fontWeight="600" sx={{
        color: params.row.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[500]
      }}>
            {params.row.enabled ? 'ON' : 'OFF'}
          </Typography>
        </Box>
  }];
  if (isLoading && configs.length === 0) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" sx={{
      background: `linear-gradient(135deg, ${SOJORI_COLORS.primaryPale} 0%, #fff 100%)`
    }}>
        <Box textAlign="center">
          <CircularProgress sx={{
          color: SOJORI_COLORS.primary,
          mb: 2
        }} size={50} />
          <Typography variant="body2" color="text.secondary">
            Chargement des configurations...
          </Typography>
        </Box>
      </Box>;
  }
  return <Box sx={{
    width: '100%',
    bgcolor: SOJORI_COLORS.gray[50],
    p: 3
  }}>
      <ToastContainer position="top-right" />

      {/* Modern Header with Gradient */}
      <Paper elevation={0} sx={{
      mb: 3,
      p: 3,
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryLight} 100%)`,
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
        <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }} />
        <Box sx={{
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }} />

        <Box sx={{
        position: 'relative',
        zIndex: 1
      }}>
          <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
              <Box sx={{
              width: 60,
              height: 60,
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                <SmartToyIcon sx={{
                fontSize: 32,
                color: '#fff'
              }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="700" gutterBottom sx={{
                mb: 0.5
              }}>
                  Configuration AI Agent
                </Typography>
                <Typography variant="body1" sx={{
                opacity: 0.9
              }}>
                  Gérez l&apos;activation de l&apos;IA par Property Manager
                </Typography>
              </Box>
            </Box>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchConfigs} disabled={isLoading} sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.3)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.3)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            },
            transition: 'all 0.3s ease'
          }}>
              Actualiser
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{
      mb: 3
    }}>
        <Grid item xs={12} md={4}>
          <Card sx={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${SOJORI_COLORS.gray[200]}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}>
            <CardContent sx={{
            p: 3
          }}>
              <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
                <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: SOJORI_COLORS.primaryPale,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                  <SmartToyIcon sx={{
                  color: SOJORI_COLORS.primary,
                  fontSize: 24
                }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700" sx={{
                  color: SOJORI_COLORS.primary
                }}>
                    {configs.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Property Managers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${SOJORI_COLORS.gray[200]}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}>
            <CardContent sx={{
            p: 3
          }}>
              <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
                <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: '#E8F5E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                  <CheckCircleIcon sx={{
                  color: SOJORI_COLORS.success,
                  fontSize: 24
                }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700" sx={{
                  color: SOJORI_COLORS.success
                }}>
                    {configs.filter(c => c.enabled).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    AI Activés
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${SOJORI_COLORS.gray[200]}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}>
            <CardContent sx={{
            p: 3
          }}>
              <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
                <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: SOJORI_COLORS.gray[100],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                  <BlockIcon sx={{
                  color: SOJORI_COLORS.gray[500],
                  fontSize: 24
                }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="700" sx={{
                  color: SOJORI_COLORS.gray[600]
                }}>
                    {configs.filter(c => !c.enabled).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    AI Désactivés
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Card - Modern */}
      <Card sx={{
      mb: 3,
      borderRadius: '16px',
      background: `linear-gradient(135deg, ${SOJORI_COLORS.info}15 0%, ${SOJORI_COLORS.info}08 100%)`,
      border: `1px solid ${SOJORI_COLORS.info}30`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    }}>
        <CardContent sx={{
        p: 3
      }}>
          <Box sx={{
          display: 'flex',
          alignItems: 'start',
          gap: 2
        }}>
            <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: SOJORI_COLORS.info,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
              <PsychologyIcon sx={{
              color: '#fff',
              fontSize: 24
            }} />
            </Box>
            <Box sx={{
            flex: 1
          }}>
              <Typography variant="h6" fontWeight="600" gutterBottom sx={{
              color: '#2c3e50'
            }}>
                À propos de l&apos;AI Agent
              </Typography>
              <Typography variant="body2" sx={{
              color: SOJORI_COLORS.gray[700],
              lineHeight: 1.7,
              mb: 1.5
            }}>
                L&apos;AI Agent utilise <strong>OpenAI GPT-4 Turbo</strong> (primary) et{' '}
                <strong>Claude 3 Haiku</strong> (fallback) pour détecter automatiquement l&apos;intention des
                messages clients en plusieurs langues.
              </Typography>
              {isAdmin && <Typography variant="body2" sx={{
              color: SOJORI_COLORS.gray[600],
              lineHeight: 1.7
            }}>
                  💡 La configuration <strong>&quot;Global&quot;</strong> s&apos;applique à tous les Property
                  Managers qui n&apos;ont pas de configuration spécifique.
                </Typography>}
              {!isAdmin && <Typography variant="body2" sx={{
              color: SOJORI_COLORS.gray[600],
              lineHeight: 1.7
            }}>
                  💡 Activez ou désactivez l&apos;AI Agent pour vos listings en utilisant le switch ci-dessous.
                </Typography>}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && <Alert severity="error" sx={{
      mb: 3,
      borderRadius: '12px',
      border: `1px solid ${SOJORI_COLORS.error}30`
    }} onClose={() => setError(null)}>
          {error}
        </Alert>}

      {/* Table Card - Modern */}
      <Card sx={{
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${SOJORI_COLORS.gray[200]}`,
      overflow: 'hidden'
    }}>
        <Box sx={{
        p: 2.5,
        background: `linear-gradient(90deg, ${SOJORI_COLORS.gray[50]} 0%, #fff 100%)`,
        borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`
      }}>
          <Typography variant="h6" fontWeight="600" sx={{
          color: '#2c3e50'
        }}>
            Configurations AI ({configs.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin ? 'Gérez les configurations AI de tous les Property Managers' : 'Votre configuration AI personnelle'}
          </Typography>
        </Box>
        <CardContent sx={{
        p: 0
      }}>
          {configs.length === 0 ? <Box sx={{
          p: 4,
          textAlign: 'center'
        }}>
              <Typography color="text.secondary">Chargement des configurations...</Typography>
            </Box> : <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{
                bgcolor: SOJORI_COLORS.gray[100]
              }}>
                    <TableCell sx={{
                  fontWeight: 600
                }}>Property Manager</TableCell>
                    <TableCell sx={{
                  fontWeight: 600
                }}>Statut</TableCell>
                    <TableCell sx={{
                  fontWeight: 600
                }}>Modèles AI</TableCell>
                    <TableCell sx={{
                  fontWeight: 600
                }}>Version</TableCell>
                    <TableCell sx={{
                  fontWeight: 600,
                  textAlign: 'center'
                }}>Activer/Désactiver</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs.map((config, index) => <TableRow key={config.property_manager_id || `global-${index}`} sx={{
                '&:hover': {
                  bgcolor: SOJORI_COLORS.gray[50]
                },
                transition: 'background-color 0.2s'
              }}>
                      {/* Property Manager */}
                      <TableCell>
                        <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                          <Box sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: config.enabled ? `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryLight} 100%)` : SOJORI_COLORS.gray[200],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                            <SmartToyIcon fontSize="small" sx={{
                        color: config.enabled ? '#fff' : SOJORI_COLORS.gray[500]
                      }} />
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight="600" sx={{
                        color: '#2c3e50'
                      }}>
                              {config.property_manager_id === null ? 'All Listings' : config.property_manager_name}
                            </Typography>
                            <Typography variant="caption" sx={{
                        color: SOJORI_COLORS.gray[600]
                      }}>
                              {config.property_manager_id === null ? 'All Property Managers' : config.property_manager_email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Chip icon={config.enabled ? <AutoAwesomeIcon /> : <BlockIcon />} label={config.enabled ? 'AI Activée' : 'AI Désactivée'} sx={{
                    bgcolor: config.enabled ? SOJORI_COLORS.primaryPale : SOJORI_COLORS.gray[100],
                    color: config.enabled ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[600],
                    fontWeight: 600,
                    border: `1px solid ${config.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[300]}`,
                    '& .MuiChip-icon': {
                      color: config.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[500]
                    }
                  }} size="small" />
                      </TableCell>

                      {/* Modèles AI */}
                      <TableCell>
                        <Box>
                          <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.5
                    }}>
                            <PsychologyIcon sx={{
                        fontSize: 14,
                        color: SOJORI_COLORS.info
                      }} />
                            <Typography variant="caption" fontWeight="500" sx={{
                        color: '#2c3e50'
                      }}>
                              {config.ai_models?.primary || 'N/A'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{
                      color: SOJORI_COLORS.gray[600],
                      fontSize: '0.7rem'
                    }}>
                            Fallback: {config.ai_models?.fallback || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Version */}
                      <TableCell>
                        <Chip label={`v${config.version}`} size="small" sx={{
                    bgcolor: SOJORI_COLORS.gray[100],
                    color: SOJORI_COLORS.gray[700],
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }} />
                      </TableCell>

                      {/* Switch */}
                      <TableCell sx={{
                  textAlign: 'center'
                }}>
                        <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}>
                          <Switch checked={config.enabled} onChange={() => handleToggleAI(config)} sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: SOJORI_COLORS.primary
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: SOJORI_COLORS.primary
                      }
                    }} />
                          <Typography variant="caption" fontWeight="600" sx={{
                      color: config.enabled ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[500]
                    }}>
                            {config.enabled ? 'ON' : 'OFF'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </TableContainer>}
        </CardContent>
      </Card>
    </Box>;
};
export default AIConfigManager;
