import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, TextField, Autocomplete, Typography, Box, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { updateFooterConfig, getLanguages, getFooterConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const validationSchema = Yup.object({
  company: Yup.object({
    title: Yup.object().nullable(),
    propos: Yup.object().nullable(),
    bepartenair: Yup.object().nullable(),
    nouvelles: Yup.object().nullable(),
    carrière: Yup.object().nullable(),
    presse: Yup.object().nullable()
  }).test('at-least-one-company', 'At least one company field must have a value', value => {
    return Object.values(value).some(obj => obj && Object.values(obj).some(v => v && v.trim() !== ''));
  }),
  assistance: Yup.object({
    title: Yup.object().nullable(),
    aide: Yup.object().nullable()
  }).test('at-least-one-assistance', 'At least one assistance field must have a value', value => {
    return Object.values(value).some(obj => obj && Object.values(obj).some(v => v && v.trim() !== ''));
  }),
  reseaux: Yup.object({
    title: Yup.object().nullable(),
    socialLinks: Yup.array().of(Yup.object({
      type: Yup.string().required('Social platform is required'),
      url: Yup.string().matches(/^(https?:\/\/[^\s$.?#].[^\s]*|\/[^\s]*)$/, 'Must be a valid absolute URL (e.g., https://example.com) or relative path (e.g., /path)').required('Social URL is required')
    }))
  }).test('at-least-one-social', 'At least one social field must have a value', value => {
    return value.title && Object.values(value.title).some(v => v && v.trim() !== '') || value.socialLinks.some(link => link.url && link.url.trim() !== '');
  }),
  lang: Yup.object({
    title: Yup.object().nullable(),
    languages: Yup.array().of(Yup.object({
      name: Yup.string().required('Language name is required'),
      languageCode: Yup.string().required('Language code is required')
    }))
  }).test('at-least-one-lang', 'At least one language field must have a value', value => {
    return value.title && Object.values(value.title).some(v => v && v.trim() !== '') || value.languages.some(lang => lang.name && lang.name.trim() !== '');
  }),
  curr: Yup.object({
    title: Yup.object().nullable(),
    currencies: Yup.array().of(Yup.object({
      currencyCode: Yup.string().required('Currency code is required'),
      currencySymbol: Yup.string().required('Currency symbol is required')
    }))
  }).test('at-least-one-curr', 'At least one currency field must have a value', value => {
    return value.title && Object.values(value.title).some(v => v && v.trim() !== '') || value.currencies.some(curr => curr.currencyCode && curr.currencyCode.trim() !== '');
  }),
  legal: Yup.object({
    copyright: Yup.object().nullable(),
    condition: Yup.object().nullable(),
    politique: Yup.object().nullable()
  }).test('at-least-one-legal', 'At least one legal field must have a value', value => {
    return Object.values(value).some(obj => obj && Object.values(obj).some(v => v && v.trim() !== ''));
  }),
  logoUrl: Yup.string().matches(/^(https?:\/\/[^\s$.?#].[^\s]*|\/[^\s]*)$/, 'Must be a valid absolute URL (e.g., https://example.com) or relative path (e.g., /path)').nullable(),
  currentYear: Yup.string().matches(/^\d{4}$/, 'Must be a 4-digit year').nullable(),
  termsOfServiceUrl: Yup.string().matches(/^(https?:\/\/[^\s$.?#].[^\s]*|\/[^\s]*)$/, 'Must be a valid absolute URL (e.g., https://example.com/terms) or relative path (e.g., /terms)').nullable(),
  privacyPolicyUrl: Yup.string().matches(/^(https?:\/\/[^\s$.?#].[^\s]*|\/[^\s]*)$/, 'Must be a valid absolute URL (e.g., https://example.com/privacy) or relative path (e.g., /privacy)').nullable()
});
const FooterConfigDialog = ({
  open,
  onClose,
  setFooterConfig
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [languages, setLanguages] = useState([]);
  const [footerConfig, setLocalFooterConfig] = useState(null);
  const [companyLinksData, setCompanyLinksData] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [languagesResponse, footerResponse] = await Promise.all([getLanguages(), getFooterConfig()]);
        setLanguages(languagesResponse);
        if (footerResponse.success && footerResponse.footerConfig) {
          setLocalFooterConfig(footerResponse.footerConfig);
          const companyKeys = Object.keys(footerResponse.footerConfig.company || {}).filter(key => key !== 'title');
          setCompanyLinksData(companyKeys.map(key => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1)
          })));
        } else {
          setCompanyLinksData([]);
          toast.info(t('No footer configuration found'));
        }
      } catch (error) {
        toast.error(t('Failed to fetch configuration data'));
      } finally {
        setDataLoading(false);
      }
    };
    if (open) {
      fetchData();
    }
  }, [open]); // Only run when 'open' changes

  const initialValues = footerConfig || {
    company: {
      title: {
        en: "",
        fr: "",
        ar: ""
      },
      propos: {
        en: "",
        fr: "",
        ar: ""
      },
      bepartenair: {
        en: "",
        fr: "",
        ar: ""
      },
      nouvelles: {
        en: "",
        fr: "",
        ar: ""
      },
      carrière: {
        en: "",
        fr: "",
        ar: ""
      },
      presse: {
        en: "",
        fr: "",
        ar: ""
      }
    },
    assistance: {
      title: {
        en: "",
        fr: "",
        ar: ""
      },
      aide: {
        en: "",
        fr: "",
        ar: ""
      }
    },
    reseaux: {
      title: {
        en: "",
        fr: "",
        ar: ""
      },
      socialLinks: []
    },
    lang: {
      title: {
        en: "",
        fr: "",
        ar: ""
      },
      languages: []
    },
    curr: {
      title: {
        en: "",
        fr: "",
        ar: ""
      },
      currencies: []
    },
    legal: {
      copyright: {
        en: "",
        fr: "",
        ar: ""
      },
      condition: {
        en: "",
        fr: "",
        ar: ""
      },
      politique: {
        en: "",
        fr: "",
        ar: ""
      }
    },
    logoUrl: "",
    currentYear: "",
    termsOfServiceUrl: "",
    privacyPolicyUrl: ""
  };
  const handleSubmit = async (values, {
    setSubmitting,
    resetForm
  }) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await updateFooterConfig(values);
      if (response.message === 'Footer config data updated' && response.footerConfig) {
        setLocalFooterConfig(response.footerConfig);
        setFooterConfig(response.footerConfig); // Update parent state after submission
        const companyKeys = Object.keys(response.footerConfig.company || {}).filter(key => key !== 'title');
        setCompanyLinksData(companyKeys.map(key => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1)
        })));
        resetForm({
          values: response.footerConfig
        });
        onClose();
        toast.success(t('Footer configuration updated successfully'));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || t('Failed to update footer configuration');
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };
  if (!open) return null;
  if (dataLoading) {
    return <Box sx={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '600px',
      backgroundColor: '#ffffff',
      zIndex: 1300,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
        <CircularProgress sx={{
        color: '#00b4b4'
      }} />
      </Box>;
  }
  return <>
      <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1300
    }} onClick={onClose} />
      <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '600px',
      backgroundColor: '#ffffff',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      zIndex: 1300,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }} aria-labelledby="footer-config-title">
        <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #d1d5db',
        backgroundColor: '#ffffff'
      }}>
          <h2 id="footer-config-title" style={{
          fontSize: '22px',
          fontWeight: 500,
          color: '#374151',
          margin: 0
        }}>
            {t('Edit Footer Configuration')}
          </h2>
          <IconButton onClick={onClose} sx={{
          '&:hover': {
            backgroundColor: '#f3f4f6'
          }
        }}>
            <CloseIcon sx={{
            fontSize: '1.25rem'
          }} />
          </IconButton>
        </div>
        <Formik initialValues={initialValues} enableReinitialize validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({
          values,
          setFieldValue,
          isValid,
          isSubmitting,
          errors,
          touched
        }) => <>
              <Box style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#00b4b4 #f1f1f1'
          }} sx={{
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#00b4b4',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#009999'
            }
          }}>
                {errorMessage && <Typography variant="body2" sx={{
              color: '#EF4444',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'center',
              marginBottom: '16px'
            }}>
                    {errorMessage}
                  </Typography>}
                <Form id="footer-config-form">
                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Company")}
                    </Typography>
                    <FieldArray name="company.title">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.company.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.company.title).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newTitle = {
                                ...values.company.title
                              };
                              const newFields = companyLinksData.reduce((acc, link) => {
                                acc[link.key] = {
                                  ...values.company[link.key],
                                  [value.languageCode]: values.company[link.key][langId] || ''
                                };
                                delete acc[link.key][langId];
                                return acc;
                              }, {});
                              delete newTitle[langId];
                              newTitle[value.languageCode] = titleValue || '';
                              setFieldValue('company.title', newTitle);
                              Object.entries(newFields).forEach(([key, val]) => {
                                setFieldValue(`company.${key}`, val);
                              });
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`company.title.${langId}`} as={TextField} label={t("Company Title")} fullWidth size="small" error={touched.company?.title?.[langId] && !!errors.company?.title?.[langId]} helperText={touched.company?.title?.[langId] && errors.company?.title?.[langId]} />
                                </div>
                                {companyLinksData.map(link => <Field key={link.key} name={`company.${link.key}.${langId}`} as={TextField} label={t(link.label)} fullWidth size="small" style={{
                          marginBottom: '8px'
                        }} error={touched.company?.[link.key]?.[langId] && !!errors.company?.[link.key]?.[langId]} helperText={touched.company?.[link.key]?.[langId] && errors.company?.[link.key]?.[langId]} />)}
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newTitle = {
                              ...values.company.title
                            };
                            const newFields = companyLinksData.reduce((acc, link) => {
                              acc[link.key] = {
                                ...values.company[link.key]
                              };
                              delete acc[link.key][langId];
                              return acc;
                            }, {});
                            delete newTitle[langId];
                            setFieldValue('company.title', newTitle);
                            Object.entries(newFields).forEach(([key, val]) => {
                              setFieldValue(`company.${key}`, val);
                            });
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.company.title).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.company.title).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          const newLangId = availableLanguages[0].languageCode;
                          setFieldValue(`company.title.${newLangId}`, '');
                          companyLinksData.forEach(link => {
                            setFieldValue(`company.${link.key}.${newLangId}`, '');
                          });
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Company Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Social Links")}
                    </Typography>
                    <FieldArray name="reseaux.title">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.reseaux.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.reseaux.title).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newTitle = {
                                ...values.reseaux.title
                              };
                              delete newTitle[langId];
                              newTitle[value.languageCode] = titleValue || '';
                              setFieldValue('reseaux.title', newTitle);
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`reseaux.title.${langId}`} as={TextField} label={t("Social Links Title")} fullWidth size="small" error={touched.reseaux?.title?.[langId] && !!errors.reseaux?.title?.[langId]} helperText={touched.reseaux?.title?.[langId] && errors.reseaux?.title?.[langId]} />
                                </div>
                                <FieldArray name="reseaux.socialLinks">
                                  {({
                            push: pushSocial,
                            remove: removeSocial
                          }) => <div>
                                      {values.reseaux.socialLinks.map((social, sIndex) => <div key={sIndex} style={{
                              display: 'flex',
                              gap: '16px',
                              marginBottom: '8px'
                            }}>
                                          <Field name={`reseaux.socialLinks[${sIndex}].type`} as={TextField} label={t("Social Platform")} size="small" style={{
                                flex: 1
                              }} error={touched.reseaux?.socialLinks?.[sIndex]?.type && !!errors.reseaux?.socialLinks?.[sIndex]?.type} helperText={touched.reseaux?.socialLinks?.[sIndex]?.type && errors.reseaux?.socialLinks?.[sIndex]?.type} />
                                          <Field name={`reseaux.socialLinks[${sIndex}].url`} as={TextField} label={t("Social URL")} size="small" type="url" style={{
                                flex: 1
                              }} error={touched.reseaux?.socialLinks?.[sIndex]?.url && !!errors.reseaux?.socialLinks?.[sIndex]?.url} helperText={touched.reseaux?.socialLinks?.[sIndex]?.url && errors.reseaux?.socialLinks?.[sIndex]?.url} />
                                          <IconButton size="small" onClick={() => removeSocial(sIndex)} sx={{
                                '&:hover': {
                                  backgroundColor: '#f3f4f6'
                                }
                              }}>
                                            <CloseIcon sx={{
                                  color: '#EF4444'
                                }} />
                                          </IconButton>
                                        </div>)}
                                      <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                                        <IconButton size="small" onClick={() => pushSocial({
                                type: '',
                                url: '',
                                _id: `new-${Date.now()}`
                              })} sx={{
                                backgroundColor: '#00b4b4',
                                color: '#ffffff',
                                '&:hover': {
                                  backgroundColor: '#009999'
                                }
                              }}>
                                          <AddIcon />
                                        </IconButton>
                                        <span style={{
                                fontSize: '13px',
                                color: '#374151'
                              }}>
                                          {t('Add Social Link')}
                                        </span>
                                      </div>
                                    </div>}
                                </FieldArray>
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newTitle = {
                              ...values.reseaux.title
                            };
                            delete newTitle[langId];
                            setFieldValue('reseaux.title', newTitle);
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.reseaux.title).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.reseaux.title).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          setFieldValue(`reseaux.title.${availableLanguages[0].languageCode}`, '');
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Social Links Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Language")}
                    </Typography>
                    <FieldArray name="lang.title">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.lang.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.lang.title).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newTitle = {
                                ...values.lang.title
                              };
                              const newLanguages = values.lang.languages.map(lang => {
                                if (lang.languageCode === langId) {
                                  return {
                                    ...lang,
                                    languageCode: value.languageCode
                                  };
                                }
                                return lang;
                              });
                              delete newTitle[langId];
                              newTitle[value.languageCode] = titleValue || '';
                              setFieldValue('lang.title', newTitle);
                              setFieldValue('lang.languages', newLanguages);
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`lang.title.${langId}`} as={TextField} label={t("Language Title")} fullWidth size="small" error={touched.lang?.title?.[langId] && !!errors.lang?.title?.[langId]} helperText={touched.lang?.title?.[langId] && errors.lang?.title?.[langId]} />
                                </div>
                                <FieldArray name="lang.languages">
                                  {({
                            push: pushLang,
                            remove: removeLang
                          }) => <div>
                                      {values.lang.languages.map((lang, lIndex) => <div key={lIndex} style={{
                              display: 'flex',
                              gap: '16px',
                              marginBottom: '8px'
                            }}>
                                          <Field name={`lang.languages[${lIndex}].name`} as={TextField} label={t("Language Name")} size="small" style={{
                                flex: 1
                              }} error={touched.lang?.languages?.[lIndex]?.name && !!errors.lang?.languages?.[lIndex]?.name} helperText={touched.lang?.languages?.[lIndex]?.name && errors.lang?.languages?.[lIndex]?.name} />
                                          <Field name={`lang.languages[${lIndex}].languageCode`} as={TextField} label={t("Language Code")} size="small" style={{
                                flex: 1
                              }} error={touched.lang?.languages?.[lIndex]?.languageCode && !!errors.lang?.languages?.[lIndex]?.languageCode} helperText={touched.lang?.languages?.[lIndex]?.languageCode && errors.lang?.languages?.[lIndex]?.languageCode} />
                                          <IconButton size="small" onClick={() => removeLang(lIndex)} sx={{
                                '&:hover': {
                                  backgroundColor: '#f3f4f6'
                                }
                              }}>
                                            <CloseIcon sx={{
                                  color: '#EF4444'
                                }} />
                                          </IconButton>
                                        </div>)}
                                      <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                                        <IconButton size="small" onClick={() => pushLang({
                                name: '',
                                languageCode: `new-${Date.now()}`,
                                _id: `new-${Date.now()}`
                              })} sx={{
                                backgroundColor: '#00b4b4',
                                color: '#ffffff',
                                '&:hover': {
                                  backgroundColor: '#009999'
                                }
                              }}>
                                          <AddIcon />
                                        </IconButton>
                                        <span style={{
                                fontSize: '13px',
                                color: '#374151'
                              }}>
                                          {t('Add Language')}
                                        </span>
                                      </div>
                                    </div>}
                                </FieldArray>
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newTitle = {
                              ...values.lang.title
                            };
                            delete newTitle[langId];
                            setFieldValue('lang.title', newTitle);
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.lang.title).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.lang.title).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          const newLangId = availableLanguages[0].languageCode;
                          setFieldValue(`lang.title.${newLangId}`, '');
                          setFieldValue('lang.languages', [...values.lang.languages, {
                            name: '',
                            languageCode: newLangId,
                            _id: `new-${Date.now()}`
                          }]);
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Language Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Currency")}
                    </Typography>
                    <FieldArray name="curr.title">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.curr.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.curr.title).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newTitle = {
                                ...values.curr.title
                              };
                              delete newTitle[langId];
                              newTitle[value.languageCode] = titleValue || '';
                              setFieldValue('curr.title', newTitle);
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`curr.title.${langId}`} as={TextField} label={t("Currency Title")} fullWidth size="small" error={touched.curr?.title?.[langId] && !!errors.curr?.title?.[langId]} helperText={touched.curr?.title?.[langId] && errors.curr?.title?.[langId]} />
                                </div>
                                <FieldArray name="curr.currencies">
                                  {({
                            push: pushCurr,
                            remove: removeCurr
                          }) => <div>
                                      {values.curr.currencies.map((curr, cIndex) => <div key={cIndex} style={{
                              display: 'flex',
                              gap: '16px',
                              marginBottom: '8px'
                            }}>
                                          <Field name={`curr.currencies[${cIndex}].currencyCode`} as={TextField} label={t("Currency Code")} size="small" style={{
                                flex: 1
                              }} error={touched.curr?.currencies?.[cIndex]?.currencyCode && !!errors.curr?.currencies?.[cIndex]?.currencyCode} helperText={touched.curr?.currencies?.[cIndex]?.currencyCode && errors.curr?.currencies?.[cIndex]?.currencyCode} />
                                          <Field name={`curr.currencies[${cIndex}].currencySymbol`} as={TextField} label={t("Currency Symbol")} size="small" style={{
                                flex: 1
                              }} error={touched.curr?.currencies?.[cIndex]?.currencySymbol && !!errors.curr?.currencies?.[cIndex]?.currencySymbol} helperText={touched.curr?.currencies?.[cIndex]?.currencySymbol && errors.curr?.currencies?.[cIndex]?.currencySymbol} />
                                          <IconButton size="small" onClick={() => removeCurr(cIndex)} sx={{
                                '&:hover': {
                                  backgroundColor: '#f3f4f6'
                                }
                              }}>
                                            <CloseIcon sx={{
                                  color: '#EF4444'
                                }} />
                                          </IconButton>
                                        </div>)}
                                      <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                                        <IconButton size="small" onClick={() => pushCurr({
                                currencyCode: '',
                                currencySymbol: '',
                                _id: `new-${Date.now()}`
                              })} sx={{
                                backgroundColor: '#00b4b4',
                                color: '#ffffff',
                                '&:hover': {
                                  backgroundColor: '#009999'
                                }
                              }}>
                                          <AddIcon />
                                        </IconButton>
                                        <span style={{
                                fontSize: '13px',
                                color: '#374151'
                              }}>
                                          {t('Add Currency')}
                                        </span>
                                      </div>
                                    </div>}
                                </FieldArray>
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newTitle = {
                              ...values.curr.title
                            };
                            delete newTitle[langId];
                            setFieldValue('curr.title', newTitle);
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.curr.title).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.curr.title).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          setFieldValue(`curr.title.${availableLanguages[0].languageCode}`, '');
                          setFieldValue('curr.currencies', [...values.curr.currencies, {
                            currencyCode: '',
                            currencySymbol: '',
                            _id: `new-${Date.now()}`
                          }]);
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Currency Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("General")}
                    </Typography>
                    <Field name="logoUrl" as={TextField} label={t("Logo URL")} fullWidth size="small" type="url" style={{
                  marginBottom: '8px'
                }} error={touched.logoUrl && !!errors.logoUrl} helperText={touched.logoUrl && errors.logoUrl} />
                    <Field name="currentYear" as={TextField} label={t("Current Year")} fullWidth size="small" style={{
                  marginBottom: '8px'
                }} error={touched.currentYear && !!errors.currentYear} helperText={touched.currentYear && errors.currentYear} />
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Legal")}
                    </Typography>
                    <FieldArray name="legal.copyright">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.legal.copyright).map(([langId, copyrightValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.legal.copyright).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newCopyright = {
                                ...values.legal.copyright
                              };
                              const newFields = ['condition', 'politique'].reduce((acc, key) => {
                                acc[key] = {
                                  ...values.legal[key],
                                  [value.languageCode]: values.legal[key][langId] || ''
                                };
                                delete acc[key][langId];
                                return acc;
                              }, {});
                              delete newCopyright[langId];
                              newCopyright[value.languageCode] = copyrightValue || '';
                              setFieldValue('legal.copyright', newCopyright);
                              Object.entries(newFields).forEach(([key, val]) => {
                                setFieldValue(`legal.${key}`, val);
                              });
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`legal.copyright.${langId}`} as={TextField} label={t("Copyright")} fullWidth size="small" error={touched.legal?.copyright?.[langId] && !!errors.legal?.copyright?.[langId]} helperText={touched.legal?.copyright?.[langId] && errors.legal?.copyright?.[langId]} />
                                </div>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Field name={`legal.condition.${langId}`} as={TextField} label={t("Terms of Service")} size="small" style={{
                            flex: 1
                          }} error={touched.legal?.condition?.[langId] && !!errors.legal?.condition?.[langId]} helperText={touched.legal?.condition?.[langId] && errors.legal?.condition?.[langId]} />
                                  <Field name={`legal.politique.${langId}`} as={TextField} label={t("Privacy Policy")} size="small" style={{
                            flex: 1
                          }} error={touched.legal?.politique?.[langId] && !!errors.legal?.politique?.[langId]} helperText={touched.legal?.politique?.[langId] && errors.legal?.politique?.[langId]} />
                                </div>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Field name="termsOfServiceUrl" as={TextField} label={t("Terms of Service URL")} size="small" style={{
                            flex: 1
                          }} error={touched.termsOfServiceUrl && !!errors.termsOfServiceUrl} helperText={touched.termsOfServiceUrl && errors.termsOfServiceUrl} />
                                  <Field name="privacyPolicyUrl" as={TextField} label={t("Privacy Policy URL")} size="small" style={{
                            flex: 1
                          }} error={touched.privacyPolicyUrl && !!errors.privacyPolicyUrl} helperText={touched.privacyPolicyUrl && errors.privacyPolicyUrl} />
                                </div>
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newCopyright = {
                              ...values.legal.copyright
                            };
                            const newFields = ['condition', 'politique'].reduce((acc, key) => {
                              acc[key] = {
                                ...values.legal[key]
                              };
                              delete acc[key][langId];
                              return acc;
                            }, {});
                            delete newCopyright[langId];
                            setFieldValue('legal.copyright', newCopyright);
                            Object.entries(newFields).forEach(([key, val]) => {
                              setFieldValue(`legal.${key}`, val);
                            });
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.legal.copyright).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.legal.copyright).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          const newLangId = availableLanguages[0].languageCode;
                          setFieldValue(`legal.copyright.${newLangId}`, '');
                          setFieldValue(`legal.condition.${newLangId}`, '');
                          setFieldValue(`legal.politique.${newLangId}`, '');
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Legal Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>

                  <div style={{
                border: '1px dashed #d1d5db',
                padding: '16px',
                marginBottom: '16px'
              }}>
                    <Typography variant="body2" fontWeight={500} color="#374151" sx={{
                  mb: 2
                }}>
                      {t("Assistance")}
                    </Typography>
                    <FieldArray name="assistance.title">
                      {({
                    push,
                    remove
                  }) => <div>
                          {Object.entries(values.assistance.title).map(([langId, titleValue], index) => <React.Fragment key={langId}>
                              <div style={{
                        marginBottom: '16px'
                      }}>
                                <div style={{
                          display: 'flex',
                          gap: '16px',
                          marginBottom: '8px'
                        }}>
                                  <Autocomplete disablePortal options={languages.filter(lang => !Object.keys(values.assistance.title).includes(lang.languageCode) || lang.languageCode === langId)} getOptionLabel={option => option.name} value={languages.find(lang => lang.languageCode === langId) || null} onChange={(event, value) => {
                            if (value) {
                              const newTitle = {
                                ...values.assistance.title
                              };
                              const newAide = {
                                ...values.assistance.aide
                              };
                              delete newTitle[langId];
                              delete newAide[langId];
                              newTitle[value.languageCode] = titleValue || '';
                              newAide[value.languageCode] = values.assistance.aide[langId] || '';
                              setFieldValue('assistance.title', newTitle);
                              setFieldValue('assistance.aide', newAide);
                            }
                          }} renderInput={params => <TextField {...params} size="small" label={t('Select Language')} sx={{
                            width: '150px'
                          }} />} />
                                  <Field name={`assistance.title.${langId}`} as={TextField} label={t("Support Title")} fullWidth size="small" error={touched.assistance?.title?.[langId] && !!errors.assistance?.title?.[langId]} helperText={touched.assistance?.title?.[langId] && errors.assistance?.title?.[langId]} />
                                </div>
                                <Field name={`assistance.aide.${langId}`} as={TextField} label={t("Help Center")} fullWidth size="small" style={{
                          marginBottom: '8px'
                        }} error={touched.assistance?.aide?.[langId] && !!errors.assistance?.aide?.[langId]} helperText={touched.assistance?.aide?.[langId] && errors.assistance?.aide?.[langId]} />
                                <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                                  <IconButton size="small" onClick={() => {
                            const newTitle = {
                              ...values.assistance.title
                            };
                            const newAide = {
                              ...values.assistance.aide
                            };
                            delete newTitle[langId];
                            delete newAide[langId];
                            setFieldValue('assistance.title', newTitle);
                            setFieldValue('assistance.aide', newAide);
                          }} sx={{
                            '&:hover': {
                              backgroundColor: '#f3f4f6'
                            }
                          }}>
                                    <CloseIcon sx={{
                              color: '#EF4444'
                            }} />
                                  </IconButton>
                                  <span style={{
                            fontSize: '13px',
                            color: '#EF4444'
                          }}>
                                    {t('remove')}
                                  </span>
                                </div>
                              </div>
                              {index < Object.entries(values.assistance.title).length - 1 && <div style={{
                        borderBottom: '1px solid #e5e7eb',
                        marginBottom: '16px'
                      }} />}
                            </React.Fragment>)}
                          <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                            <IconButton size="small" onClick={() => {
                        const availableLanguages = languages.filter(lang => !Object.keys(values.assistance.title).includes(lang.languageCode));
                        if (availableLanguages.length > 0) {
                          const newLangId = availableLanguages[0].languageCode;
                          setFieldValue(`assistance.title.${newLangId}`, '');
                          setFieldValue(`assistance.aide.${newLangId}`, '');
                        }
                      }} sx={{
                        backgroundColor: '#00b4b4',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#009999'
                        }
                      }}>
                              <AddIcon />
                            </IconButton>
                            <span style={{
                        fontSize: '13px',
                        color: '#374151'
                      }}>
                              {t('Add Support Translation')}
                            </span>
                          </div>
                        </div>}
                    </FieldArray>
                  </div>
                </Form>
              </Box>
              <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            paddingBottom: '20px'
          }}>
                <Button variant="outlined" onClick={onClose} disabled={isSubmitting || isLoading} sx={{
              flex: 1,
              borderColor: '#d1d5db',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb'
              },
              '&:disabled': {
                borderColor: '#e5e7eb',
                color: '#9ca3af'
              },
              textTransform: 'none'
            }} startIcon={<CloseIcon sx={{
              color: '#6b7280'
            }} />}>
                  {t('Cancel')}
                </Button>
                <Button variant="contained" disabled={isSubmitting || isLoading || !isValid} sx={{
              flex: 1,
              backgroundColor: '#00b4b4 !important',
              color: '#ffffff !important',
              '&:hover': {
                backgroundColor: '#009999 !important'
              },
              '&:disabled': {
                backgroundColor: '#e5e7eb !important',
                color: '#9ca3af !important'
              },
              textTransform: 'none'
            }} startIcon={<SaveIcon sx={{
              color: '#ffffff'
            }} />} onClick={() => document.getElementById('footer-config-form').requestSubmit()}>
                  {isLoading ? <CircularProgress size={12} sx={{
                color: '#9ca3af'
              }} /> : t('Update')}
                </Button>
              </div>
            </>}
        </Formik>
      </div>
    </>;
};
export default FooterConfigDialog;
