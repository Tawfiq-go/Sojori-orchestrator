import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, CircularProgress, Snackbar, TextField, Typography, Grid, Divider, IconButton, MenuItem, FormControl, InputLabel, Select, Autocomplete, Card, CardContent, CardHeader, Avatar, OutlinedInput, FormHelperText
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CompanyStatsSelects from './CompanyStatsSelects';
import { fetchCompanyProfile, updateCompanyProfile } from '../services/serverApi.profilEntreprise';
import { getCities, getLanguage } from '../../staff/services/serverApi.task';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const COUNTRIES = [
  { id: '344', name: 'Morocco' },
  { id: '20', name: 'France' },
  { id: '40', name: 'Spain' },
];

const sectionCardStyle = {
  mb: 4,
  borderRadius: 3,
  background: '#fafbfc',
  boxShadow: '0 2px 12px 0 rgba(60, 72, 88, 0.08)',
  border: '1px solid #e5e8ec'
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  mb: 2,
  mt: 1,
};

const getCountryIdByName = (name) => {
  const country = COUNTRIES.find(c => c.name === name);
  return country ? country.id : '';
};

const ProfilEntrepriseForm = () => {
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState(null);
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const fetchCitiesAndLanguages = async () => {
      try {
        const citiesResponse = await getCities({ limit: 200, paged: false });
        setCities(Array.isArray(citiesResponse) ? citiesResponse : []);
      } catch (error) {
        setCities([]);
      }
      try {
        const languagesResponse = await getLanguage();
        setLanguages(Array.isArray(languagesResponse?.data) ? languagesResponse.data : []);
      } catch (error) {
        setLanguages([]);
      }
    };
    fetchCitiesAndLanguages();
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const contactCityObj = cities.find(city => city.rentalCityId?.toString() === values.City?.toString());
      const contactCountryId = values.CountryId;
      const companyCityObj = cities.find(city => city.rentalCityId?.toString() === values.CompanyCity?.toString());
      const companyCountryId = values.CompanyCountryId;
      const legalRepCityObj = cities.find(city => city.rentalCityId?.toString() === values.LegalRepCity?.toString());
      const legalRepCountryId = values.LegalRepCountryOfResidenceId;
      const legalRepNationalityId = values.LegalRepNationalityId;
      const languageObj = languages.find(lang => lang.rentalLanguageId?.toString() === values.LanguageId?.toString());
      let websiteAddress = values.WebsiteAddress || '';
      websiteAddress = websiteAddress.trim();
      if (websiteAddress.startsWith('@')) websiteAddress = websiteAddress.slice(1);
      websiteAddress = websiteAddress.replace(/^https?:\/\//, '');
      if (websiteAddress && !websiteAddress.startsWith('https://')) websiteAddress = 'https://' + websiteAddress;
      await updateCompanyProfile(ownerId, {
        ContactInfo: {
          FirstName: values.FirstName,
          LastName: values.LastName,
          Email: values.Email,
          Phone: values.Phone,
          City: contactCityObj ? contactCityObj.name : values.City,
          CountryId: contactCountryId,
          Address: values.Address,
          ZipCode: values.ZipCode,
          BirthDate: values.BirthDate,
          LanguageId: languageObj ? languageObj.rentalLanguageId?.toString() : values.LanguageId,
        },
        CompanyInfo: {
          CompanyName: values.CompanyName,
          WebsiteAddress: websiteAddress,
          CompanyCity: companyCityObj ? companyCityObj.name : values.CompanyCity,
          Address: values.CompanyAddress,
          CountryId: companyCountryId,
          PostCode: values.PostCode,
          TimeZone: values.TimeZone,
          Region: values.Region,
          PhoneNumber: values.CompanyPhoneNumber,
          VATNumber: values.VATNumber,
          ManagerIdentificationNumber: values.ManagerIdentificationNumber,
          MerchantName: values.MerchantName,
          Locations: {
            Location: values.Locations.filter(loc => loc['@_Id']).map(loc => ({ '@_Id': loc['@_Id'].toString() })),
          },
          NumberOfProperties: values.NumberOfProperties,
          NumberOfEmployees: values.NumberOfEmployees,
          YearsInBusiness: values.YearsInBusiness,
          DescribeYourBusiness: values.DescribeYourBusiness,
        },
        LegalRepresentativeInfo: {
          FirstName: values.LegalRepFirstName,
          LastName: values.LegalRepLastName,
          Email: values.LegalRepEmail,
          City: legalRepCityObj ? legalRepCityObj.name : values.LegalRepCity,
          CountryOfResidenceId: legalRepCountryId,
          Address: values.LegalRepAddress,
          PostCode: values.LegalRepPostCode,
          Birthday: values.LegalRepBirthday,
          NationalityId: legalRepNationalityId,
          Region: values.LegalRepRegion,
        }
      });
      toast.success(t('Profile updated successfully'));
    } catch (error) {
      if (error.response && Array.isArray(error.response.data?.errors)) {
        error.response.data.errors.forEach(err => {
          toast.error(err.message || t('Error updating profile'));
        });
      } else {
      toast.error(t('Error updating profile'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      FirstName: '', LastName: '', Email: '', Phone: '', City: '', CountryId: '', Address: '', ZipCode: '', BirthDate: '', LanguageId: '',
      CompanyName: '', WebsiteAddress: '', CompanyCity: '', CompanyAddress: '', CompanyCountryId: '', PostCode: '', TimeZone: '', Region: '', CompanyPhoneNumber: '', VATNumber: '', ManagerIdentificationNumber: '', MerchantName: '', Locations: [{ '@_Id': '' }], NumberOfProperties: '', NumberOfEmployees: '', YearsInBusiness: '', DescribeYourBusiness: '',
      LegalRepFirstName: '', LegalRepLastName: '', LegalRepEmail: '', LegalRepCity: '', LegalRepCountryOfResidenceId: '', LegalRepAddress: '', LegalRepPostCode: '', LegalRepBirthday: '', LegalRepNationalityId: '', LegalRepRegion: '',
    },
    validationSchema: Yup.object({
      FirstName: Yup.string().required(t('Required')),
      LastName: Yup.string().required(t('Required')),
      Email: Yup.string().email(t('Invalid email')).required(t('Required')),
      Phone: Yup.string().required(t('Required')),
      CompanyName: Yup.string().required(t('Required')),
      WebsiteAddress: Yup.string().required(t('Required')),
    }),
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchCompanyProfile();
        if (data.success && data.data) {
          const { ContactInfo, CompanyInfo, ownerId, LegalRepresentativeInfo } = data.data;
          setOwnerId(ownerId);
          formik.setValues({
            FirstName: ContactInfo?.FirstName || '', LastName: ContactInfo?.LastName || '', Email: ContactInfo?.Email || '', Phone: ContactInfo?.Phone || '', City: cities.find(city => city.name === ContactInfo?.City)?.rentalCityId || '', CountryId: ContactInfo?.CountryId || '', Address: ContactInfo?.Address || '', ZipCode: ContactInfo?.ZipCode || '', BirthDate: ContactInfo?.BirthDate || '', LanguageId: ContactInfo?.LanguageId || '',
            CompanyName: CompanyInfo?.CompanyName || '', WebsiteAddress: CompanyInfo?.WebsiteAddress || '', CompanyCity: cities.find(city => city.name === CompanyInfo?.CompanyCity)?.rentalCityId || '', CompanyAddress: CompanyInfo?.Address || '', CompanyCountryId: CompanyInfo?.CountryId || '', PostCode: CompanyInfo?.PostCode || '', TimeZone: CompanyInfo?.TimeZone || '', Region: CompanyInfo?.Region || '', CompanyPhoneNumber: CompanyInfo?.PhoneNumber || '', VATNumber: CompanyInfo?.VATNumber || '', ManagerIdentificationNumber: CompanyInfo?.ManagerIdentificationNumber || '', MerchantName: CompanyInfo?.MerchantName || '', Locations: CompanyInfo?.Locations?.Location?.length > 0 ? CompanyInfo.Locations.Location.map(loc => ({ '@_Id': loc['@_Id'] })) : [{ '@_Id': '' }], NumberOfProperties: CompanyInfo?.NumberOfProperties || '', NumberOfEmployees: CompanyInfo?.NumberOfEmployees || '', YearsInBusiness: CompanyInfo?.YearsInBusiness || '', DescribeYourBusiness: CompanyInfo?.DescribeYourBusiness || '',
            LegalRepFirstName: LegalRepresentativeInfo?.FirstName || '', LegalRepLastName: LegalRepresentativeInfo?.LastName || '', LegalRepEmail: LegalRepresentativeInfo?.Email || '', LegalRepCity: cities.find(city => city.name === LegalRepresentativeInfo?.City)?.rentalCityId || '', LegalRepCountryOfResidenceId: LegalRepresentativeInfo?.CountryOfResidenceId || '', LegalRepAddress: LegalRepresentativeInfo?.Address || '', LegalRepPostCode: LegalRepresentativeInfo?.PostCode || '', LegalRepBirthday: LegalRepresentativeInfo?.Birthday || '', LegalRepNationalityId: LegalRepresentativeInfo?.NationalityId || '', LegalRepRegion: LegalRepresentativeInfo?.Region || '',
          });
        }
      } catch (error) {
        toast.error(t('Error fetching profile'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cities]);

  const handleLocationChange = (idx, value) => {
    const newLocations = [...formik.values.Locations];
    newLocations[idx]['@_Id'] = value;
    formik.setFieldValue('Locations', newLocations);
  };
  const handleAddLocation = () => {
    formik.setFieldValue('Locations', [...formik.values.Locations, { '@_Id': '' }]);
  };
  const handleRemoveLocation = (idx) => {
    const newLocations = formik.values.Locations.filter((_, i) => i !== idx);
    formik.setFieldValue('Locations', newLocations.length ? newLocations : [{ '@_Id': '' }]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 64px)" sx={{ background: '#fff' }}>
        <CircularProgress sx={{ color: '#00b4b4' }} />
      </Box>
    );
  }

  return (
    <Box className="w-full px-4 sm:px-8 !py-8" mx="auto" mt={4} sx={{ background: '#fff', minHeight: 'calc(100vh - 64px)' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'left' }}>
          {t('Profil entreprise')}
        </Typography>
          <Button
            type="submit"
            variant="contained"
            className="!bg-medium-aquamarine !text-white !shadow-none !rounded-lg !px-6 !py-2 !font-semibold hover:!bg-medium-aquamarine-dark transition"
            disabled={loading}
            sx={{ boxShadow: 'none', borderRadius: 2 }}
          form="profil-entreprise-form"
          >
          {loading ? <CircularProgress size={24} sx={{ color: '#00b4b4' }} /> : t('Update')}
          </Button>
        </Box>
      <form id="profil-entreprise-form" onSubmit={formik.handleSubmit}>
        <Card sx={sectionCardStyle}>
          <CardHeader
            avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>}
            title={<Box sx={sectionHeaderStyle}><Typography variant="h6">{t('Contact Info')}</Typography></Box>}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><TextField label={t('First Name')} name="FirstName" value={formik.values.FirstName} onChange={formik.handleChange} error={formik.touched.FirstName && Boolean(formik.errors.FirstName)} helperText={formik.touched.FirstName && formik.errors.FirstName} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Last Name')} name="LastName" value={formik.values.LastName} onChange={formik.handleChange} error={formik.touched.LastName && Boolean(formik.errors.LastName)} helperText={formik.touched.LastName && formik.errors.LastName} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Email')} name="Email" value={formik.values.Email} onChange={formik.handleChange} error={formik.touched.Email && Boolean(formik.errors.Email)} helperText={formik.touched.Email && formik.errors.Email} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Phone')} name="Phone" value={formik.values.Phone} onChange={formik.handleChange} error={formik.touched.Phone && Boolean(formik.errors.Phone)} helperText={formik.touched.Phone && formik.errors.Phone} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>{t('City')}</InputLabel>
                  <Select
                    name="City"
                    value={formik.values.City}
                    onChange={formik.handleChange}
                    label={t('City')}
                    error={formik.touched.City && Boolean(formik.errors.City)}
                    helperText={formik.touched.City && formik.errors.City}
                  >
                    {cities.map(city => (
                      <MenuItem key={city.rentalCityId} value={city.rentalCityId}>{city.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}><FormControl fullWidth variant="outlined"><InputLabel>{t('Country')}</InputLabel><Select name="CountryId" value={formik.values.CountryId} onChange={formik.handleChange} label={t('Country')} error={formik.touched.CountryId && Boolean(formik.errors.CountryId)} helperText={formik.touched.CountryId && formik.errors.CountryId}>{COUNTRIES.map(country => (<MenuItem key={country.id} value={country.id}>{country.name}</MenuItem>))}</Select></FormControl></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Address')} name="Address" value={formik.values.Address} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.Address && Boolean(formik.errors.Address)} helperText={formik.touched.Address && formik.errors.Address} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Zip Code')} name="ZipCode" value={formik.values.ZipCode} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.ZipCode && Boolean(formik.errors.ZipCode)} helperText={formik.touched.ZipCode && formik.errors.ZipCode} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Birth Date')} name="BirthDate" type="date" value={formik.values.BirthDate} onChange={formik.handleChange} InputLabelProps={{ shrink: true }} fullWidth variant="outlined" error={formik.touched.BirthDate && Boolean(formik.errors.BirthDate)} helperText={formik.touched.BirthDate && formik.errors.BirthDate} /></Grid>
              <Grid item xs={12} sm={4}><FormControl fullWidth variant="outlined"><InputLabel>{t('Language')}</InputLabel><Select name="LanguageId" value={formik.values.LanguageId} onChange={formik.handleChange} label={t('Language')} error={formik.touched.LanguageId && Boolean(formik.errors.LanguageId)} helperText={formik.touched.LanguageId && formik.errors.LanguageId}>{languages.map(lang => (<MenuItem key={lang._id} value={lang.rentalLanguageId}>{lang.name}</MenuItem>))}</Select></FormControl></Grid>
            </Grid>
          </CardContent>
        </Card>
        <Card sx={sectionCardStyle}>
          <CardHeader avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><BusinessIcon /></Avatar>} title={<Box sx={sectionHeaderStyle}><Typography variant="h6">{t('Company Info')}</Typography></Box>} />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><TextField label={t('Company Name')} name="CompanyName" value={formik.values.CompanyName} onChange={formik.handleChange} error={formik.touched.CompanyName && Boolean(formik.errors.CompanyName)} helperText={formik.touched.CompanyName && formik.errors.CompanyName} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Website Address')} name="WebsiteAddress" value={formik.values.WebsiteAddress} onChange={formik.handleChange} error={formik.touched.WebsiteAddress && Boolean(formik.errors.WebsiteAddress)} helperText={formik.touched.WebsiteAddress && formik.errors.WebsiteAddress} fullWidth variant="outlined" /></Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>{t('Company City')}</InputLabel>
                  <Select
                    name="CompanyCity"
                    value={formik.values.CompanyCity}
                    onChange={formik.handleChange}
                    label={t('Company City')}
                    error={formik.touched.CompanyCity && Boolean(formik.errors.CompanyCity)}
                    helperText={formik.touched.CompanyCity && formik.errors.CompanyCity}
                  >
                    {cities.map(city => (
                      <MenuItem key={city.rentalCityId} value={city.rentalCityId}>{city.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Company Address')} name="CompanyAddress" value={formik.values.CompanyAddress} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.CompanyAddress && Boolean(formik.errors.CompanyAddress)} helperText={formik.touched.CompanyAddress && formik.errors.CompanyAddress} /></Grid>
              <Grid item xs={12} sm={4}><FormControl fullWidth variant="outlined"><InputLabel>{t('Company Country')}</InputLabel><Select name="CompanyCountryId" value={formik.values.CompanyCountryId} onChange={formik.handleChange} label={t('Company Country')} error={formik.touched.CompanyCountryId && Boolean(formik.errors.CompanyCountryId)} helperText={formik.touched.CompanyCountryId && formik.errors.CompanyCountryId}>{COUNTRIES.map(country => (<MenuItem key={country.id} value={country.id}>{country.name}</MenuItem>))}</Select></FormControl></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Post Code')} name="PostCode" value={formik.values.PostCode} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.PostCode && Boolean(formik.errors.PostCode)} helperText={formik.touched.PostCode && formik.errors.PostCode} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Time Zone')} name="TimeZone" value={formik.values.TimeZone} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.TimeZone && Boolean(formik.errors.TimeZone)} helperText={formik.touched.TimeZone && formik.errors.TimeZone} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Region')} name="Region" value={formik.values.Region} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.Region && Boolean(formik.errors.Region)} helperText={formik.touched.Region && formik.errors.Region} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Company Phone Number')} name="CompanyPhoneNumber" value={formik.values.CompanyPhoneNumber} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.CompanyPhoneNumber && Boolean(formik.errors.CompanyPhoneNumber)} helperText={formik.touched.CompanyPhoneNumber && formik.errors.CompanyPhoneNumber} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('VAT Number')} name="VATNumber" value={formik.values.VATNumber} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.VATNumber && Boolean(formik.errors.VATNumber)} helperText={formik.touched.VATNumber && formik.errors.VATNumber} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Manager Identification Number')} name="ManagerIdentificationNumber" value={formik.values.ManagerIdentificationNumber} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.ManagerIdentificationNumber && Boolean(formik.errors.ManagerIdentificationNumber)} helperText={formik.touched.ManagerIdentificationNumber && formik.errors.ManagerIdentificationNumber} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Merchant Name')} name="MerchantName" value={formik.values.MerchantName} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.MerchantName && Boolean(formik.errors.MerchantName)} helperText={formik.touched.MerchantName && formik.errors.MerchantName} /></Grid>
              <Grid item xs={12} sm={12}>
                {formik.values.Locations.map((loc, idx) => (
                  <Box key={idx} display="flex" alignItems="center" mb={1}>
                    <FormControl fullWidth variant="outlined" sx={{ mr: 1 }} size="medium" error={formik.touched.Locations?.[idx]?.['@_Id'] && Boolean(formik.errors.Locations?.[idx]?.['@_Id'])}>
                      <InputLabel>{t('Location')}</InputLabel>
                      <Select
                        value={loc['@_Id']}
                        onChange={e => handleLocationChange(idx, e.target.value)}
                        label={t('Location')}
                      >
                        {cities.map(city => (
                          <MenuItem key={city.rentalCityId} value={city.rentalCityId}>{city.name}</MenuItem>
                        ))}
                      </Select>
                      {formik.touched.Locations?.[idx]?.['@_Id'] && formik.errors.Locations?.[idx]?.['@_Id'] && (
                        <FormHelperText>{formik.errors.Locations[idx]['@_Id']}</FormHelperText>
                      )}
                    </FormControl>
                    <IconButton onClick={() => handleRemoveLocation(idx)} disabled={formik.values.Locations.length === 1} color="error">
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                    <IconButton onClick={handleAddLocation} sx={{ color: '#00b4b4' }}>
                      <AddCircleOutlineIcon />
                    </IconButton>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} sm={12}><CompanyStatsSelects values={formik.values} onChange={formik.setFieldValue} errors={formik.errors} touched={formik.touched} /></Grid>
              <Grid item xs={12}><TextField label={t('Describe Your Business')} name="DescribeYourBusiness" value={formik.values.DescribeYourBusiness} onChange={formik.handleChange} fullWidth multiline rows={2} variant="outlined" error={formik.touched.DescribeYourBusiness && Boolean(formik.errors.DescribeYourBusiness)} helperText={formik.touched.DescribeYourBusiness && formik.errors.DescribeYourBusiness} /></Grid>
            </Grid>
          </CardContent>
        </Card>
        <Card sx={sectionCardStyle} className="!pb-4">
          <CardHeader avatar={<Avatar sx={{ bgcolor: 'info.main' }}><GavelIcon /></Avatar>} title={<Box sx={sectionHeaderStyle}><Typography variant="h6">{t('Legal Representative Info')}</Typography></Box>} />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><TextField label={t('First Name')} name="LegalRepFirstName" value={formik.values.LegalRepFirstName} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepFirstName && Boolean(formik.errors.LegalRepFirstName)} helperText={formik.touched.LegalRepFirstName && formik.errors.LegalRepFirstName} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Last Name')} name="LegalRepLastName" value={formik.values.LegalRepLastName} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepLastName && Boolean(formik.errors.LegalRepLastName)} helperText={formik.touched.LegalRepLastName && formik.errors.LegalRepLastName} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Email')} name="LegalRepEmail" value={formik.values.LegalRepEmail} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepEmail && Boolean(formik.errors.LegalRepEmail)} helperText={formik.touched.LegalRepEmail && formik.errors.LegalRepEmail} /></Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>{t('City')}</InputLabel>
                  <Select
                    name="LegalRepCity"
                    value={formik.values.LegalRepCity}
                    onChange={formik.handleChange}
                    label={t('City')}
                    error={formik.touched.LegalRepCity && Boolean(formik.errors.LegalRepCity)}
                    helperText={formik.touched.LegalRepCity && formik.errors.LegalRepCity}
                  >
                    {cities.map(city => (
                      <MenuItem key={city.rentalCityId} value={city.rentalCityId}>{city.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}><FormControl fullWidth variant="outlined"><InputLabel>{t('Country Of Residence')}</InputLabel><Select name="LegalRepCountryOfResidenceId" value={formik.values.LegalRepCountryOfResidenceId} onChange={formik.handleChange} label={t('Country Of Residence')} error={formik.touched.LegalRepCountryOfResidenceId && Boolean(formik.errors.LegalRepCountryOfResidenceId)} helperText={formik.touched.LegalRepCountryOfResidenceId && formik.errors.LegalRepCountryOfResidenceId}>{COUNTRIES.map(country => (<MenuItem key={country.id} value={country.id}>{country.name}</MenuItem>))}</Select></FormControl></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Address')} name="LegalRepAddress" value={formik.values.LegalRepAddress} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepAddress && Boolean(formik.errors.LegalRepAddress)} helperText={formik.touched.LegalRepAddress && formik.errors.LegalRepAddress} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Post Code')} name="LegalRepPostCode" value={formik.values.LegalRepPostCode} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepPostCode && Boolean(formik.errors.LegalRepPostCode)} helperText={formik.touched.LegalRepPostCode && formik.errors.LegalRepPostCode} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Birthday')} name="LegalRepBirthday" type="date" value={formik.values.LegalRepBirthday} onChange={formik.handleChange} InputLabelProps={{ shrink: true }} fullWidth variant="outlined" error={formik.touched.LegalRepBirthday && Boolean(formik.errors.LegalRepBirthday)} helperText={formik.touched.LegalRepBirthday && formik.errors.LegalRepBirthday} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Nationality Id')} name="LegalRepNationalityId" value={formik.values.LegalRepNationalityId} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepNationalityId && Boolean(formik.errors.LegalRepNationalityId)} helperText={formik.touched.LegalRepNationalityId && formik.errors.LegalRepNationalityId} /></Grid>
              <Grid item xs={12} sm={4}><TextField label={t('Region')} name="LegalRepRegion" value={formik.values.LegalRepRegion} onChange={formik.handleChange} fullWidth variant="outlined" error={formik.touched.LegalRepRegion && Boolean(formik.errors.LegalRepRegion)} helperText={formik.touched.LegalRepRegion && formik.errors.LegalRepRegion} /></Grid>
            </Grid>
          </CardContent>
        </Card>
      </form>
      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default ProfilEntrepriseForm; 