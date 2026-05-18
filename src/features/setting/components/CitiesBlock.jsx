import React, { useState, useEffect, useCallback, Component } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AppsIcon from "@mui/icons-material/Apps";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Card, CardContent, CardActions, CardMedia, Container, Paper, Stack, TextField, Typography, Select, MenuItem, CircularProgress, Pagination, IconButton, Tooltip, Chip, OutlinedInput, InputAdornment, ToggleButtonGroup, ToggleButton, Switch } from "@mui/material";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { getcities, removeCity, updateCity, getLanguages, getcountries } from '../services/serverApi.adminConfig';
import AddCityDialog from './AddCity-new.component';
import ModifyCityDialog from './ModifyCity-new.component';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { debounce } from 'lodash';
import defaultImage from 'assets/images/image_placeholder.jpg';
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
};
class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  render() {
    if (this.state.hasError) {
      return <Box sx={{
        p: 3,
        color: "red"
      }}>
          <Typography variant="h6">Error in CitiesBlock</Typography>
          <Typography>{this.state.error?.message || "Unknown error"}</Typography>
        </Box>;
    }
    return this.props.children;
  }
}
function CitiesBlock() {
  const {
    t
  } = useTranslation('common');
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCityIndex, setSelectedCityIndex] = useState(null);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(4);
  const [totalCount, setTotalCount] = useState(0);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [isFrench, setIsFrench] = useState(false);
  const debouncedSearch = useCallback(debounce(text => {
    setSearchText(text);
    setPage(0);
  }, 500), []);
  const handleLanguageChange = (event, newValue) => {
    if (newValue !== null) {
      setIsFrench(newValue === "fr");
    }
  };
  useEffect(() => {
    fetchCountries();
    fetchLanguages();
    fetchCities();
  }, []);
  useEffect(() => {
    fetchCities();
  }, [selectedCountries, page, searchText]);
  const fetchCountries = async () => {
    try {
      const response = await getcountries();
      setCountries(response.data);
    } catch (error) {
      toast.error(t('Failed to fetch countries'));
    }
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed to fetch languages'));
    }
  };
  const fetchCities = async () => {
    setIsLoading(true);
    try {
      const countryIds = selectedCountries.map(country => country._id);
      const response = await getcities(page, limit, true, countryIds, searchText, true);
      if (response.data.cities && Array.isArray(response.data.cities)) {
        setCities(response.data.cities);
        setTotalCount(response.data.total || 0);
        setIsNextDisabled((page + 1) * limit >= response.data.total);
      } else if (response.data.message === "No Cities Found") {
        setCities([]);
        setTotalCount(0);
        toast.info(t('No cities found for the selected filters'));
      } else if (Array.isArray(response.data)) {
        setCities(response.data);
        setTotalCount(response.data.length);
        setIsNextDisabled(true);
      } else {
        setCities([]);
        setTotalCount(0);
      }
    } catch (error) {
      setCities([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearchChange = event => {
    debouncedSearch(event.target.value);
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleCountryChange = event => {
    const selectedIds = event.target.value;
    const selectedCountryObjects = countries.filter(country => selectedIds.includes(country._id));
    setSelectedCountries(selectedCountryObjects);
    setPage(0);
  };
  const handleOpenAddDialog = () => setOpenAddDialog(true);
  const handleCloseAddDialog = () => setOpenAddDialog(false);
  const handleOpenModifyDialog = (city, index) => {
    setSelectedCity(city);
    setSelectedCityIndex(index);
    setOpenModifyDialog(true);
  };
  const handleCloseModifyDialog = () => {
    setSelectedCity(null);
    setSelectedCityIndex(null);
    setOpenModifyDialog(false);
  };
  const handleDeleteCity = async cityId => {
    if (window.confirm(t('Are you sure you want to delete this city?'))) {
      try {
        await removeCity(cityId);
        fetchCities();
        toast.success(t('City deleted successfully'));
      } catch (error) {
        toast.error(t('Failed to delete city'));
      }
    }
  };
  const addCity = newCity => {
    fetchCities();
    handleCloseAddDialog();
    toast.success(t('City added successfully'));
  };
  const handleUpdateCity = updatedCity => {
    fetchCities();
    toast.success(t('City updated successfully'));
  };
  const editSwitch = (key, value, cityId) => {
    const updatedCities = cities.map(city => {
      if (city._id === cityId) {
        return {
          ...city,
          [key]: value
        };
      }
      return city;
    });
    setCities(updatedCities);
    const cityToUpdate = updatedCities.find(city => city._id === cityId);
    if (cityToUpdate) {
      const {
        _id,
        ...itemToUpdate
      } = cityToUpdate;
      updateCity(_id, itemToUpdate).then(({
        data
      }) => {
        toast.success(t(`${key} has been updated`));
      }).catch(error => {
        toast.error(t(`Failed to update ${key}`));
      });
    }
  };
  const renderDescription = description => {
    const frenchLangId = languages.find(l => l.languageCode === "FR")?._id;
    const englishLangId = languages.find(l => l.languageCode === "en")?._id;
    const selectedLangId = isFrench ? frenchLangId : englishLangId;
    return description?.[selectedLangId] || description?.[englishLangId] || t('No description available');
  };
  if (error) {
    return <DashboardLayout>
        <ErrorBoundary>
          <Box sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "white",
          px: "11%",
          py: "2%"
        }}>
            <Typography variant="body1" color="error">
              {error}
            </Typography>
          </Box>
        </ErrorBoundary>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <ErrorBoundary>
        <Box sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        bgcolor: "white",
        px: "11%",
        py: "2%"
      }}>
          <MDBox py={3} className="!bg-white py-0">
            <Container maxWidth={false} sx={{
            maxWidth: 976,
            px: 0
          }}>
              <Stack spacing={7} sx={{
              py: 7
            }}>
                <Paper elevation={1} sx={{
                maxWidth: 976,
                width: "100%",
                mx: "auto",
                border: 1,
                borderColor: "grey.300",
                borderRadius: 2,
                overflow: "hidden"
              }}>
                  <Box sx={{
                  background: "linear-gradient(90deg, rgba(18,161,144,0.1) 0%, rgba(18,161,144,0) 50%, rgba(18,161,144,0) 100%)",
                  borderBottom: 1,
                  borderColor: "grey.300",
                  p: 3
                }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AppsIcon sx={{
                        fontSize: 16,
                        color: "#00B4B4"
                      }} />
                        <Typography variant="h6" sx={{
                        fontWeight: 600,
                        fontSize: 16.6,
                        letterSpacing: "-0.45px",
                        color: "#131a20"
                      }}>
                          {t("Cities Editor")}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ToggleButtonGroup value={isFrench ? "fr" : "en"} exclusive onChange={handleLanguageChange} size="small" sx={{
                        "& .MuiToggleButton-root": {
                          border: "1px solid",
                          borderColor: "grey.300",
                          color: "#131a20",
                          fontWeight: 500,
                          fontSize: "0.75rem",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 4
                        },
                        "& .MuiToggleButton-root.Mui-selected": {
                          backgroundColor: "#00B4B4",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#0e8a7a"
                          }
                        }
                      }}>
                          <ToggleButton value="en">{t("EN")}</ToggleButton>
                          <ToggleButton value="fr">{t("FR")}</ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title={t("Add City")}>
                          <IconButton sx={{
                          backgroundColor: "#12a190",
                          color: "white !important",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }} onClick={handleOpenAddDialog}>
                            <AddCircleIcon sx={{
                            fontSize: 20
                          }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>

                  <Box sx={{
                  p: 3
                }}>
                    <Typography variant="h4" component="h1" gutterBottom sx={{
                    fontSize: 24,
                    fontWeight: 600
                  }}>
                      {t("Cities Management")}
                    </Typography>

                    <Paper sx={{
                    p: 2.5,
                    border: "1px solid",
                    borderColor: "grey.300",
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fdfd 100%)",
                    boxShadow: "0 8px 32px rgba(0, 180, 180, 0.08)",
                    mb: 3
                  }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{
                        flex: 1
                      }}>
                          <Typography variant="body2" fontWeight={600} sx={{
                          mb: 1,
                          fontSize: "13px"
                        }}>
                            {t("Filter by Country")}
                          </Typography>
                          <Select multiple value={selectedCountries.map(country => country._id)} onChange={handleCountryChange} input={<OutlinedInput />} renderValue={selected => <Box sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5
                        }}>
                                {selected.map(value => {
                            const country = countries.find(c => c._id === value);
                            return <Chip key={value} label={country ? country.name : t('Unknown')} size="small" sx={{
                              backgroundColor: "rgba(0, 180, 180, 0.1)",
                              color: "#00B4B4",
                              fontSize: "0.75rem"
                            }} />;
                          })}
                              </Box>} MenuProps={MenuProps} sx={{
                          width: "100%",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "grey.300"
                          }
                        }}>
                            {countries.map(country => <MenuItem key={country._id} value={country._id}>
                                {country.name}
                              </MenuItem>)}
                          </Select>
                        </Box>

                        <Box sx={{
                        flex: 1
                      }}>
                          <Typography variant="body2" fontWeight={600} sx={{
                          mb: 1,
                          fontSize: "13px"
                        }}>
                            {t("Search by city name")}
                          </Typography>
                          <TextField fullWidth variant="outlined" size="small" onChange={handleSearchChange} InputProps={{
                          startAdornment: <InputAdornment position="start">
                                  <SearchIcon sx={{
                              color: "#00B4B4"
                            }} />
                                </InputAdornment>
                        }} sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "grey.300"
                          }
                        }} />
                        </Box>
                      </Stack>
                    </Paper>

                    {isLoading ? <Box sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200
                  }}>
                        <CircularProgress sx={{
                      color: "#00B4B4"
                    }} />
                      </Box> : cities.length > 0 ? <Box sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 3,
                    mb: 3
                  }}>
                        {cities.map((city, index) => <Card key={city._id || index} sx={{
                      position: "relative",
                      borderRadius: 3,
                      overflow: "hidden",
                      background: "linear-gradient(135deg, #ffffff 0%, #f8fdfd 100%)",
                      border: "2px solid transparent",
                      backgroundClip: "padding-box",
                      boxShadow: "0 8px 32px rgba(0, 180, 180, 0.08)",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "4px",
                        background: `linear-gradient(90deg, #00B4B4 0%, #12a190 50%, #0e8a7a 100%)`,
                        zIndex: 1
                      }
                    }}>
                            <Box sx={{
                        background: "linear-gradient(135deg, rgba(0, 180, 180, 0.05) 0%, rgba(18, 161, 144, 0.02) 100%)",
                        p: 2.5,
                        borderBottom: "1px solid rgba(0, 180, 180, 0.1)"
                      }}>
                              <Box sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 1
                        }}>
                                <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "linear-gradient(45deg, #00B4B4, #12a190)",
                            boxShadow: "0 2px 8px rgba(0, 180, 180, 0.3)"
                          }} />
                                <Typography variant="h6" sx={{
                            fontWeight: 700,
                            fontSize: "1.1rem",
                            background: "linear-gradient(135deg, #131a20 0%, #2c3e50 100%)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            letterSpacing: "-0.02em"
                          }}>
                                  {city.name}
                                </Typography>
                              </Box>
                            </Box>

                            <CardContent sx={{
                        p: 2.5
                      }}>
                              <Box sx={{
                          position: "relative",
                          mb: 2,
                          height: 150,
                          width: "100%",
                          overflow: "hidden"
                        }}>
                                <CardMedia component="img" height={150} image={city.imageUrl || defaultImage} sx={{
                            borderRadius: 2,
                            border: "1px solid rgba(0, 180, 180, 0.2)",
                            objectFit: "cover",
                            width: "100%",
                            maxWidth: "100%",
                            height: "100%"
                          }} />
                              </Box>
                              <Stack spacing={1} sx={{
                          ml: 2.5
                        }}>
                                <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                                  <Typography variant="body2" fontWeight={700} color="#131a20">
                                    {t("Description")}:
                                  </Typography>
                                  <Typography variant="body2" sx={{
                              fontSize: "0.9rem",
                              fontWeight: 400,
                              color: "#4a5568",
                              lineHeight: 1.6,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}>
                                    {renderDescription(city.description)}
                                  </Typography>
                                </Box>
                                {city.gpsPosition && <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                                    <Typography variant="body2" fontWeight={700} color="#131a20">
                                      {t("GPS Position")}:
                                    </Typography>
                                    <Typography variant="body2" sx={{
                              fontSize: "0.9rem",
                              color: "#4a5568"
                            }}>
                                      {city.gpsPosition.lat}, {city.gpsPosition.lng}
                                    </Typography>
                                  </Box>}
                                <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1
                          }}>
                                  <Typography variant="body2" fontWeight={700} color="#131a20">
                                    {t("Country")}:
                                  </Typography>
                                  <Typography variant="body2" sx={{
                              fontSize: "0.9rem",
                              color: "#4a5568"
                            }}>
                                    {city.country && city.country.length > 0 ? city.country[0].name : countries.find(c => c._id === city.countryId)?.name || t('Unknown')}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>

                            <CardActions sx={{
                        justifyContent: "flex-end",
                        p: 2.5,
                        pt: 0,
                        gap: 1.5
                      }}>
                              <Tooltip title={t("Display on Main Screen")}>
                                <Switch checked={city.toDisplayedInMainScreen} onChange={e => editSwitch('toDisplayedInMainScreen', e.target.checked, city._id)} sx={{
                            transform: "scale(0.8)",
                            "& .MuiSwitch-switchBase": {
                              color: "#d1d5db",
                              "&.Mui-checked": {
                                color: "#12a190"
                              },
                              "&.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#12a190"
                              }
                            }
                          }} />
                              </Tooltip>
                              <Tooltip title={t("Active")}>
                                <Switch checked={city.usedInSojoriSysytem} onChange={e => editSwitch('usedInSojoriSysytem', e.target.checked, city._id)} sx={{
                            transform: "scale(0.8)",
                            "& .MuiSwitch-switchBase": {
                              color: "#d1d5db",
                              "&.Mui-checked": {
                                color: "#12a190"
                              },
                              "&.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: "#12a190"
                              }
                            }
                          }} />
                              </Tooltip>
                              <Tooltip title={t("Edit")}>
                                <IconButton sx={{
                            background: "linear-gradient(135deg, #00B4B4 0%, #12a190 100%)",
                            color: "white",
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: "0 4px 16px rgba(0, 180, 180, 0.25)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #0e8a7a 0%, #0f7a6b 100%)",
                              boxShadow: "0 6px 20px rgba(0, 180, 180, 0.35)"
                            }
                          }} onClick={() => handleOpenModifyDialog(city, index)}>
                                  <EditNoteIcon sx={{
                              fontSize: 20
                            }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("Delete")}>
                                <IconButton sx={{
                            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "white",
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            boxShadow: "0 4px 16px rgba(239, 68, 68, 0.25)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                              boxShadow: "0 6px 20px rgba(239, 68, 68, 0.35)"
                            }
                          }} onClick={() => handleDeleteCity(city._id)}>
                                  <DeleteForeverIcon sx={{
                              fontSize: 20
                            }} />
                                </IconButton>
                              </Tooltip>
                            </CardActions>
                          </Card>)}
                      </Box> : <Box sx={{
                    textAlign: "center",
                    py: 4
                  }}>
                        <Typography variant="body1" color="text.secondary">
                          {searchText ? t('No cities found matching', {
                        searchText
                      }) : selectedCountries.length > 0 ? t('No cities found for the selected', {
                        count: selectedCountries.length
                      }) : t('No cities found. Please add a new city.')}
                        </Typography>
                      </Box>}

                    {!isLoading && cities.length > 0 && <Box sx={{
                    mt: 3,
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 2
                  }}>
                        <Pagination count={Math.ceil(totalCount / limit)} page={page + 1} onChange={(event, newPage) => handlePageChange(newPage - 1)} sx={{
                      "& .MuiPaginationItem-root": {
                        fontSize: 12.7,
                        color: "#131a20",
                        "&.Mui-selected": {
                          backgroundColor: "#12a190",
                          color: "white",
                          "&:hover": {
                            backgroundColor: "#0f8a7a"
                          }
                        }
                      }
                    }} />
                      </Box>}
                  </Box>
                </Paper>
                <ToastContainer position="top-right" autoClose={3000} />
                <AddCityDialog open={openAddDialog} onClose={handleCloseAddDialog} addCity={addCity} />
                <ModifyCityDialog open={openModifyDialog} onClose={handleCloseModifyDialog} onUpdateCity={handleUpdateCity} dataCity={selectedCity} />
              </Stack>
            </Container>
          </MDBox>
        </Box>
      </ErrorBoundary>
    </DashboardLayout>;
}
export default CitiesBlock;
