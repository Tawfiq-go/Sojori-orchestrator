import React from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import FieldIndicatorCompany from './FieldIndicatorCompany';

const PROPERTIES_OPTIONS = [
  { value: '0', name: 'None' },
  { value: '1', name: '1 - 4' },
  { value: '2', name: '5 - 9' },
  { value: '3', name: '10 - 19' },
  { value: '4', name: '20 - 29' },
  { value: '5', name: '30 - 39' },
  { value: '6', name: '40 - 49' },
  { value: '7', name: '50 - 99' },
  { value: '8', name: '100 - 199' },
  { value: '9', name: '200 - 499' },
  { value: '10', name: '500 - 1000' },
  { value: '11', name: '1000' },
];

const EMPLOYEES_OPTIONS = [
  { value: '0', name: 'None' },
  { value: '1', name: '1 - 5' },
  { value: '2', name: '6 - 10' },
  { value: '3', name: '11 - 20' },
  { value: '4', name: '21 - 50' },
  { value: '5', name: '51 - 100' },
  { value: '6', name: '100' },
];

const YEARS_OPTIONS = [
  { value: '0', name: 'None' },
  { value: '1', name: '1 - 2' },
  { value: '2', name: '3 - 5' },
  { value: '3', name: '6 - 10' },
  { value: '4', name: '10' },
];

const CompanyStatsSelects = ({
  values,
  onChange,
  errors,
  touched,
  canUpdate,
}) => {
  const { t } = useTranslation();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={4}>
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
          Number Of Properties <FieldIndicatorCompany type="ru" />
        </Typography>
        <FormControl
          fullWidth
          error={
            touched.NumberOfProperties && Boolean(errors.NumberOfProperties)
          }
        >
          <Select
            disabled={!canUpdate}
            name="NumberOfProperties"
            value={values.NumberOfProperties}
            label=""
            onChange={(e) => onChange('NumberOfProperties', e.target.value)}
          >
            {PROPERTIES_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.name)}
              </MenuItem>
            ))}
          </Select>
          {touched.NumberOfProperties && errors.NumberOfProperties && (
            <FormHelperText>{t(errors.NumberOfProperties)}</FormHelperText>
          )}
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
          Number Of Employees <FieldIndicatorCompany type="ru" />
        </Typography>
        <FormControl
          fullWidth
          error={touched.NumberOfEmployees && Boolean(errors.NumberOfEmployees)}
        >
          <Select
            disabled={!canUpdate}
            name="NumberOfEmployees"
            value={values.NumberOfEmployees}
            label=""
            onChange={(e) => onChange('NumberOfEmployees', e.target.value)}
          >
            {EMPLOYEES_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.name)}
              </MenuItem>
            ))}
          </Select>
          {touched.NumberOfEmployees && errors.NumberOfEmployees && (
            <FormHelperText>{t(errors.NumberOfEmployees)}</FormHelperText>
          )}
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
          Years In Business <FieldIndicatorCompany type="ru" />
        </Typography>
        <FormControl
          fullWidth
          error={touched.YearsInBusiness && Boolean(errors.YearsInBusiness)}
        >
          <Select
            disabled={!canUpdate}
            name="YearsInBusiness"
            value={values.YearsInBusiness}
            label=""
            onChange={(e) => onChange('YearsInBusiness', e.target.value)}
          >
            {YEARS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.name)}
              </MenuItem>
            ))}
          </Select>
          {touched.YearsInBusiness && errors.YearsInBusiness && (
            <FormHelperText>{t(errors.YearsInBusiness)}</FormHelperText>
          )}
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default CompanyStatsSelects;
