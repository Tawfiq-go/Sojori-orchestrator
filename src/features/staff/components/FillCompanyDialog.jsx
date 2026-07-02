import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, Checkbox, ListItemText, OutlinedInput, Button, Typography, Chip, CircularProgress, Box, IconButton, Card, CardHeader, Divider, Avatar, Grid, CardContent, Alert } from '@mui/material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import FieldIndicatorProfile from 'features/setting/components/FieldIndicatorProfile';
import FieldIndicatorCompany from 'features/setting/components/FieldIndicatorCompany';
import SearchableSelect from './SearchableSelect';
import CityFreeSoloAutocomplete from './CityFreeSoloAutocomplete';
import { useChannelsFillCompanyPickers } from '../hooks/useChannelsFillCompanyPickers';
import { resolveRuLocationLabel } from '../utils/fillCompanyFormUtils';
const validationSchema = Yup.object({
  ContactInfo: Yup.object({
    FirstName: Yup.string().required('First Name is required'),
    LastName: Yup.string().required('Last Name is required'),
    Email: Yup.string().email('Invalid email format').required('Email is required'),
    Phone: Yup.string().required('Phone is required'),
    City: Yup.string().required('City is required'),
    CountryId: Yup.string().required('Country is required'),
    Address: Yup.string().required('Address is required'),
    ZipCode: Yup.string().required('Zip Code is required'),
    BirthDate: Yup.string().required('Birth Date is required'),
    LanguageId: Yup.string().required('Language is required'),
    Nationality: Yup.string().required('Nationality is required')
  }),
  CompanyInfo: Yup.object({
    CompanyName: Yup.string().required('Company Name is required'),
    WebsiteAddress: Yup.string().url('Invalid URL format'),
    CompanyCity: Yup.string().required('Company City is required'),
    Address: Yup.string().required('Company Address is required'),
    CountryId: Yup.string().required('Company Country is required'),
    PostCode: Yup.string().required('Post Code is required'),
    PhoneNumber: Yup.string().required('Phone Number is required'),
    VATNumber: Yup.string().required('VAT Number is required'),
    ManagerIdentificationNumber: Yup.string().required('Manager ID Number is required'),
    MerchantName: Yup.string().required('Merchant Name is required'),
    TimeZone: Yup.string().required('Time Zone is required'),
    Region: Yup.string().required('Region is required'),
    NumberOfProperties: Yup.string().required('Number Of Properties is required'),
    NumberOfEmployees: Yup.string().required('Number Of Employees is required'),
    YearsInBusiness: Yup.string().required('Years In Business is required'),
    DescribeYourBusiness: Yup.string().required('Describe Your Business is required'),
    Locations: Yup.object({
      Location: Yup.array().of(Yup.object({
        '@_Id': Yup.string().required('Location is required')
      }))
    })
  }),
  LegalRepresentativeInfo: Yup.object({
    FirstName: Yup.string().required('First Name is required'),
    LastName: Yup.string().required('Last Name is required'),
    Email: Yup.string().email('Invalid email format').required('Email is required'),
    City: Yup.string().required('City is required'),
    CountryOfResidenceId: Yup.string().required('Country of Residence is required'),
    Address: Yup.string().required('Address is required'),
    PostCode: Yup.string().required('Post Code is required'),
    Birthday: Yup.string().required('Birthday is required'),
    NationalityId: Yup.string().required('Nationality is required'),
    Region: Yup.string().required('Region is required')
  })
});
const FillCompanyDialog = ({
  open,
  onClose,
  owner,
  cities,
  onSubmit
}) => {
  const {
    t
  } = useTranslation('common');
  const {
    countries: ruCountries,
    languagesRu,
    nationalities: ruNationalities,
    loading: loadingRefPickers,
    error: refPickersError,
    usedFallback: refPickersFallback,
  } = useChannelsFillCompanyPickers(open);
  const [selectedCities, setSelectedCities] = useState([]);
  const [locations, setLocations] = useState([{
    '@_Id': ''
  }]);
  const [initialValues, setInitialValues] = useState({
    ContactInfo: {
      FirstName: '',
      LastName: '',
      Email: '',
      Phone: '',
      City: '',
      CountryId: '',
      Address: '',
      ZipCode: '',
      BirthDate: '',
      LanguageId: '',
      Nationality: ''
    },
    CompanyInfo: {
      CompanyName: '',
      WebsiteAddress: '',
      CompanyCity: '',
      Address: '',
      CountryId: '',
      PostCode: '',
      PhoneNumber: '',
      VATNumber: '',
      ManagerIdentificationNumber: '',
      MerchantName: '',
      TimeZone: '',
      Region: '',
      NumberOfProperties: '',
      NumberOfEmployees: '',
      YearsInBusiness: '',
      DescribeYourBusiness: '',
      Locations: {
        Location: []
      }
    },
    LegalRepresentativeInfo: {
      FirstName: '',
      LastName: '',
      Email: '',
      City: '',
      CountryOfResidenceId: '',
      Address: '',
      PostCode: '',
      Birthday: '',
      NationalityId: '',
      Region: ''
    }
  });
  useEffect(() => {
    if (owner && open) {
      if (owner.fillCompany) {
        // Handle fillCompany as object (not array)
        const companyData = owner.fillCompany;
        setInitialValues({
          ContactInfo: companyData.ContactInfo || {
            FirstName: '',
            LastName: '',
            Email: '',
            Phone: '',
            City: '',
            CountryId: '',
            Address: '',
            ZipCode: '',
            BirthDate: '',
            LanguageId: '',
            Nationality: ''
          },
          CompanyInfo: companyData.CompanyInfo || {
            CompanyName: '',
            WebsiteAddress: '',
            CompanyCity: '',
            Address: '',
            CountryId: '',
            PostCode: '',
            PhoneNumber: '',
            VATNumber: '',
            ManagerIdentificationNumber: '',
            MerchantName: '',
            TimeZone: '',
            Region: '',
            NumberOfProperties: '',
            NumberOfEmployees: '',
            YearsInBusiness: '',
            DescribeYourBusiness: '',
            Locations: {
              Location: []
            }
          },
          LegalRepresentativeInfo: companyData.LegalRepresentativeInfo || {
            FirstName: '',
            LastName: '',
            Email: '',
            City: '',
            CountryOfResidenceId: '',
            Address: '',
            PostCode: '',
            Birthday: '',
            NationalityId: '',
            Region: ''
          }
        });
        if (companyData.CompanyInfo?.Locations?.Location) {
          setSelectedCities(companyData.CompanyInfo.Locations.Location.map(loc => loc['@_Id']));
        } else {
          setSelectedCities([]);
        }
        let locs = [{
          '@_Id': ''
        }];
        if (companyData.CompanyInfo?.Locations?.Location?.length > 0) {
          locs = companyData.CompanyInfo.Locations.Location.map(loc => ({
            '@_Id': loc['@_Id']
          }));
        }
        setLocations(locs);
      } else {
        const ownerCity = cities.find(city => city._id === owner.cityId);
        setSelectedCities([]);
        setInitialValues({
          ContactInfo: {
            FirstName: owner.firstName || '',
            LastName: owner.lastName || '',
            Email: owner.email || '',
            Phone: owner.phone || '',
            City: ownerCity?.name || '',
            CountryId: '',
            Address: '',
            ZipCode: '',
            BirthDate: '',
            LanguageId: '',
            Nationality: ''
          },
          CompanyInfo: {
            CompanyName: '',
            WebsiteAddress: '',
            CompanyCity: ownerCity?.name || '',
            Address: '',
            CountryId: '',
            PostCode: '',
            PhoneNumber: owner.phone || '',
            VATNumber: '',
            ManagerIdentificationNumber: '',
            MerchantName: '',
            TimeZone: '',
            Region: '',
            NumberOfProperties: '',
            NumberOfEmployees: '',
            YearsInBusiness: '',
            DescribeYourBusiness: '',
            Locations: {
              Location: []
            }
          },
          LegalRepresentativeInfo: {
            FirstName: '',
            LastName: '',
            Email: '',
            City: '',
            CountryOfResidenceId: '',
            Address: '',
            PostCode: '',
            Birthday: '',
            NationalityId: '',
            Region: ''
          }
        });
      }
    }
  }, [owner, cities, open]);
  const handleCityChange = event => {
    const value = event.target.value;
    setSelectedCities(typeof value === 'string' ? value.split(',') : value);
  };
  const handleAddLocation = () => setLocations([...locations, {
    '@_Id': ''
  }]);
  const handleRemoveLocation = idx => setLocations(locations.length > 1 ? locations.filter((_, i) => i !== idx) : [{
    '@_Id': ''
  }]);
  const handleLocationChange = (idx, value) => {
    const newLocs = [...locations];
    newLocs[idx]['@_Id'] = value;
    setLocations(newLocs);
  };
  const handleFormSubmit = async (values, {
    setSubmitting
  }) => {
    setSubmitting(true);
    try {
      const dataToSend = {
        ...values,
        CompanyInfo: {
          ...values.CompanyInfo,
          Locations: {
            Location: locations.filter(loc => loc['@_Id']).map(loc => ({
              '@_Id': loc['@_Id']
            }))
          }
        }
      };
      await onSubmit(dataToSend);
    } finally {
      setSubmitting(false);
    }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth sx={{
    '& .MuiDialog-paper': {
      width: '100%',
      maxWidth: {
        xs: '100vw',
        sm: '100vw',
        md: 1100
      },
      minWidth: {
        md: 700
      },
      margin: {
        xs: 1,
        sm: 2,
        md: 'auto'
      },
      boxSizing: 'border-box',
      overflowX: 'auto'
    }
  }}>
            <DialogTitle>{t('Company Information')}</DialogTitle>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleFormSubmit} enableReinitialize={true}>
                {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        isSubmitting,
        setFieldValue
      }) => <Form>
                        <DialogContent>
                            {(refPickersFallback || refPickersError) && <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        {refPickersError ? `${refPickersError} — ` : ''}
                                        {t('channelsRefPickersHint', {
                defaultValue: 'Référentiel réduit : Hub Channels → Mapping → Sync pays RU / Sync langues RU pour la liste complète (priorités Maroc, France…).',
              })}
                                    </Typography>
                                </Alert>}
                            <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                <CardHeader avatar={<Avatar sx={{
              bgcolor: 'primary.main'
            }}><PersonIcon /></Avatar>} title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Contact Information')}</Typography></Box>} />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('First Name')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.FirstName" value={values.ContactInfo.FirstName} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.FirstName && Boolean(errors.ContactInfo?.FirstName)} helperText={touched.ContactInfo?.FirstName && t(errors.ContactInfo?.FirstName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Last Name')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.LastName" value={values.ContactInfo.LastName} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.LastName && Boolean(errors.ContactInfo?.LastName)} helperText={touched.ContactInfo?.LastName && t(errors.ContactInfo?.LastName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Email')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.Email" value={values.ContactInfo.Email} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Email && Boolean(errors.ContactInfo?.Email)} helperText={touched.ContactInfo?.Email && t(errors.ContactInfo?.Email)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Phone')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.Phone" value={values.ContactInfo.Phone} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Phone && Boolean(errors.ContactInfo?.Phone)} helperText={touched.ContactInfo?.Phone && t(errors.ContactInfo?.Phone)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('City')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <CityFreeSoloAutocomplete label={t('City')} cities={cities} value={values.ContactInfo.City} onChange={v => setFieldValue('ContactInfo.City', v)} error={Boolean(touched.ContactInfo?.City && errors.ContactInfo?.City)} helperText={touched.ContactInfo?.City && errors.ContactInfo?.City ? t(errors.ContactInfo.City) : ''} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Country')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Country')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.ContactInfo.CountryId} onChange={v => setFieldValue('ContactInfo.CountryId', v)} error={Boolean(touched.ContactInfo?.CountryId && errors.ContactInfo?.CountryId)} helperText={touched.ContactInfo?.CountryId && errors.ContactInfo?.CountryId ? t(errors.ContactInfo.CountryId) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Address')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.Address" value={values.ContactInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Address && Boolean(errors.ContactInfo?.Address)} helperText={touched.ContactInfo?.Address && t(errors.ContactInfo?.Address)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Country, Region, District')} <FieldIndicatorProfile type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.ContactInfo?.Area && Boolean(errors.ContactInfo?.Area)}>
                                                <TextField name="ContactInfo.Area" value={values.ContactInfo.Area} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Area && Boolean(errors.ContactInfo?.Area)} helperText={touched.ContactInfo?.Area && t(errors.ContactInfo?.Area)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Zip Code')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.ZipCode" value={values.ContactInfo.ZipCode} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.ZipCode && Boolean(errors.ContactInfo?.ZipCode)} helperText={touched.ContactInfo?.ZipCode && t(errors.ContactInfo?.ZipCode)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Birth Date')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <TextField name="ContactInfo.BirthDate" type="date" value={values.ContactInfo.BirthDate} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.BirthDate && Boolean(errors.ContactInfo?.BirthDate)} helperText={touched.ContactInfo?.BirthDate && t(errors.ContactInfo?.BirthDate)} fullWidth size="small" InputLabelProps={{
                    shrink: true
                  }} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Language')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Language')} options={languagesRu} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.ContactInfo.LanguageId} onChange={v => setFieldValue('ContactInfo.LanguageId', v)} error={Boolean(touched.ContactInfo?.LanguageId && errors.ContactInfo?.LanguageId)} helperText={touched.ContactInfo?.LanguageId && errors.ContactInfo?.LanguageId ? t(errors.ContactInfo.LanguageId) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Nationality')} <FieldIndicatorProfile type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Nationality')} options={ruNationalities} optionValueKey="value" getOptionLabel={o => o.label} value={values.ContactInfo.Nationality} onChange={v => setFieldValue('ContactInfo.Nationality', v)} error={Boolean(touched.ContactInfo?.Nationality && errors.ContactInfo?.Nationality)} helperText={touched.ContactInfo?.Nationality && errors.ContactInfo?.Nationality ? t(errors.ContactInfo.Nationality) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Region')} <FieldIndicatorProfile type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.ContactInfo?.Region && Boolean(errors.ContactInfo?.Region)}>
                                                <TextField name="ContactInfo.Region" value={values.ContactInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.ContactInfo?.Region && Boolean(errors.ContactInfo?.Region)} helperText={touched.ContactInfo?.Region && t(errors.ContactInfo?.Region)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                            <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                <CardHeader avatar={<Avatar sx={{
              bgcolor: 'secondary.main'
            }}><BusinessIcon /></Avatar>} title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Company Information')}</Typography></Box>} />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Company Name')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.CompanyName" value={values.CompanyInfo.CompanyName} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.CompanyName && Boolean(errors.CompanyInfo?.CompanyName)} helperText={touched.CompanyInfo?.CompanyName && t(errors.CompanyInfo?.CompanyName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Website Address')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.WebsiteAddress" value={values.CompanyInfo.WebsiteAddress} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.WebsiteAddress && Boolean(errors.CompanyInfo?.WebsiteAddress)} helperText={touched.CompanyInfo?.WebsiteAddress && t(errors.CompanyInfo?.WebsiteAddress)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Company City')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <CityFreeSoloAutocomplete label={t('Company City')} cities={cities} value={values.CompanyInfo.CompanyCity} onChange={v => setFieldValue('CompanyInfo.CompanyCity', v)} error={Boolean(touched.CompanyInfo?.CompanyCity && errors.CompanyInfo?.CompanyCity)} helperText={touched.CompanyInfo?.CompanyCity && errors.CompanyInfo?.CompanyCity ? t(errors.CompanyInfo.CompanyCity) : ''} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Company Country')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Company Country')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.CompanyInfo.CountryId} onChange={v => setFieldValue('CompanyInfo.CountryId', v)} error={Boolean(touched.CompanyInfo?.CountryId && errors.CompanyInfo?.CountryId)} helperText={touched.CompanyInfo?.CountryId && errors.CompanyInfo?.CountryId ? t(errors.CompanyInfo.CountryId) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Post Code')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.PostCode" value={values.CompanyInfo.PostCode} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.PostCode && Boolean(errors.CompanyInfo?.PostCode)} helperText={touched.CompanyInfo?.PostCode && t(errors.CompanyInfo?.PostCode)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Region')} <FieldIndicatorCompany type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.Region && Boolean(errors.CompanyInfo?.Region)}>
                                                <TextField name="CompanyInfo.Region" value={values.CompanyInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.Region && Boolean(errors.CompanyInfo?.Region)} helperText={touched.CompanyInfo?.Region && t(errors.CompanyInfo?.Region)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Company Address')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.Address" value={values.CompanyInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.Address && Boolean(errors.CompanyInfo?.Address)} helperText={touched.CompanyInfo?.Address && t(errors.CompanyInfo?.Address)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Country, Region, District')} <FieldIndicatorCompany type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.Area && Boolean(errors.CompanyInfo?.Area)}>
                                                <TextField name="CompanyInfo.Area" value={values.CompanyInfo.Area} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.Area && Boolean(errors.CompanyInfo?.Area)} helperText={touched.CompanyInfo?.Area && t(errors.CompanyInfo?.Area)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Time Zone')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.TimeZone" value={values.CompanyInfo.TimeZone} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.TimeZone && Boolean(errors.CompanyInfo?.TimeZone)} helperText={touched.CompanyInfo?.TimeZone && t(errors.CompanyInfo?.TimeZone)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Confirmation Email')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.ConfirmationEmail" value={values.CompanyInfo.ConfirmationEmail} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.ConfirmationEmail && Boolean(errors.CompanyInfo?.ConfirmationEmail)} helperText={touched.CompanyInfo?.ConfirmationEmail && t(errors.CompanyInfo?.ConfirmationEmail)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Company Phone Number')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.PhoneNumber" value={values.CompanyInfo.PhoneNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.PhoneNumber && Boolean(errors.CompanyInfo?.PhoneNumber)} helperText={touched.CompanyInfo?.PhoneNumber && t(errors.CompanyInfo?.PhoneNumber)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('VAT Number')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.VATNumber" value={values.CompanyInfo.VATNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.VATNumber && Boolean(errors.CompanyInfo?.VATNumber)} helperText={touched.CompanyInfo?.VATNumber && t(errors.CompanyInfo?.VATNumber)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Manager Identification Number')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.ManagerIdentificationNumber" value={values.CompanyInfo.ManagerIdentificationNumber} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.ManagerIdentificationNumber && Boolean(errors.CompanyInfo?.ManagerIdentificationNumber)} helperText={touched.CompanyInfo?.ManagerIdentificationNumber && t(errors.CompanyInfo?.ManagerIdentificationNumber)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Merchant Name')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.MerchantName" value={values.CompanyInfo.MerchantName} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.MerchantName && Boolean(errors.CompanyInfo?.MerchantName)} helperText={touched.CompanyInfo?.MerchantName && t(errors.CompanyInfo?.MerchantName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Number Of Properties')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.NumberOfProperties && Boolean(errors.CompanyInfo?.NumberOfProperties)}>
                                                <Select name="CompanyInfo.NumberOfProperties" value={values.CompanyInfo.NumberOfProperties} onChange={handleChange} onBlur={handleBlur}>
                                                    <MenuItem value="0">{t('None')}</MenuItem>
                                                    <MenuItem value="1">{t('1 - 4')}</MenuItem>
                                                    <MenuItem value="2">{t('5 - 9')}</MenuItem>
                                                    <MenuItem value="3">{t('10 - 19')}</MenuItem>
                                                    <MenuItem value="4">{t('20 - 29')}</MenuItem>
                                                    <MenuItem value="5">{t('30 - 39')}</MenuItem>
                                                    <MenuItem value="6">{t('40 - 49')}</MenuItem>
                                                    <MenuItem value="7">{t('50 - 99')}</MenuItem>
                                                    <MenuItem value="8">{t('100 - 199')}</MenuItem>
                                                    <MenuItem value="9">{t('200 - 499')}</MenuItem>
                                                    <MenuItem value="10">{t('500 - 1000')}</MenuItem>
                                                    <MenuItem value="11">{t('1000')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Number Of Employees')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.NumberOfEmployees && Boolean(errors.CompanyInfo?.NumberOfEmployees)}>
                                                <Select name="CompanyInfo.NumberOfEmployees" value={values.CompanyInfo.NumberOfEmployees} onChange={handleChange} onBlur={handleBlur}>
                                                    <MenuItem value="0">{t('None')}</MenuItem>
                                                    <MenuItem value="1">{t('1 - 5')}</MenuItem>
                                                    <MenuItem value="2">{t('6 - 10')}</MenuItem>
                                                    <MenuItem value="3">{t('11 - 20')}</MenuItem>
                                                    <MenuItem value="4">{t('21 - 50')}</MenuItem>
                                                    <MenuItem value="5">{t('51 - 100')}</MenuItem>
                                                    <MenuItem value="6">{t('100')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Years In Business')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.YearsInBusiness && Boolean(errors.CompanyInfo?.YearsInBusiness)}>
                                                <Select name="CompanyInfo.YearsInBusiness" value={values.CompanyInfo.YearsInBusiness} onChange={handleChange} onBlur={handleBlur}>
                                                    <MenuItem value="0">{t('None')}</MenuItem>
                                                    <MenuItem value="1">{t('1 - 2')}</MenuItem>
                                                    <MenuItem value="2">{t('3 - 5')}</MenuItem>
                                                    <MenuItem value="3">{t('6 - 10')}</MenuItem>
                                                    <MenuItem value="4">{t('10')}</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Describe Your Business')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="CompanyInfo.DescribeYourBusiness" value={values.CompanyInfo.DescribeYourBusiness} onChange={handleChange} onBlur={handleBlur} error={touched.CompanyInfo?.DescribeYourBusiness && Boolean(errors.CompanyInfo?.DescribeYourBusiness)} helperText={touched.CompanyInfo?.DescribeYourBusiness && t(errors.CompanyInfo?.DescribeYourBusiness)} fullWidth size="small" multiline rows={2} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Locations')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.CompanyInfo?.Locations && Boolean(errors.CompanyInfo?.Locations)}>
                                                <Select name="CompanyInfo.Locations.Location" value={selectedCities} onChange={handleCityChange} onBlur={handleBlur} multiple renderValue={selected => <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5
                    }}>
                                                                    {selected.map(value => <Chip key={value} label={resolveRuLocationLabel(value, cities)} title={`RU LocationID: ${value}`} />)}
                                                                </Box>}>
                                                    {cities.map(city => {
                      const ruId = String(city.rentalCityId ?? city._id ?? '');
                      return (
                        <MenuItem key={ruId || city._id} value={ruId}>
                          {city.name}
                          {city.rentalCityId ? (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              (RU {city.rentalCityId})
                            </Typography>
                          ) : null}
                        </MenuItem>
                      );
                    })}
                                                </Select>
                                                {touched.CompanyInfo?.Locations && errors.CompanyInfo?.Locations && <Typography variant="caption" color="error" className="!mt-1 !ml-3">
                                                        {t(errors.CompanyInfo.Locations)}
                                                    </Typography>}
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                            <Card sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fafbfc',
            boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
            border: '1px solid #e5e8ec'
          }}>
                                <CardHeader avatar={<Avatar sx={{
              bgcolor: 'info.main'
            }}><GavelIcon /></Avatar>} title={<Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
              mt: 1
            }}><Typography variant="h6">{t('Legal Representative Information')}</Typography></Box>} />
                                <Divider />
                                <CardContent>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('First Name')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.FirstName" value={values.LegalRepresentativeInfo.FirstName} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.FirstName && Boolean(errors.LegalRepresentativeInfo?.FirstName)} helperText={touched.LegalRepresentativeInfo?.FirstName && t(errors.LegalRepresentativeInfo?.FirstName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Last Name')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.LastName" value={values.LegalRepresentativeInfo.LastName} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.LastName && Boolean(errors.LegalRepresentativeInfo?.LastName)} helperText={touched.LegalRepresentativeInfo?.LastName && t(errors.LegalRepresentativeInfo?.LastName)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Email')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.Email" value={values.LegalRepresentativeInfo.Email} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Email && Boolean(errors.LegalRepresentativeInfo?.Email)} helperText={touched.LegalRepresentativeInfo?.Email && t(errors.LegalRepresentativeInfo?.Email)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('City')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <CityFreeSoloAutocomplete label={t('City')} cities={cities} value={values.LegalRepresentativeInfo.City} onChange={v => setFieldValue('LegalRepresentativeInfo.City', v)} error={Boolean(touched.LegalRepresentativeInfo?.City && errors.LegalRepresentativeInfo?.City)} helperText={touched.LegalRepresentativeInfo?.City && errors.LegalRepresentativeInfo?.City ? t(errors.LegalRepresentativeInfo.City) : ''} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Country of Residence')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Country of Residence')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.LegalRepresentativeInfo.CountryOfResidenceId} onChange={v => setFieldValue('LegalRepresentativeInfo.CountryOfResidenceId', v)} error={Boolean(touched.LegalRepresentativeInfo?.CountryOfResidenceId && errors.LegalRepresentativeInfo?.CountryOfResidenceId)} helperText={touched.LegalRepresentativeInfo?.CountryOfResidenceId && errors.LegalRepresentativeInfo?.CountryOfResidenceId ? t(errors.LegalRepresentativeInfo.CountryOfResidenceId) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Address')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.Address" value={values.LegalRepresentativeInfo.Address} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Address && Boolean(errors.LegalRepresentativeInfo?.Address)} helperText={touched.LegalRepresentativeInfo?.Address && t(errors.LegalRepresentativeInfo?.Address)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Country, Region, District')} <FieldIndicatorCompany type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.LegalRepresentativeInfo?.Area && Boolean(errors.LegalRepresentativeInfo?.Area)}>
                                                <TextField name="LegalRepresentativeInfo.Area" value={values.LegalRepresentativeInfo.Area} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Area && Boolean(errors.LegalRepresentativeInfo?.Area)} helperText={touched.LegalRepresentativeInfo?.Area && t(errors.LegalRepresentativeInfo?.Area)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Post Code')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.PostCode" value={values.LegalRepresentativeInfo.PostCode} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.PostCode && Boolean(errors.LegalRepresentativeInfo?.PostCode)} helperText={touched.LegalRepresentativeInfo?.PostCode && t(errors.LegalRepresentativeInfo?.PostCode)} fullWidth size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Birthday')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <TextField name="LegalRepresentativeInfo.Birthday" type="date" value={values.LegalRepresentativeInfo.Birthday} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Birthday && Boolean(errors.LegalRepresentativeInfo?.Birthday)} helperText={touched.LegalRepresentativeInfo?.Birthday && t(errors.LegalRepresentativeInfo?.Birthday)} fullWidth size="small" InputLabelProps={{
                    shrink: true
                  }} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Nationality')} <FieldIndicatorCompany type="ru" />
                                            </Typography>
                                            <SearchableSelect label={t('Nationality')} options={ruCountries} optionValueKey="ruCode" getOptionLabel={o => o.label} value={values.LegalRepresentativeInfo.NationalityId} onChange={v => setFieldValue('LegalRepresentativeInfo.NationalityId', v)} error={Boolean(touched.LegalRepresentativeInfo?.NationalityId && errors.LegalRepresentativeInfo?.NationalityId)} helperText={touched.LegalRepresentativeInfo?.NationalityId && errors.LegalRepresentativeInfo?.NationalityId ? t(errors.LegalRepresentativeInfo.NationalityId) : ''} disabled={loadingRefPickers} />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                                                {t('Region')} <FieldIndicatorCompany type="so" />
                                            </Typography>
                                            <FormControl fullWidth size="small" error={touched.LegalRepresentativeInfo?.Region && Boolean(errors.LegalRepresentativeInfo?.Region)}>
                                                <TextField name="LegalRepresentativeInfo.Region" value={values.LegalRepresentativeInfo.Region} onChange={handleChange} onBlur={handleBlur} error={touched.LegalRepresentativeInfo?.Region && Boolean(errors.LegalRepresentativeInfo?.Region)} helperText={touched.LegalRepresentativeInfo?.Region && t(errors.LegalRepresentativeInfo?.Region)} fullWidth size="small" />
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={onClose} className="!text-gray-600 !border-gray-300" variant="outlined">{t('Cancel')}</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting} className="!bg-medium-aquamarine !text-white" sx={{
            minWidth: 100,
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                                {isSubmitting ? <CircularProgress size={20} sx={{
              color: '#00b4b4'
            }} /> : t('Save')}
                            </Button>
                        </DialogActions>
                    </Form>}
            </Formik>
        </Dialog>;
};
export default FillCompanyDialog;
