import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import BusinessIcon from "@mui/icons-material/Business";
import CopyrightIcon from "@mui/icons-material/Copyright";
import EditIcon from "@mui/icons-material/Edit";
import HelpIcon from "@mui/icons-material/Help";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import ShareIcon from "@mui/icons-material/Share";
import TwitterIcon from "@mui/icons-material/Twitter";
import LanguageIcon from "@mui/icons-material/Language";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import ImageIcon from "@mui/icons-material/Image";
import { Box, Grid, Link, Paper, Stack, Switch, TextField, Typography, Container, CircularProgress, ToggleButtonGroup, ToggleButton, IconButton } from "@mui/material";
import DashboardLayout from "components/LayoutContainers/DashboardLayout";
import MDBox from "components/MDBox";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getFooterConfig } from '../services/serverApi.adminConfig';
import FooterConfigDialog from './FooterConfigDialog';
const socialLinksData = [{
  icon: TwitterIcon,
  type: "twitter",
  placeholder: "https://twitter.com"
}, {
  icon: InstagramIcon,
  type: "instagram",
  placeholder: "https://instagram.com"
}, {
  icon: FacebookIcon,
  type: "facebook",
  placeholder: "https://facebook.com"
}, {
  icon: LinkedInIcon,
  type: "linkedin",
  placeholder: "https://linkedin.com"
}];
const companyLinksData = [{
  key: "propos"
}, {
  key: "bepartenair"
}, {
  key: "nouvelles"
}, {
  key: "carrière"
}, {
  key: "presse"
}];
const FooterBlock = () => {
  const {
    t
  } = useTranslation('common');
  const [footerConfig, setFooterConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [socialLinksEnabled, setSocialLinksEnabled] = useState(true);
  const [assistanceEnabled, setAssistanceEnabled] = useState(true);
  const [languageEnabled, setLanguageEnabled] = useState(true);
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [legalEnabled, setLegalEnabled] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const handleLanguageChange = (event, newValue) => {
    if (newValue !== null) {
      setSelectedLanguage(newValue);
    }
  };
  const handleConfigUpdate = useCallback(newConfig => {
    setFooterConfig({
      ...newConfig
    });
    setOpenDialog(false);
  }, []);
  useEffect(() => {
    const fetchFooterConfig = async () => {
      setIsLoading(true);
      try {
        const response = await getFooterConfig();
        if (response.success && response.footerConfig) {
          setFooterConfig(response.footerConfig);
        } else {
          setFooterConfig(null);
          toast.info(t('No footer configuration found'));
        }
      } catch (error) {
        setFooterConfig(null);
        toast.error(t('Failed to fetch footer configuration'));
      } finally {
        setIsLoading(false);
      }
    };
    if (openDialog) {
      fetchFooterConfig();
    }
  }, [openDialog]);
  const renderTranslatedText = textObj => {
    return textObj?.[selectedLanguage] || textObj?.en || t('No text available');
  };
  return <DashboardLayout>
      <Box sx={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      bgcolor: "white",
      px: "4%",
      py: "1%"
    }}>
        <MDBox py={2} className="!bg-white py-0">
          <Container maxWidth={false} sx={{
          maxWidth: 976,
          px: 0
        }}>
            <Stack spacing={3} sx={{
            py: 3
          }}>
              <Paper elevation={1} sx={{
              width: "100%",
              maxWidth: 976,
              mx: "auto",
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.300"
            }}>
                <Box sx={{
                background: "linear-gradient(90deg, rgba(18,161,144,0.1) 0%, rgba(18,161,144,0) 50%, rgba(18,161,144,0) 100%)",
                borderBottom: "1px solid",
                borderColor: "grey.300",
                p: 2
              }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EditIcon sx={{
                      fontSize: 16,
                      color: "text.primary"
                    }} />
                      <Typography variant="h6" fontWeight={600} fontSize="17px" color="text.primary">
                        {t("Footer Editor")}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton onClick={() => setOpenDialog(true)} sx={{
                      backgroundColor: "#12a190",
                      color: "#ffffff",
                      "&:hover": {
                        backgroundColor: "#0f8a7a"
                      }
                    }}>
                        <EditIcon />
                      </IconButton>
                      <ToggleButtonGroup value={selectedLanguage} exclusive onChange={handleLanguageChange} size="small" sx={{
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
                        backgroundColor: "#12a190",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "#0f8a7a"
                        }
                      }
                    }}>
                        <ToggleButton value="en">{t("EN")}</ToggleButton>
                        <ToggleButton value="fr">{t("FR")}</ToggleButton>
                        <ToggleButton value="ar">{t("AR")}</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                  </Stack>
                </Box>

             
                <Box sx={{
                p: 2
              }}>
                  {isLoading ? <Box sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: 150
                }}>
                      <CircularProgress sx={{
                    color: "#12a190"
                  }} />
                    </Box> : footerConfig ? <Grid container spacing={1.5}>
                    
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BusinessIcon sx={{
                          fontSize: 16,
                          color: "text.primary"
                        }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {renderTranslatedText(footerConfig.company?.title) || t("Company")}
                            </Typography>
                          </Stack>
                          <Stack spacing={1}>
                            {companyLinksData.map((link, index) => footerConfig.company?.[link.key]?.[selectedLanguage] && <TextField key={index} value={renderTranslatedText(footerConfig.company[link.key])} variant="outlined" size="small" fullWidth InputProps={{
                          readOnly: true
                        }} />)}
                          </Stack>
                        </Stack>
                      </Grid>

                  
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ShareIcon sx={{
                            fontSize: 16,
                            color: "text.primary"
                          }} />
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {renderTranslatedText(footerConfig.reseaux?.title) || t("Social Links")}
                              </Typography>
                            </Stack>
                            <Switch checked={socialLinksEnabled} onChange={e => setSocialLinksEnabled(e.target.checked)} sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#fff",
                            "& + .MuiSwitch-track": {
                              backgroundColor: "#12a190"
                            }
                          }
                        }} />
                          </Stack>
                          {socialLinksEnabled && <Stack spacing={1}>
                              {socialLinksData.map((social, index) => {
                          const IconComponent = social.icon;
                          const socialLink = footerConfig.reseaux?.socialLinks?.find(link => link.type === social.type);
                          return socialLink?.url && <Stack key={index} direction="row" spacing={1} alignItems="center">
                                      <IconComponent sx={{
                              fontSize: 18,
                              color: "text.secondary"
                            }} />
                                      <TextField value={socialLink.url} variant="outlined" size="small" fullWidth type="url" InputProps={{
                              readOnly: true
                            }} />
                                    </Stack>;
                        })}
                            </Stack>}
                        </Stack>
                      </Grid>

                 
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <LanguageIcon sx={{
                            fontSize: 16,
                            color: "text.primary"
                          }} />
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {renderTranslatedText(footerConfig.lang?.title) || t("Language")}
                              </Typography>
                            </Stack>
                            <Switch checked={languageEnabled} onChange={e => setLanguageEnabled(e.target.checked)} sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#fff",
                            "& + .MuiSwitch-track": {
                              backgroundColor: "#12a190"
                            }
                          }
                        }} />
                          </Stack>
                          {languageEnabled && <Stack spacing={1}>
                              {footerConfig.lang?.languages?.map((lang, index) => <TextField key={index} value={`${lang.name} (${lang.languageCode})`} variant="outlined" size="small" fullWidth InputProps={{
                          readOnly: true
                        }} />)}
                            </Stack>}
                        </Stack>
                      </Grid>

                 
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <MonetizationOnIcon sx={{
                            fontSize: 16,
                            color: "text.primary"
                          }} />
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {renderTranslatedText(footerConfig.curr?.title) || t("Currency")}
                              </Typography>
                            </Stack>
                            <Switch checked={currencyEnabled} onChange={e => setCurrencyEnabled(e.target.checked)} sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#fff",
                            "& + .MuiSwitch-track": {
                              backgroundColor: "#12a190"
                            }
                          }
                        }} />
                          </Stack>
                          {currencyEnabled && <Stack spacing={1}>
                              {footerConfig.curr?.currencies?.map((curr, index) => <TextField key={index} value={`${curr.currencyCode} (${curr.currencySymbol})`} variant="outlined" size="small" fullWidth InputProps={{
                          readOnly: true
                        }} />)}
                            </Stack>}
                        </Stack>
                      </Grid>

                
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <ImageIcon sx={{
                          fontSize: 16,
                          color: "text.primary"
                        }} />
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              {t("General")}
                            </Typography>
                          </Stack>
                          {footerConfig.logoUrl && <TextField value={footerConfig.logoUrl} variant="outlined" size="small" fullWidth type="url" InputProps={{
                        readOnly: true
                      }} />}
                          {footerConfig.currentYear && <TextField value={footerConfig.currentYear} variant="outlined" size="small" fullWidth InputProps={{
                        readOnly: true
                      }} />}
                        </Stack>
                      </Grid>

                 
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CopyrightIcon sx={{
                            fontSize: 16,
                            color: "text.primary"
                          }} />
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {t("Legal")}
                              </Typography>
                            </Stack>
                            <Switch checked={legalEnabled} onChange={e => setLegalEnabled(e.target.checked)} sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#fff",
                            "& + .MuiSwitch-track": {
                              backgroundColor: "#12a190"
                            }
                          }
                        }} />
                          </Stack>
                          {legalEnabled && <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <TextField value={renderTranslatedText(footerConfig.legal?.copyright)} variant="outlined" size="small" sx={{
                          flexGrow: 1,
                          mr: 2
                        }} InputProps={{
                          readOnly: true
                        }} />
                              <Stack direction="row" spacing={2}>
                                {footerConfig.termsOfServiceUrl && <Link href={footerConfig.termsOfServiceUrl} underline="always" color="#12a190" variant="body2" fontSize="12.5px">
                                    {renderTranslatedText(footerConfig.legal?.condition)}
                                  </Link>}
                                {footerConfig.privacyPolicyUrl && <Link href={footerConfig.privacyPolicyUrl} underline="always" color="#12a190" variant="body2" fontSize="12.5px">
                                    {renderTranslatedText(footerConfig.legal?.politique)}
                                  </Link>}
                              </Stack>
                            </Stack>}
                        </Stack>
                      </Grid>

                
                      <Grid item xs={6}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HelpIcon sx={{
                            fontSize: 16,
                            color: "text.primary"
                          }} />
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {renderTranslatedText(footerConfig.assistance?.title) || t("Assistance")}
                              </Typography>
                            </Stack>
                            <Switch checked={assistanceEnabled} onChange={e => setAssistanceEnabled(e.target.checked)} sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#fff",
                            "& + .MuiSwitch-track": {
                              backgroundColor: "#12a190"
                            }
                          }
                        }} />
                          </Stack>
                          {assistanceEnabled && footerConfig.assistance?.aide?.[selectedLanguage] && <TextField value={renderTranslatedText(footerConfig.assistance.aide)} variant="outlined" size="small" fullWidth InputProps={{
                        readOnly: true
                      }} />}
                        </Stack>
                      </Grid>
                    </Grid> : <Box sx={{
                  textAlign: "center",
                  py: 3
                }}>
                      <Typography variant="body1" color="text.secondary">
                        {t('No footer configuration available')}
                      </Typography>
                    </Box>}
                </Box>
              </Paper>
              <ToastContainer position="top-right" autoClose={3000} />
            </Stack>
          </Container>
        </MDBox>
      </Box>
      <FooterConfigDialog open={openDialog} onClose={() => setOpenDialog(false)} setFooterConfig={handleConfigUpdate} />
    </DashboardLayout>;
};
export default FooterBlock;
