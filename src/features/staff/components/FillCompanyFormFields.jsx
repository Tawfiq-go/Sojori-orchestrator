import React from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  Select,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Avatar,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { User, Building, Gavel } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RuFieldBadge, { FieldLabelWithRuBadge } from './RuFieldBadge';
import SearchableSelect from './SearchableSelect';
import CityFreeSoloAutocomplete from './CityFreeSoloAutocomplete';

function resolveFc(namePrefix, path) {
  return namePrefix ? `${namePrefix}.${path}` : path;
}

function resolveFcBlock(values, namePrefix) {
  return namePrefix ? values[namePrefix] || {} : values;
}

function resolveFcTouched(touched, namePrefix, block) {
  const root = namePrefix ? touched[namePrefix] : touched;
  return root?.[block];
}

function resolveFcErrors(errors, namePrefix, block) {
  const root = namePrefix ? errors[namePrefix] : errors;
  return root?.[block];
}

/**
 * Champs FillCompany (ContactInfo, CompanyInfo, LegalRepresentativeInfo) avec badges RU.
 * Utilisable dans Formik parent avec namePrefix="fillCompany" ou racine (FillCompanySidebar).
 */
export default function FillCompanyFormFields({
  namePrefix = '',
  values,
  errors = {},
  touched = {},
  handleChange,
  handleBlur,
  setFieldValue,
  cities = [],
  ruCountries = [],
  languagesRu = [],
  ruNationalities = [],
  loadingRefPickers = false,
  refPickersFallback = false,
  refPickersError = null,
  selectedCities = [],
  onSelectedCitiesChange,
  mirrorAccountFields = false,
  accountValues = {},
}) {
  const { t } = useTranslation('common');
  const fc = (path) => resolveFc(namePrefix, path);
  const fcValues = resolveFcBlock(values, namePrefix);
  const contact = fcValues.ContactInfo || {};
  const company = fcValues.CompanyInfo || {};
  const legal = fcValues.LegalRepresentativeInfo || {};
  const tContact = resolveFcTouched(touched, namePrefix, 'ContactInfo');
  const tCompany = resolveFcTouched(touched, namePrefix, 'CompanyInfo');
  const tLegal = resolveFcTouched(touched, namePrefix, 'LegalRepresentativeInfo');
  const eContact = resolveFcErrors(errors, namePrefix, 'ContactInfo');
  const eCompany = resolveFcErrors(errors, namePrefix, 'CompanyInfo');
  const eLegal = resolveFcErrors(errors, namePrefix, 'LegalRepresentativeInfo');

  const handleCityChange = (event) => {
    const value = event.target.value;
    onSelectedCitiesChange?.(typeof value === 'string' ? value.split(',') : value);
  };

  const mirror = mirrorAccountFields
    ? {
        firstName: accountValues.firstName ?? contact.FirstName,
        lastName: accountValues.lastName ?? contact.LastName,
        email: accountValues.email ?? contact.Email,
        phone: accountValues.phone ?? contact.Phone,
      }
    : null;

  return (
    <Box className="owner-fill-company-fields" sx={{ mt: 2 }}>
      {(refPickersFallback || refPickersError) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {refPickersError ? `${refPickersError} — ` : ''}
            {t('channelsRefPickersHint', {
              defaultValue:
                'Référentiel réduit : Hub Channels → Mapping → Sync pays RU / Sync langues RU pour la liste complète.',
            })}
          </Typography>
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2, alignItems: 'flex-start' }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {t('ruFieldBadge.formLegend', {
            defaultValue: 'Badges : champs envoyés à Rental United vs Sojori uniquement.',
          })}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <RuFieldBadge kind="ru" ruXmlPath="ContactInfo.*" />
          <RuFieldBadge kind="nonRu" />
          <RuFieldBadge kind="new" ruXmlPath="ContactInfo.Area" />
          <RuFieldBadge kind="ruStoredNotPushed" ruXmlPath="CompanyInfo.ConfirmationEmail" />
          <RuFieldBadge kind="ruMirror" ruXmlPath="Account → ContactInfo" />
        </Box>
      </Alert>

      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e5e8ec' }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <User size={18} />
            </Avatar>
          }
          title={<Typography variant="subtitle1" fontWeight={700}>{t('Contact Information')}</Typography>}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind={mirror ? 'ruMirror' : 'ru'} ruXmlPath="ContactInfo.FirstName" required>
                {t('First Name')}
              </FieldLabelWithRuBadge>
              {mirror ? (
                <TextField value={mirror.firstName} fullWidth size="small" disabled />
              ) : (
                <TextField
                  name={fc('ContactInfo.FirstName')}
                  value={contact.FirstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={tContact?.FirstName && Boolean(eContact?.FirstName)}
                  helperText={tContact?.FirstName && eContact?.FirstName ? t(eContact.FirstName) : ''}
                  fullWidth
                  size="small"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind={mirror ? 'ruMirror' : 'ru'} ruXmlPath="ContactInfo.LastName" required>
                {t('Last Name')}
              </FieldLabelWithRuBadge>
              {mirror ? (
                <TextField value={mirror.lastName} fullWidth size="small" disabled />
              ) : (
                <TextField
                  name={fc('ContactInfo.LastName')}
                  value={contact.LastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={tContact?.LastName && Boolean(eContact?.LastName)}
                  helperText={tContact?.LastName && eContact?.LastName ? t(eContact.LastName) : ''}
                  fullWidth
                  size="small"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind={mirror ? 'ruMirror' : 'ru'} ruXmlPath="ContactInfo.Email" required>
                {t('Email')}
              </FieldLabelWithRuBadge>
              {mirror ? (
                <TextField value={mirror.email} fullWidth size="small" disabled />
              ) : (
                <TextField
                  name={fc('ContactInfo.Email')}
                  value={contact.Email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={tContact?.Email && Boolean(eContact?.Email)}
                  helperText={tContact?.Email && eContact?.Email ? t(eContact.Email) : ''}
                  fullWidth
                  size="small"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind={mirror ? 'ruMirror' : 'ru'} ruXmlPath="ContactInfo.Phone" required>
                {t('Phone')}
              </FieldLabelWithRuBadge>
              {mirror ? (
                <TextField value={mirror.phone} fullWidth size="small" disabled />
              ) : (
                <TextField
                  name={fc('ContactInfo.Phone')}
                  value={contact.Phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={tContact?.Phone && Boolean(eContact?.Phone)}
                  helperText={tContact?.Phone && eContact?.Phone ? t(eContact.Phone) : ''}
                  fullWidth
                  size="small"
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.City" required>
                {t('City')}
              </FieldLabelWithRuBadge>
              <CityFreeSoloAutocomplete
                label={t('City')}
                cities={cities}
                value={contact.City}
                onChange={(v) => setFieldValue(fc('ContactInfo.City'), v)}
                error={Boolean(tContact?.City && eContact?.City)}
                helperText={tContact?.City && eContact?.City ? t(eContact.City) : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.CountryId" required>
                {t('Country')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Country')}
                options={ruCountries}
                optionValueKey="ruCode"
                getOptionLabel={(o) => o.label}
                value={contact.CountryId}
                onChange={(v) => setFieldValue(fc('ContactInfo.CountryId'), v)}
                error={Boolean(tContact?.CountryId && eContact?.CountryId)}
                helperText={tContact?.CountryId && eContact?.CountryId ? t(eContact.CountryId) : ''}
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Address" required>
                {t('Address')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('ContactInfo.Address')}
                value={contact.Address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tContact?.Address && Boolean(eContact?.Address)}
                helperText={tContact?.Address && eContact?.Address ? t(eContact.Address) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.ZipCode" required>
                {t('Zip Code')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('ContactInfo.ZipCode')}
                value={contact.ZipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tContact?.ZipCode && Boolean(eContact?.ZipCode)}
                helperText={tContact?.ZipCode && eContact?.ZipCode ? t(eContact.ZipCode) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.BirthDate" required>
                {t('Birth Date')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('ContactInfo.BirthDate')}
                type="date"
                value={contact.BirthDate}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tContact?.BirthDate && Boolean(eContact?.BirthDate)}
                helperText={tContact?.BirthDate && eContact?.BirthDate ? t(eContact.BirthDate) : ''}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.LanguageId" required>
                {t('Language')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Language')}
                options={languagesRu}
                optionValueKey="ruCode"
                getOptionLabel={(o) => o.label}
                value={contact.LanguageId}
                onChange={(v) => setFieldValue(fc('ContactInfo.LanguageId'), v)}
                error={Boolean(tContact?.LanguageId && eContact?.LanguageId)}
                helperText={tContact?.LanguageId && eContact?.LanguageId ? t(eContact.LanguageId) : ''}
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Nationality → NationalityId" required>
                {t('Nationality')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Nationality')}
                options={ruNationalities}
                optionValueKey="value"
                getOptionLabel={(o) => o.label}
                value={contact.Nationality}
                onChange={(v) => setFieldValue(fc('ContactInfo.Nationality'), v)}
                error={Boolean(tContact?.Nationality && eContact?.Nationality)}
                helperText={tContact?.Nationality && eContact?.Nationality ? t(eContact.Nationality) : ''}
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="ContactInfo.Region → RegionId">
                {t('Region')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('ContactInfo.Region')}
                value={contact.Region}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                size="small"
                placeholder="**"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="new" ruXmlPath="ContactInfo.Area → AreaId">
                {t('Area')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('ContactInfo.Area')}
                value={contact.Area}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                size="small"
                placeholder="**"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e5e8ec' }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
              <Building size={18} />
            </Avatar>
          }
          title={<Typography variant="subtitle1" fontWeight={700}>{t('Company Information')}</Typography>}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CompanyName" required>
                {t('Company Name')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.CompanyName')}
                value={company.CompanyName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.CompanyName && Boolean(eCompany?.CompanyName)}
                helperText={tCompany?.CompanyName && eCompany?.CompanyName ? t(eCompany.CompanyName) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.WebsiteAddress">
                {t('Website Address')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.WebsiteAddress')}
                value={company.WebsiteAddress}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CompanyCity" required>
                {t('Company City')}
              </FieldLabelWithRuBadge>
              <CityFreeSoloAutocomplete
                label={t('Company City')}
                cities={cities}
                value={company.CompanyCity}
                onChange={(v) => setFieldValue(fc('CompanyInfo.CompanyCity'), v)}
                error={Boolean(tCompany?.CompanyCity && eCompany?.CompanyCity)}
                helperText={tCompany?.CompanyCity && eCompany?.CompanyCity ? t(eCompany.CompanyCity) : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.CountryId" required>
                {t('Company Country')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Company Country')}
                options={ruCountries}
                optionValueKey="ruCode"
                getOptionLabel={(o) => o.label}
                value={company.CountryId}
                onChange={(v) => setFieldValue(fc('CompanyInfo.CountryId'), v)}
                error={Boolean(tCompany?.CountryId && eCompany?.CountryId)}
                helperText={tCompany?.CountryId && eCompany?.CountryId ? t(eCompany.CountryId) : ''}
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.PostCode" required>
                {t('Post Code')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.PostCode')}
                value={company.PostCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.PostCode && Boolean(eCompany?.PostCode)}
                helperText={tCompany?.PostCode && eCompany?.PostCode ? t(eCompany.PostCode) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Region → RegionId" required>
                {t('Region')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.Region')}
                value={company.Region}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.Region && Boolean(eCompany?.Region)}
                helperText={tCompany?.Region && eCompany?.Region ? t(eCompany.Region) : ''}
                fullWidth
                size="small"
                placeholder="**"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Address" required>
                {t('Company Address')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.Address')}
                value={company.Address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.Address && Boolean(eCompany?.Address)}
                helperText={tCompany?.Address && eCompany?.Address ? t(eCompany.Address) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.TimeZone" required>
                {t('Time Zone')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.TimeZone')}
                value={company.TimeZone}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.TimeZone && Boolean(eCompany?.TimeZone)}
                helperText={tCompany?.TimeZone && eCompany?.TimeZone ? t(eCompany.TimeZone) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ruStoredNotPushed" ruXmlPath="CompanyInfo.ConfirmationEmail">
                {t('Confirmation Email')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.ConfirmationEmail')}
                value={company.ConfirmationEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.PhoneNumber" required>
                {t('Company Phone Number')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.PhoneNumber')}
                value={company.PhoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.PhoneNumber && Boolean(eCompany?.PhoneNumber)}
                helperText={tCompany?.PhoneNumber && eCompany?.PhoneNumber ? t(eCompany.PhoneNumber) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.VATNumber" required>
                {t('VAT Number')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.VATNumber')}
                value={company.VATNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.VATNumber && Boolean(eCompany?.VATNumber)}
                helperText={tCompany?.VATNumber && eCompany?.VATNumber ? t(eCompany.VATNumber) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.ManagerIdentificationNumber" required>
                {t('Manager Identification Number')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.ManagerIdentificationNumber')}
                value={company.ManagerIdentificationNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.ManagerIdentificationNumber && Boolean(eCompany?.ManagerIdentificationNumber)}
                helperText={
                  tCompany?.ManagerIdentificationNumber && eCompany?.ManagerIdentificationNumber
                    ? t(eCompany.ManagerIdentificationNumber)
                    : ''
                }
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.MerchantName" required>
                {t('Merchant Name')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.MerchantName')}
                value={company.MerchantName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.MerchantName && Boolean(eCompany?.MerchantName)}
                helperText={tCompany?.MerchantName && eCompany?.MerchantName ? t(eCompany.MerchantName) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.NumberOfProperties" required>
                {t('Number Of Properties')}
              </FieldLabelWithRuBadge>
              <FormControl fullWidth size="small">
                <Select
                  name={fc('CompanyInfo.NumberOfProperties')}
                  value={company.NumberOfProperties}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="0">{t('None')}</MenuItem>
                  <MenuItem value="1">1 - 4</MenuItem>
                  <MenuItem value="2">5 - 9</MenuItem>
                  <MenuItem value="3">10 - 19</MenuItem>
                  <MenuItem value="4">20 - 29</MenuItem>
                  <MenuItem value="5">30 - 39</MenuItem>
                  <MenuItem value="6">40 - 49</MenuItem>
                  <MenuItem value="7">50 - 99</MenuItem>
                  <MenuItem value="8">100 - 199</MenuItem>
                  <MenuItem value="9">200 - 499</MenuItem>
                  <MenuItem value="10">500 - 1000</MenuItem>
                  <MenuItem value="11">1000+</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.NumberOfEmployees" required>
                {t('Number Of Employees')}
              </FieldLabelWithRuBadge>
              <FormControl fullWidth size="small">
                <Select
                  name={fc('CompanyInfo.NumberOfEmployees')}
                  value={company.NumberOfEmployees}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="0">{t('None')}</MenuItem>
                  <MenuItem value="1">1 - 5</MenuItem>
                  <MenuItem value="2">6 - 10</MenuItem>
                  <MenuItem value="3">11 - 20</MenuItem>
                  <MenuItem value="4">21 - 50</MenuItem>
                  <MenuItem value="5">51 - 100</MenuItem>
                  <MenuItem value="6">100+</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.YearsInBusiness" required>
                {t('Years In Business')}
              </FieldLabelWithRuBadge>
              <FormControl fullWidth size="small">
                <Select
                  name={fc('CompanyInfo.YearsInBusiness')}
                  value={company.YearsInBusiness}
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value="0">{t('None')}</MenuItem>
                  <MenuItem value="1">1 - 2</MenuItem>
                  <MenuItem value="2">3 - 5</MenuItem>
                  <MenuItem value="3">6 - 10</MenuItem>
                  <MenuItem value="4">10+</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.DescribeYourBusiness" required>
                {t('Describe Your Business')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('CompanyInfo.DescribeYourBusiness')}
                value={company.DescribeYourBusiness}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tCompany?.DescribeYourBusiness && Boolean(eCompany?.DescribeYourBusiness)}
                helperText={
                  tCompany?.DescribeYourBusiness && eCompany?.DescribeYourBusiness
                    ? t(eCompany.DescribeYourBusiness)
                    : ''
                }
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="CompanyInfo.Locations">
                {t('Locations')}
              </FieldLabelWithRuBadge>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  value={selectedCities}
                  onChange={handleCityChange}
                  onBlur={handleBlur}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {cities.map((city) => (
                    <MenuItem key={city.rentalCityId || city._id} value={city.rentalCityId}>
                      {city.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 2, border: '1px solid #e5e8ec' }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'info.main', width: 36, height: 36 }}>
              <Gavel size={18} />
            </Avatar>
          }
          title={
            <Typography variant="subtitle1" fontWeight={700}>
              {t('Legal Representative Information')}
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            {[
              ['FirstName', 'First Name', 'LegalRepresentativeInfo.FirstName'],
              ['LastName', 'Last Name', 'LegalRepresentativeInfo.LastName'],
              ['Email', 'Email', 'LegalRepresentativeInfo.Email'],
            ].map(([key, label, xml]) => (
              <Grid item xs={12} sm={6} key={key}>
                <FieldLabelWithRuBadge kind="ru" ruXmlPath={xml} required>
                  {t(label)}
                </FieldLabelWithRuBadge>
                <TextField
                  name={fc(`LegalRepresentativeInfo.${key}`)}
                  value={legal[key]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={tLegal?.[key] && Boolean(eLegal?.[key])}
                  helperText={tLegal?.[key] && eLegal?.[key] ? t(eLegal[key]) : ''}
                  fullWidth
                  size="small"
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.City" required>
                {t('City')}
              </FieldLabelWithRuBadge>
              <CityFreeSoloAutocomplete
                label={t('City')}
                cities={cities}
                value={legal.City}
                onChange={(v) => setFieldValue(fc('LegalRepresentativeInfo.City'), v)}
                error={Boolean(tLegal?.City && eLegal?.City)}
                helperText={tLegal?.City && eLegal?.City ? t(eLegal.City) : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.CountryOfResidenceId" required>
                {t('Country of Residence')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Country of Residence')}
                options={ruCountries}
                optionValueKey="ruCode"
                getOptionLabel={(o) => o.label}
                value={legal.CountryOfResidenceId}
                onChange={(v) => setFieldValue(fc('LegalRepresentativeInfo.CountryOfResidenceId'), v)}
                error={Boolean(tLegal?.CountryOfResidenceId && eLegal?.CountryOfResidenceId)}
                helperText={
                  tLegal?.CountryOfResidenceId && eLegal?.CountryOfResidenceId
                    ? t(eLegal.CountryOfResidenceId)
                    : ''
                }
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Address" required>
                {t('Address')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('LegalRepresentativeInfo.Address')}
                value={legal.Address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tLegal?.Address && Boolean(eLegal?.Address)}
                helperText={tLegal?.Address && eLegal?.Address ? t(eLegal.Address) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.PostCode" required>
                {t('Post Code')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('LegalRepresentativeInfo.PostCode')}
                value={legal.PostCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tLegal?.PostCode && Boolean(eLegal?.PostCode)}
                helperText={tLegal?.PostCode && eLegal?.PostCode ? t(eLegal.PostCode) : ''}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Birthday" required>
                {t('Birthday')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('LegalRepresentativeInfo.Birthday')}
                type="date"
                value={legal.Birthday}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tLegal?.Birthday && Boolean(eLegal?.Birthday)}
                helperText={tLegal?.Birthday && eLegal?.Birthday ? t(eLegal.Birthday) : ''}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.NationalityId" required>
                {t('Nationality')}
              </FieldLabelWithRuBadge>
              <SearchableSelect
                label={t('Nationality')}
                options={ruCountries}
                optionValueKey="ruCode"
                getOptionLabel={(o) => o.label}
                value={legal.NationalityId}
                onChange={(v) => setFieldValue(fc('LegalRepresentativeInfo.NationalityId'), v)}
                error={Boolean(tLegal?.NationalityId && eLegal?.NationalityId)}
                helperText={
                  tLegal?.NationalityId && eLegal?.NationalityId ? t(eLegal.NationalityId) : ''
                }
                disabled={loadingRefPickers}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="ru" ruXmlPath="LegalRepresentativeInfo.Region → RegionId" required>
                {t('Region')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('LegalRepresentativeInfo.Region')}
                value={legal.Region}
                onChange={handleChange}
                onBlur={handleBlur}
                error={tLegal?.Region && Boolean(eLegal?.Region)}
                helperText={tLegal?.Region && eLegal?.Region ? t(eLegal.Region) : ''}
                fullWidth
                size="small"
                placeholder="**"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabelWithRuBadge kind="new" ruXmlPath="LegalRepresentativeInfo.Area → AreaId">
                {t('Area')}
              </FieldLabelWithRuBadge>
              <TextField
                name={fc('LegalRepresentativeInfo.Area')}
                value={legal.Area}
                onChange={handleChange}
                onBlur={handleBlur}
                fullWidth
                size="small"
                placeholder="**"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
