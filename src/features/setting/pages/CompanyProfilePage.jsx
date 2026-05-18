import React, { useEffect, useState } from 'react';
import {
  updateCompanyProfile,
  fetchCompanyProfile,
} from '../services/serverApi.profilEntreprise';
import { getCities, getLanguage } from '../../staff/services/serverApi.task';
import { getCountries } from 'features/listing/services/serverApi.listing';
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
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FieldIndicatorProfile from '../components/FieldIndicatorProfile';
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

const CompanyProfilePage = ({ profile, setProfile, canUpdate }) => {
  const [cities, setCities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const { t } = useTranslation('common');

  const validationSchema = Yup.object({
    FirstName: Yup.string().required(t('Required')),
    LastName: Yup.string().required(t('Required')),
    Email: Yup.string().email(t('Invalid email')).required(t('Required')),
    Phone: Yup.string().required(t('Required')),
    City: Yup.string().required(t('Required')),
    CountryId: Yup.string().required(t('Required')),
    Address: Yup.string().required(t('Required')),
    ZipCode: Yup.string().required(t('Required')),
    BirthDate: Yup.string().required(t('Required')),
    LanguageId: Yup.string().required(t('Required')),
    Nationality: Yup.string().required(t('Required')),
  });

  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [citiesRes, languagesRes, countriesRes] = await Promise.all([
          getCities({ limit: 200, paged: false }),
          getLanguage(),
          getCountries(),
        ]);
        setCities(Array.isArray(citiesRes) ? citiesRes : []);
        setLanguages(
          Array.isArray(languagesRes?.data) ? languagesRes.data : [],
        );
        setCountries(Array.isArray(countriesRes.data) ? countriesRes.data : []);
        const ContactInfo = profile?.ContactInfo || {};
        setInitialValues({
          FirstName: ContactInfo.FirstName || '',
          LastName: ContactInfo.LastName || '',
          Email: ContactInfo.Email || '',
          Phone: ContactInfo.Phone || '',
          City:
            citiesRes.find((city) => city.name === ContactInfo.City)
              ?.rentalCityId || '',
          CountryId: ContactInfo.CountryId || '',
          Address: ContactInfo.Address || '',
          ZipCode: ContactInfo.ZipCode || '',
          BirthDate: ContactInfo.BirthDate || '',
          LanguageId: ContactInfo.LanguageId
            ? String(ContactInfo.LanguageId)
            : '',
          Nationality: ContactInfo.Nationality || '',
          Area: ContactInfo.Area || '',
          Region: ContactInfo.Region || '',
        });
      } catch (e) {
        toast.error('Error loading data');
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchData();
  }, [profile]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialValues || {
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
      Nationality: '',
      Area: '',
      Region: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!profile) return;
      if (!formik.isValid) {
        toast.error('Please fix all validation before submitting.');
        return;
      }
      setFormLoading(true);
      try {
        const contactCityObj = cities.find(
          (city) => city.rentalCityId?.toString() === values.City?.toString(),
        );
        const payload = {
          ...values,
          City: contactCityObj ? contactCityObj.name : values.City,
          LanguageId: values.LanguageId ? String(values.LanguageId) : '',
        };
        const response = await updateCompanyProfile(profile.ownerId, {
          ContactInfo: payload,
          CompanyInfo: profile.CompanyInfo,
          LegalRepresentativeInfo: profile.LegalRepresentativeInfo,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formik.isValid) {
      toast.error('Please fix all validation before submitting.');
      return;
    }
    formik.handleSubmit();
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
            {t('My Profile')}
          </Typography>
          {canUpdate && (
            <Button
              type="submit"
              variant="contained"
              className="!bg-[#FF6B35] !text-white !shadow-none !rounded-lg !px-6 !py-2 !font-semibold hover:!bg-[#E55A2B] transition"
              disabled={formLoading}
              sx={{ boxShadow: 'none', borderRadius: 2 }}
              form="company-profile-form"
            >
              {formLoading ? (
                <CircularProgress size={24} sx={{ color: '#FF6B35' }} />
              ) : (
                t('Update')
              )}
            </Button>
          )}
        </Box>
        <form id="company-profile-form" onSubmit={handleSubmit}>
          <Card sx={sectionCardStyle}>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              mt={3}
              mb={2}
            >
              <Avatar sx={{ bgcolor: '#FF6B35', width: 80, height: 80 }}>
                <AccountCircleIcon sx={{ fontSize: 60, color: '#f5f5f5' }} />
              </Avatar>
              <Typography variant="h6" mt={2} mb={1} align="center">
                {t('Set your profile up.')}
              </Typography>
            </Box>
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('First Name')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="FirstName"
                    value={formik.values.FirstName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.FirstName &&
                      Boolean(formik.errors.FirstName)
                    }
                    helperText={
                      formik.touched.FirstName && formik.errors.FirstName
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Last Name')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="LastName"
                    value={formik.values.LastName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LastName && Boolean(formik.errors.LastName)
                    }
                    helperText={
                      formik.touched.LastName && formik.errors.LastName
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Email')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="Email"
                    value={formik.values.Email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={formik.touched.Email && Boolean(formik.errors.Email)}
                    helperText={formik.touched.Email && formik.errors.Email}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Phone')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="Phone"
                    value={formik.values.Phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={formik.touched.Phone && Boolean(formik.errors.Phone)}
                    helperText={formik.touched.Phone && formik.errors.Phone}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('City')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={formik.touched.City && Boolean(formik.errors.City)}
                  >
                    <InputLabel shrink={false}></InputLabel>
                    <Select
                      disabled={!canUpdate}
                      name="City"
                      value={formik.values.City}
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
                    {formik.touched.City && formik.errors.City && (
                      <div style={{ color: 'red', fontSize: 12 }}>
                        {formik.errors.City}
                      </div>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Country')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.CountryId &&
                      Boolean(formik.errors.CountryId)
                    }
                  >
                    <InputLabel shrink={false}></InputLabel>
                    <Select
                      disabled={!canUpdate}
                      name="CountryId"
                      value={formik.values.CountryId}
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
                    {formik.touched.CountryId && formik.errors.CountryId && (
                      <div style={{ color: 'red', fontSize: 12 }}>
                        {formik.errors.CountryId}
                      </div>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Address')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="Address"
                    value={formik.values.Address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.Address && Boolean(formik.errors.Address)
                    }
                    helperText={formik.touched.Address && formik.errors.Address}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Country, Region, District')}{' '}
                    <FieldIndicatorProfile type="so" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="Area"
                    value={formik.values.Area}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    helperText={t('Optional field, can be left empty')}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Zip Code')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="ZipCode"
                    value={formik.values.ZipCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.ZipCode && Boolean(formik.errors.ZipCode)
                    }
                    helperText={formik.touched.ZipCode && formik.errors.ZipCode}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Birth Date')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="BirthDate"
                    type="date"
                    value={formik.values.BirthDate}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.BirthDate &&
                      Boolean(formik.errors.BirthDate)
                    }
                    helperText={
                      formik.touched.BirthDate && formik.errors.BirthDate
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Language')} <FieldIndicatorProfile type="ru" />
                  </Typography>
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.LanguageId &&
                      Boolean(formik.errors.LanguageId)
                    }
                  >
                    <InputLabel shrink={false}></InputLabel>
                    <Select
                      disabled={!canUpdate}
                      name="LanguageId"
                      value={formik.values.LanguageId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang._id} value={lang.rentalLanguageId}>
                          {lang.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.LanguageId && formik.errors.LanguageId && (
                      <div style={{ color: 'red', fontSize: 12 }}>
                        {formik.errors.LanguageId}
                      </div>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Nationality')} <FieldIndicatorProfile type="so" />
                  </Typography>
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={
                      formik.touched.Nationality &&
                      Boolean(formik.errors.Nationality)
                    }
                  >
                    <InputLabel shrink={false}></InputLabel>
                    <Select
                      disabled={!canUpdate}
                      name="Nationality"
                      value={formik.values.Nationality}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      label=""
                    >
                      {countries.map((country) => (
                        <MenuItem
                          key={country._id || country.id || country.name}
                          value={country.name}
                        >
                          {country.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.Nationality &&
                      formik.errors.Nationality && (
                        <div style={{ color: 'red', fontSize: 12 }}>
                          {formik.errors.Nationality}
                        </div>
                      )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                    {t('Region')} <FieldIndicatorProfile type="so" />
                  </Typography>
                  <TextField
                    disabled={!canUpdate}
                    label=""
                    name="Region"
                    value={formik.values.Region}
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

export default CompanyProfilePage;
