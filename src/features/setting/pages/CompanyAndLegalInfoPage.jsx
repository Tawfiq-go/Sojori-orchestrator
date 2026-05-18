import React, { useEffect, useState } from 'react';
import CompanyStatsSelects from '../components/CompanyStatsSelects';
import {
  updateCompanyProfile,
  fetchCompanyProfile,
} from '../services/serverApi.profilEntreprise';
import { getCities, getLanguage } from '../../staff/services/serverApi.task';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  FormHelperText,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GavelIcon from '@mui/icons-material/Gavel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircle';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircle';
import FieldIndicatorCompany from '../components/FieldIndicatorCompany';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';

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
  border: '1px solid #e5e8ec',
};
const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  mb: 2,
  mt: 1,
};

const CompanyAndLegalInfoPage = ({ profile, setProfile, canUpdate }) => {
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const { t } = useTranslation('common');

  const getInitialValues = (profile, cities) => {
    const CompanyInfo = profile?.CompanyInfo || {};
    const LegalRepresentativeInfo = profile?.LegalRepresentativeInfo || {};
    return {
      CompanyName: CompanyInfo.CompanyName || '',
      WebsiteAddress: CompanyInfo.WebsiteAddress || '',
      CompanyCity:
        cities.find((city) => city.name === CompanyInfo.CompanyCity)
          ?.rentalCityId || '',
      CompanyAddress: CompanyInfo.Address || '',
      CompanyCountryId: CompanyInfo.CountryId || '',
      PostCode: CompanyInfo.PostCode || '',
      TimeZone: CompanyInfo.TimeZone || '',
      CompanyPhoneNumber: CompanyInfo.PhoneNumber || '',
      VATNumber: CompanyInfo.VATNumber || '',
      ManagerIdentificationNumber:
        CompanyInfo.ManagerIdentificationNumber || '',
      MerchantName: CompanyInfo.MerchantName || '',
      Locations:
        CompanyInfo.Locations?.Location?.length > 0
          ? CompanyInfo.Locations.Location.map((loc) => ({
              '@_Id': loc['@_Id'],
            }))
          : [{ '@_Id': '' }],
      NumberOfProperties: CompanyInfo.NumberOfProperties || '',
      NumberOfEmployees: CompanyInfo.NumberOfEmployees || '',
      YearsInBusiness: CompanyInfo.YearsInBusiness || '',
      DescribeYourBusiness: CompanyInfo.DescribeYourBusiness || '',
      Area: CompanyInfo.Area || '',
      ConfirmationEmail: CompanyInfo.ConfirmationEmail || '',
      CompanyRegion: CompanyInfo.Region || '',
      CompanyArea: CompanyInfo.Area || '',
      LegalRepFirstName: LegalRepresentativeInfo.FirstName || '',
      LegalRepLastName: LegalRepresentativeInfo.LastName || '',
      LegalRepEmail: LegalRepresentativeInfo.Email || '',
      LegalRepCity:
        cities.find((city) => city.name === LegalRepresentativeInfo.City)
          ?.rentalCityId || '',
      LegalRepCountryOfResidenceId:
        LegalRepresentativeInfo.CountryOfResidenceId || '',
      LegalRepAddress: LegalRepresentativeInfo.Address || '',
      LegalRepPostCode: LegalRepresentativeInfo.PostCode || '',
      LegalRepBirthday: LegalRepresentativeInfo.Birthday || '',
      LegalRepNationalityId: LegalRepresentativeInfo.NationalityId || '',
      LegalRepRegion: LegalRepresentativeInfo.Region || '',
      LegalRepArea: LegalRepresentativeInfo.Area || '',
    };
  };

  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [citiesRes, languagesRes] = await Promise.all([
          getCities({ limit: 200, paged: false }),
          getLanguage(),
        ]);
        setCities(Array.isArray(citiesRes) ? citiesRes : []);
        setLanguages(
          Array.isArray(languagesRes?.data) ? languagesRes.data : [],
        );
        if (profile) {
          setInitialValues(getInitialValues(profile, citiesRes));
        }
      } catch (e) {
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchData();
  }, [profile]);

  const validationSchema = Yup.object({
    CompanyName: Yup.string().required(t('Required')),
    WebsiteAddress: Yup.string().required(t('Required')),
    CompanyCity: Yup.string().required(t('Required')),
    CompanyAddress: Yup.string().required(t('Required')),
    CompanyCountryId: Yup.string().required(t('Required')),
    PostCode: Yup.string().required(t('Required')),
    TimeZone: Yup.string().required(t('Required')),
    CompanyPhoneNumber: Yup.string().required(t('Required')),
    VATNumber: Yup.string().required(t('Required')),
    ManagerIdentificationNumber: Yup.string().required(t('Required')),
    MerchantName: Yup.string().required(t('Required')),
    NumberOfProperties: Yup.string().required(t('Required')),
    NumberOfEmployees: Yup.string().required(t('Required')),
    YearsInBusiness: Yup.string().required(t('Required')),
    DescribeYourBusiness: Yup.string().required(t('Required')),
    ConfirmationEmail: Yup.string().required(t('Required')),
    LegalRepFirstName: Yup.string().required(t('Required')),
    LegalRepLastName: Yup.string().required(t('Required')),
    LegalRepEmail: Yup.string()
      .email(t('Invalid email'))
      .required(t('Required')),
    LegalRepCity: Yup.string().required(t('Required')),
    LegalRepCountryOfResidenceId: Yup.string().required(t('Required')),
    LegalRepAddress: Yup.string().required(t('Required')),
    LegalRepPostCode: Yup.string().required(t('Required')),
    LegalRepBirthday: Yup.string().required(t('Required')),
    LegalRepNationalityId: Yup.string().required(t('Required')),
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialValues || {
      CompanyName: '',
      WebsiteAddress: '',
      CompanyCity: '',
      CompanyAddress: '',
      CompanyCountryId: '',
      PostCode: '',
      TimeZone: '',
      CompanyPhoneNumber: '',
      VATNumber: '',
      ManagerIdentificationNumber: '',
      MerchantName: '',
      Locations: [{ '@_Id': '' }],
      NumberOfProperties: '',
      NumberOfEmployees: '',
      YearsInBusiness: '',
      DescribeYourBusiness: '',
      ConfirmationEmail: '',
      CompanyRegion: '',
      CompanyArea: '',
      LegalRepFirstName: '',
      LegalRepLastName: '',
      LegalRepEmail: '',
      LegalRepCity: '',
      LegalRepCountryOfResidenceId: '',
      LegalRepAddress: '',
      LegalRepPostCode: '',
      LegalRepBirthday: '',
      LegalRepNationalityId: '',
      LegalRepRegion: '',
      LegalRepArea: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!profile) return;
      setFormLoading(true);
      try {
        const companyCityObj = cities.find(
          (city) =>
            city.rentalCityId?.toString() === values.CompanyCity?.toString(),
        );
        const legalRepCityObj = cities.find(
          (city) =>
            city.rentalCityId?.toString() === values.LegalRepCity?.toString(),
        );
        const locationsArr = Array.isArray(values.Locations)
          ? values.Locations.filter((loc) => loc['@_Id']).map((loc) => ({
              '@_Id': loc['@_Id'].toString(),
            }))
          : [];
        const companyPayload = {
          CompanyName: values.CompanyName,
          WebsiteAddress: values.WebsiteAddress,
          CompanyCity: companyCityObj
            ? companyCityObj.name
            : values.CompanyCity,
          Address: values.CompanyAddress,
          CountryId: values.CompanyCountryId,
          PostCode: values.PostCode,
          TimeZone: values.TimeZone,
          Region: values.CompanyRegion,
          PhoneNumber: values.CompanyPhoneNumber,
          VATNumber: values.VATNumber,
          ManagerIdentificationNumber: values.ManagerIdentificationNumber,
          MerchantName: values.MerchantName,
          Locations: { Location: locationsArr },
          NumberOfProperties: values.NumberOfProperties,
          NumberOfEmployees: values.NumberOfEmployees,
          YearsInBusiness: values.YearsInBusiness,
          DescribeYourBusiness: values.DescribeYourBusiness,
          Area: values.CompanyArea,
          ConfirmationEmail: values.ConfirmationEmail,
        };
        const legalRepPayload = {
          FirstName: values.LegalRepFirstName,
          LastName: values.LegalRepLastName,
          Email: values.LegalRepEmail,
          City: legalRepCityObj ? legalRepCityObj.name : values.LegalRepCity,
          CountryOfResidenceId: values.LegalRepCountryOfResidenceId,
          Address: values.LegalRepAddress,
          PostCode: values.LegalRepPostCode,
          Birthday: values.LegalRepBirthday,
          NationalityId: values.LegalRepNationalityId,
          Region: values.LegalRepRegion,
          Area: values.LegalRepArea,
        };
        const response = await updateCompanyProfile(profile.ownerId, {
          ContactInfo: profile.ContactInfo,
          CompanyInfo: companyPayload,
          LegalRepresentativeInfo: legalRepPayload,
        });
        const latest = await fetchCompanyProfile();
        setProfile(latest.data);
        if (response && response.message) {
          toast.success(response.message);
        } else {
          toast.success('Profile updated successfully');
        }
      } catch (e) {
        if (e.response && Array.isArray(e.response.data?.errors)) {
          e.response.data.errors.forEach((err) => {
            toast.error(err.message);
          });
        } else {
          toast.error('An error occurred while updating the profile.');
        }
      } finally {
        setFormLoading(false);
      }
    },
  });

  const handleLocationChange = (idx, value) => {
    formik.setFieldValue(
      'Locations',
      formik.values.Locations.map((loc, i) =>
        i === idx ? { '@_Id': value } : loc,
      ),
    );
  };
  const handleAddLocation = () => {
    formik.setFieldValue('Locations', [
      ...formik.values.Locations,
      { '@_Id': '' },
    ]);
  };
  const handleRemoveLocation = (idx) => {
    const arr = formik.values.Locations.filter((_, i) => i !== idx);
    formik.setFieldValue('Locations', arr.length ? arr : [{ '@_Id': '' }]);
  };

  if (loading || !initialValues) return null;

  return (
    <>
      <Box
        className="w-full px-4 sm:px-8 !py-8 !border-none !shadow-none"
        mx="auto"
        mt={0}
        sx={{
          background: '#fff',
          minHeight: 'calc(100vh - 64px)',
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={4}
        >
          <Typography variant="h4" fontWeight={700} sx={{ textAlign: 'left' }}>
            {t('Company Profile')}
          </Typography>
          {canUpdate && (
            <Button
              type="submit"
              variant="contained"
              className="!bg-[#FF6B35] !text-white !shadow-none !rounded-lg !px-6 !py-2 !font-semibold hover:!bg-[#E55A2B] transition"
              disabled={formLoading}
              sx={{ boxShadow: 'none', borderRadius: 2 }}
              form="company-legal-info-form"
            >
              {formLoading ? (
                <CircularProgress size={24} sx={{ color: '#FF6B35' }} />
              ) : (
                t('Update')
              )}
            </Button>
          )}
        </Box>
        <form id="company-legal-info-form" onSubmit={formik.handleSubmit}>
          <Card sx={sectionCardStyle}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <BusinessIcon />
                </Avatar>
              }
              title={
                <Box sx={sectionHeaderStyle}>
                  <Typography variant="h6">{t('Company Info')}</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Company Name')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="CompanyName"
                    value={formik.values.CompanyName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.CompanyName &&
                      Boolean(formik.errors.CompanyName)
                    }
                    helperText={
                      formik.touched.CompanyName && formik.errors.CompanyName
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Website Address')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="WebsiteAddress"
                    value={formik.values.WebsiteAddress}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.WebsiteAddress &&
                      Boolean(formik.errors.WebsiteAddress)
                    }
                    helperText={
                      formik.touched.WebsiteAddress &&
                      formik.errors.WebsiteAddress
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Company City')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="CompanyCity"
                      value={formik.values.CompanyCity}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {cities.map((city) => (
                        <MenuItem
                          key={city.rentalCityId}
                          value={city.rentalCityId}
                        >
                          {city.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Company Country')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="CompanyCountryId"
                      value={formik.values.CompanyCountryId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {COUNTRIES.map((country) => (
                        <MenuItem key={country.id} value={country.id}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Post Code')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="PostCode"
                    value={formik.values.PostCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.PostCode && Boolean(formik.errors.PostCode)
                    }
                    helperText={
                      formik.touched.PostCode && formik.errors.PostCode
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Region')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="CompanyRegion"
                    value={formik.values.CompanyRegion}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    helperText={t('Optional field, can be left empty')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Company Address')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="CompanyAddress"
                    value={formik.values.CompanyAddress}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.CompanyAddress &&
                      Boolean(formik.errors.CompanyAddress)
                    }
                    helperText={
                      formik.touched.CompanyAddress &&
                      formik.errors.CompanyAddress
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Country, Region, District')}{' '}
                    <FieldIndicatorCompany type="so" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="CompanyArea"
                    value={formik.values.CompanyArea}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    helperText={t('Optional field, can be left empty')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('TimeZone')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="TimeZone"
                      value={formik.values.TimeZone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      <MenuItem value="">{t('Select TimeZone')}</MenuItem>
                      <MenuItem value="UTC-12:00">{t('UTC-12:00')}</MenuItem>
                      <MenuItem value="UTC-11:00">{t('UTC-11:00')}</MenuItem>
                      <MenuItem value="UTC-10:00">{t('UTC-10:00')}</MenuItem>
                      <MenuItem value="UTC-09:00">{t('UTC-09:00')}</MenuItem>
                      <MenuItem value="UTC-08:00">{t('UTC-08:00')}</MenuItem>
                      <MenuItem value="UTC-07:00">{t('UTC-07:00')}</MenuItem>
                      <MenuItem value="UTC-06:00">{t('UTC-06:00')}</MenuItem>
                      <MenuItem value="UTC-05:00">{t('UTC-05:00')}</MenuItem>
                      <MenuItem value="UTC-04:00">{t('UTC-04:00')}</MenuItem>
                      <MenuItem value="UTC-03:00">{t('UTC-03:00')}</MenuItem>
                      <MenuItem value="UTC-02:00">{t('UTC-02:00')}</MenuItem>
                      <MenuItem value="UTC-01:00">{t('UTC-01:00')}</MenuItem>
                      <MenuItem value="UTC+00:00">{t('UTC+00:00')}</MenuItem>
                      <MenuItem value="UTC+01:00">{t('UTC+01:00')}</MenuItem>
                      <MenuItem value="UTC+02:00">{t('UTC+02:00')}</MenuItem>
                      <MenuItem value="UTC+03:00">{t('UTC+03:00')}</MenuItem>
                      <MenuItem value="UTC+04:00">{t('UTC+04:00')}</MenuItem>
                      <MenuItem value="UTC+05:00">{t('UTC+05:00')}</MenuItem>
                      <MenuItem value="UTC+06:00">{t('UTC+06:00')}</MenuItem>
                      <MenuItem value="UTC+07:00">{t('UTC+07:00')}</MenuItem>
                      <MenuItem value="UTC+08:00">{t('UTC+08:00')}</MenuItem>
                      <MenuItem value="UTC+09:00">{t('UTC+09:00')}</MenuItem>
                      <MenuItem value="UTC+10:00">{t('UTC+10:00')}</MenuItem>
                      <MenuItem value="UTC+11:00">{t('UTC+11:00')}</MenuItem>
                      <MenuItem value="UTC+12:00">{t('UTC+12:00')}</MenuItem>
                      <MenuItem value="UTC+13:00">{t('UTC+13:00')}</MenuItem>
                      <MenuItem value="UTC+14:00">{t('UTC+14:00')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Confirmation Email')}{' '}
                    <FieldIndicatorCompany type="so" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="ConfirmationEmail"
                    value={formik.values.ConfirmationEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.ConfirmationEmail &&
                      Boolean(formik.errors.ConfirmationEmail)
                    }
                    helperText={
                      formik.touched.ConfirmationEmail &&
                      formik.errors.ConfirmationEmail
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Company Phone Number')}{' '}
                    <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="CompanyPhoneNumber"
                    value={formik.values.CompanyPhoneNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.CompanyPhoneNumber &&
                      Boolean(formik.errors.CompanyPhoneNumber)
                    }
                    helperText={
                      formik.touched.CompanyPhoneNumber &&
                      formik.errors.CompanyPhoneNumber
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('VAT Number')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="VATNumber"
                    value={formik.values.VATNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.VATNumber &&
                      Boolean(formik.errors.VATNumber)
                    }
                    helperText={
                      formik.touched.VATNumber && formik.errors.VATNumber
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Manager Identification Number')}{' '}
                    <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="ManagerIdentificationNumber"
                    value={formik.values.ManagerIdentificationNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.ManagerIdentificationNumber &&
                      Boolean(formik.errors.ManagerIdentificationNumber)
                    }
                    helperText={
                      formik.touched.ManagerIdentificationNumber &&
                      formik.errors.ManagerIdentificationNumber
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Merchant Name')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="MerchantName"
                    value={formik.values.MerchantName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.MerchantName &&
                      Boolean(formik.errors.MerchantName)
                    }
                    helperText={
                      formik.touched.MerchantName && formik.errors.MerchantName
                    }
                  />
                </Grid>
                {/* Locations */}
                <Grid item xs={12} sm={12}>
                  {formik.values.Locations.map((loc, idx) => (
                    <Box key={idx} display="flex" alignItems="flex-end" mb={1}>
                      <Box flex={1}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={600}
                          mb={0.5}
                        >
                          {t('Location')}
                        </Typography>
                        <FormControl
                          fullWidth
                          variant="outlined"
                          sx={{ mr: 1 }}
                          size="medium"
                        >
                          <Select
                            disabled={!canUpdate}
                            value={loc['@_Id']}
                            onChange={(e) =>
                              handleLocationChange(idx, e.target.value)
                            }
                            label=""
                          >
                            {cities.map((city) => (
                              <MenuItem
                                key={city.rentalCityId}
                                value={city.rentalCityId}
                              >
                                {city.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      {canUpdate && (
                        <IconButton
                          onClick={() => handleRemoveLocation(idx)}
                          disabled={formik.values.Locations.length === 1}
                          color="error"
                          sx={{
                            height: 40,
                            width: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <RemoveCircleOutlineIcon fontSize="medium" />
                        </IconButton>
                      )}
                      {canUpdate && (
                        <IconButton
                          onClick={handleAddLocation}
                          sx={{
                            color: '#FF6B35',
                            height: 40,
                            width: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AddCircleOutlineIcon fontSize="medium" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Grid>
                <Grid item xs={12} sm={12}>
                  <CompanyStatsSelects
                    values={formik.values}
                    onChange={(name, value) =>
                      formik.setFieldValue(name, value)
                    }
                    errors={{}}
                    touched={{}}
                    canUpdate={canUpdate}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Describe Your Business')}{' '}
                    <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    name="DescribeYourBusiness"
                    value={formik.values.DescribeYourBusiness}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    error={
                      formik.touched.DescribeYourBusiness &&
                      Boolean(formik.errors.DescribeYourBusiness)
                    }
                    helperText={
                      formik.touched.DescribeYourBusiness &&
                      formik.errors.DescribeYourBusiness
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Card sx={sectionCardStyle} className="!pb-4">
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <GavelIcon />
                </Avatar>
              }
              title={
                <Box sx={sectionHeaderStyle}>
                  <Typography variant="h6">
                    {t('Legal Representative Info')}
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('First Name')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepFirstName"
                    value={formik.values.LegalRepFirstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepFirstName &&
                      Boolean(formik.errors.LegalRepFirstName)
                    }
                    helperText={
                      formik.touched.LegalRepFirstName &&
                      formik.errors.LegalRepFirstName
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Last Name')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepLastName"
                    value={formik.values.LegalRepLastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepLastName &&
                      Boolean(formik.errors.LegalRepLastName)
                    }
                    helperText={
                      formik.touched.LegalRepLastName &&
                      formik.errors.LegalRepLastName
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Email')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepEmail"
                    value={formik.values.LegalRepEmail}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepEmail &&
                      Boolean(formik.errors.LegalRepEmail)
                    }
                    helperText={
                      formik.touched.LegalRepEmail &&
                      formik.errors.LegalRepEmail
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('City')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="LegalRepCity"
                      value={formik.values.LegalRepCity}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {cities.map((city) => (
                        <MenuItem
                          key={city.rentalCityId}
                          value={city.rentalCityId}
                        >
                          {city.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Country Of Residence')}{' '}
                    <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="LegalRepCountryOfResidenceId"
                      value={formik.values.LegalRepCountryOfResidenceId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {COUNTRIES.map((country) => (
                        <MenuItem key={country.id} value={country.id}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Post Code')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepPostCode"
                    value={formik.values.LegalRepPostCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepPostCode &&
                      Boolean(formik.errors.LegalRepPostCode)
                    }
                    helperText={
                      formik.touched.LegalRepPostCode &&
                      formik.errors.LegalRepPostCode
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Address')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepAddress"
                    value={formik.values.LegalRepAddress}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepAddress &&
                      Boolean(formik.errors.LegalRepAddress)
                    }
                    helperText={
                      formik.touched.LegalRepAddress &&
                      formik.errors.LegalRepAddress
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Country, Region, District')}{' '}
                    <FieldIndicatorCompany type="so" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepArea"
                    value={formik.values.LegalRepArea}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    helperText={t('Optional field, can be left empty')}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Birthday')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepBirthday"
                    type="date"
                    value={formik.values.LegalRepBirthday}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LegalRepBirthday &&
                      Boolean(formik.errors.LegalRepBirthday)
                    }
                    helperText={
                      formik.touched.LegalRepBirthday &&
                      formik.errors.LegalRepBirthday
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Nationality Id')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <Select
                      disabled={!canUpdate}
                      name="LegalRepNationalityId"
                      value={formik.values.LegalRepNationalityId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <MenuItem value="">{t('Please select')}</MenuItem>
                      {COUNTRIES.map((country) => (
                        <MenuItem key={country.id} value={country.id}>
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Region')} <FieldIndicatorCompany type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LegalRepRegion"
                    value={formik.values.LegalRepRegion}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    helperText={t('Optional field, can be left empty')}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </form>
      </Box>
    </>
  );
};

export default CompanyAndLegalInfoPage;
