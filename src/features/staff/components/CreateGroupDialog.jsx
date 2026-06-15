// pages/admin/groups/CreateGroupSidebar.jsx
import React, { useEffect, useMemo } from 'react';
import {
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Stack,
  Chip,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import routes, { buildFeatureRows } from '../../../routes';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  },
};

const StyledButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
});

const ACTIONS = [
  { key: 'get', label: 'View' },
  { key: 'update', label: 'Modify' },
  { key: 'create', label: 'Create' },
  { key: 'delete', label: 'Delete' },
];

const hasAction = (grants, feature, action) => {
  const arr = Array.isArray(grants) ? grants : [];
  return arr.some(
    (g) =>
      (g.feature === '*' || g.feature === feature) &&
      (g.actions?.includes('*') || g.actions?.includes(action)),
  );
};

const setAction = (grants, feature, action, value) => {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex((g) => g.feature === feature);
  if (i === -1) {
    if (value) next.push({ feature, actions: [action] });
    return next;
  }
  const set = new Set(next[i].actions || []);
  if (value) set.add(action);
  else set.delete(action);
  const updated = Array.from(set);
  if (updated.length === 0) next.splice(i, 1);
  else next[i] = { feature, actions: updated };
  return next;
};

const setRowAllLimited = (grants, feature, value, allowedKeys) => {
  const next = Array.isArray(grants) ? [...grants] : [];
  const i = next.findIndex((g) => g.feature === feature);
  if (value) {
    const all = Array.from(new Set(allowedKeys));
    if (i === -1) next.push({ feature, actions: all });
    else next[i] = { feature, actions: all };
  } else {
    if (i !== -1) next.splice(i, 1);
  }
  return next;
};

/**
 * @param {object} [ownerPicker] When set (admin creating a group for an owner), user must pick an owner.
 *   `{ loading: boolean, options: Array<{ _id: string, email?: string }> }`
 */
export default function CreateGroupSidebar({ open, onClose, onSubmit, ownerPicker = null }) {
  const { t } = useTranslation('common');
  const featureRows = useMemo(() => buildFeatureRows(routes, t, 'Owner'), [t]);

  // lock/unlock page scroll like AddSidebarTask
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const schema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().required(t('Name is required')),
        ...(ownerPicker
          ? { targetOwnerId: Yup.string().required(t('Owner is required')) }
          : {}),
      }),
    [t, ownerPicker],
  );

  const initialValues = {
    name: '',
    description: '',
    isAdminLevel: false,
    featureGrants: [],
    targetOwnerId: '',
  };

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1300,
          overflow: 'hidden',
        }}
      />

      {/* right sidebar */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 600,
          maxWidth: '100vw',
          backgroundColor: '#fff',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          zIndex: 1301,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GroupsIcon sx={{ fontSize: 28, color: 'white' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'white' }}>
                {t('Create New Group')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
                {t('Define permissions for your team members')}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)',
                transform: 'rotate(90deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <CloseIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        </div>

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={(vals, { setSubmitting }) => {
            const payload = {
              name: vals.name.trim(),
              description: vals.description.trim(),
              featureGrants: vals.isAdminLevel
                ? [{ feature: '*', actions: ['*'] }]
                : vals.featureGrants,
            };
            if (ownerPicker && vals.targetOwnerId) {
              payload.ownerId = vals.targetOwnerId;
            }
            Promise.resolve(onSubmit(payload)).finally(() =>
              setSubmitting(false),
            );
          }}
        >
          {({
            values,
            setFieldValue,
            handleChange,
            touched,
            errors,
            isSubmitting,
            submitForm,
          }) => {
            const disabledGrid = !!values.isAdminLevel;
            return (
              <>
                {/* body */}
                 <div
                   style={{
                     flex: 1,
                     overflowY: 'auto',
                     overflowX: 'hidden',
                     padding: 16,
                     scrollbarWidth: 'thin',
                     scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[100]}`,
                   }}
                >
                  <Form>
                    <Stack spacing={2}>
                      {ownerPicker ? (
                        <FormControl fullWidth size="small" error={Boolean(touched.targetOwnerId && errors.targetOwnerId)}>
                          <InputLabel id="create-group-owner-label">{t('Owner')}</InputLabel>
                          <Select
                            labelId="create-group-owner-label"
                            name="targetOwnerId"
                            label={t('Owner')}
                            value={values.targetOwnerId}
                            onChange={(e) => setFieldValue('targetOwnerId', e.target.value)}
                            disabled={ownerPicker.loading}
                          >
                            {(ownerPicker.options || []).map((o) => (
                              <MenuItem key={o._id} value={o._id}>
                                {o.email || o._id}
                              </MenuItem>
                            ))}
                          </Select>
                          {touched.targetOwnerId && errors.targetOwnerId ? (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                              {errors.targetOwnerId}
                            </Typography>
                          ) : null}
                        </FormControl>
                      ) : null}
                      <TextField
                        label={t('Name')}
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        error={Boolean(touched.name && errors.name)}
                        helperText={touched.name && errors.name}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label={t('Description')}
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        error={Boolean(
                          touched.description && errors.description,
                        )}
                        helperText={touched.description && errors.description}
                        fullWidth
                        size="small"
                      />

                      {/* <FormControlLabel
                        control={
                          <Checkbox
                            checked={values.isAdminLevel}
                            onChange={(_, v) =>
                              setFieldValue('isAdminLevel', v)
                            }
                          />
                        }
                        label={t('Admin-level access (all features & actions)')}
                      /> */}

                      <Box>
                        {/* <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Chip
                            size="small"
                            label={t('Fine-grained permissions')}
                          />
                          {disabledGrid && (
                            <Chip
                              size="small"
                              color="success"
                              label={t('Disabled by admin-level access')}
                            />
                          )}
                        </Stack> */}

                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: SOJORI_COLORS.gray[700],
                            mb: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <LockOpenIcon sx={{ fontSize: 18, color: SOJORI_COLORS.primary }} />
                          {t('Feature Permissions')}
                        </Typography>
                        <Table
                          size="small"
                          sx={{
                            '& th, & td': { whiteSpace: 'nowrap' },
                            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
                            borderRadius: 2,
                          }}
                        >
                          <TableHead>
                            <TableRow
                              sx={{
                                bgcolor: SOJORI_COLORS.gray[100],
                              }}
                            >
                              <TableCell
                                sx={{
                                  fontWeight: 700,
                                  color: SOJORI_COLORS.gray[700],
                                  fontSize: '0.85rem',
                                }}
                              />
                              {ACTIONS.map((a) => (
                                <TableCell
                                  key={a.key}
                                  align="center"
                                  sx={{
                                    fontWeight: 700,
                                    color: SOJORI_COLORS.gray[700],
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {a.label}
                                </TableCell>
                              ))}
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: 700,
                                  color: SOJORI_COLORS.primary,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {t('All')}
                              </TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {featureRows.map((row, idx) => {
                              if (row.kind === 'section') {
                                return (
                                  <TableRow
                                    key={`sec-${row.key}-${idx}`}
                                    sx={{ bgcolor: 'action.hover' }}
                                  >
                                    <TableCell
                                      sx={{ fontWeight: 700 }}
                                      colSpan={ACTIONS.length + 2}
                                    >
                                      {row.label}
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              const allowed = new Set(
                                row.allowedActions || ACTIONS.map((a) => a.key),
                              );
                              const supportedKeys = ACTIONS.map(
                                (a) => a.key,
                              ).filter((k) => allowed.has(k));

                              const allChecked =
                                supportedKeys.length > 0 &&
                                supportedKeys.every((k) =>
                                  hasAction(
                                    values.featureGrants,
                                    row.featureKey,
                                    k,
                                  ),
                                );
                              const someChecked = supportedKeys.some((k) =>
                                hasAction(
                                  values.featureGrants,
                                  row.featureKey,
                                  k,
                                ),
                              );

                              return (
                                <TableRow
                                  key={`feat-${row.featureKey}-${idx}`}
                                  hover
                                >
                                  <TableCell
                                    sx={{
                                      fontWeight: 600,
                                      pl: row.indent ? 4 : 2,
                                    }}
                                  >
                                    {row.label}
                                  </TableCell>

                                  {ACTIONS.map((a) => {
                                    const supported = allowed.has(a.key);
                                    return (
                                      <TableCell key={a.key} align="center">
                                        {supported ? (
                                          <Checkbox
                                            size="small"
                                            checked={hasAction(
                                              values.featureGrants,
                                              row.featureKey,
                                              a.key,
                                            )}
                                            disabled={disabledGrid}
                                            onChange={(_, v) =>
                                              setFieldValue(
                                                'featureGrants',
                                                setAction(
                                                  values.featureGrants,
                                                  row.featureKey,
                                                  a.key,
                                                  v,
                                                ),
                                              )
                                            }
                                          />
                                        ) : (
                                          <Box
                                            sx={{ color: 'text.disabled' }}
                                          />
                                        )}
                                      </TableCell>
                                    );
                                  })}

                                  <TableCell align="center">
                                    <Checkbox
                                      size="small"
                                      checked={allChecked}
                                      indeterminate={!allChecked && someChecked}
                                      disabled={
                                        disabledGrid ||
                                        supportedKeys.length === 0
                                      }
                                      onChange={(_, v) =>
                                        setFieldValue(
                                          'featureGrants',
                                          setRowAllLimited(
                                            values.featureGrants,
                                            row.featureKey,
                                            v,
                                            supportedKeys,
                                          ),
                                        )
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    </Stack>
                  </Form>
                </div>

                {/* footer */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '20px 24px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{
                      flex: 1,
                      height: 44,
                      borderRadius: 2,
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        backgroundColor: '#f9fafb',
                      },
                    }}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={submitForm}
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      flex: 1,
                      height: 44,
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      backgroundColor: SOJORI_COLORS.primary,
                      '&:hover': {
                        backgroundColor: SOJORI_COLORS.primaryDark,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 16px rgba(255, 107, 53, 0.3)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isSubmitting ? t('Saving...') : t('Create Group')}
                  </Button>
                </div>
              </>
            );
          }}
        </Formik>
      </div>
    </>
  );
}
