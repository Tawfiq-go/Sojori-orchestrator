import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Switch,
  FormControlLabel,
  Typography,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import {
  fetchWatchList,
  updateWatchList,
} from '../../services/serverApi.watchField';

export default function FieldWatchConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [reservationEnabled, setReservationEnabled] = useState(true);
  const [taskEnabled, setTaskEnabled] = useState(true);
  const [reservationFields, setReservationFields] = useState([]);
  const [taskFields, setTaskFields] = useState([]);

  const reservationSuggestions = useMemo(
    () => [
      'source',
      'minutEvent',
      'channelName',
      'guestName',
      'guestFirstName',
      'guestLastName',
      'guestAddress',
      'guestCity',
      'guestCountry',
      'nationality',
      'guestEmail',
      'numberOfGuests',
      'adults',
      'children',
      'infants',
      'pets',
      'arrivalDate',
      'departureDate',
      'checkInTime',
      'checkOutTime',
      'nights',
      'phone',
      'totalPrice',
      'currency',
      'status',
      'timeLine',
      'paymentStatus',
      'cancellationDate',
      'cancelledBy',
      'sojoriId',
      'roomTypeId',
      'guestsRegistrationStatus',
      'detailedStatuses',
      'guestGroup',
      'atSojori',
      'guestLanguage',
      'registeredBy',
      'guestRegistration',
      'reservationNumber',
      'owner_number',
      'owner_valid',
      'traveller_numbers',
      'registration_numbers',
      'notes',
      'otaCommission',
      'confirmedCheckInTime',
      'confirmedCheckOutTime',
      'checkinStatus',
      'updateLanguageByAi',
      'ownerId',
      'comments',
      'reservationBreakdown',
      'mapping',
      'costs',
      'cancellationPolicyInfo',
      'priceBreakdown',
      'taxesAndFees',
      'sojoriPriceTotal',
      'sojoriTaxTotal',
      'sojoriTotal',
    ],
    [],
  );

  const taskSuggestions = useMemo(
    () => [
      'name',
      'type',
      'subType',
      'TS',
      'TS_SEL',
      'TS_VAL',
      'startDate',
      'endDate',
      'status',
      'assignmentStatus',
      'taskStatus',
      'staffId',
      'price',
      'paid',
      'paymentMode',
      'listingId',
      'reservationId',
      'roomTypeId',
      'reservationNumber',
      'duration',
      'emergency',
      'presence',
      'descriptions',
      'images',
      'openaAiEmergency',
      'taskVerification',
      'TaskVerifiedItems',
      'ownerId',
      'requestPayment',
    ],
    [],
  );

  const [initial, setInitial] = useState(null);

  const fethData = async () => {
    try {
      setLoading(true);
      const res = await fetchWatchList();
      const data = res?.data || {};
      setReservationEnabled(Boolean(data.reservationEnabled));
      setTaskEnabled(Boolean(data.taskEnabled));
      setReservationFields(
        Array.isArray(data.reservationFields) ? data.reservationFields : [],
      );
      setTaskFields(Array.isArray(data.taskFields) ? data.taskFields : []);
      setError(null);
      setInitial({
        reservationEnabled: Boolean(data.reservationEnabled),
        taskEnabled: Boolean(data.taskEnabled),
        reservationFields: Array.isArray(data.reservationFields)
          ? data.reservationFields
          : [],
        taskFields: Array.isArray(data.taskFields) ? data.taskFields : [],
      });
    } catch (e) {
      setError((e && e.message) || 'Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fethData();
  }, []);

  const isDirty = useMemo(() => {
    if (!initial) return false;
    return (
      initial.reservationEnabled !== reservationEnabled ||
      initial.taskEnabled !== taskEnabled ||
      !shallowArrayEq(initial.reservationFields, reservationFields) ||
      !shallowArrayEq(initial.taskFields, taskFields)
    );
  }, [initial, reservationEnabled, taskEnabled, reservationFields, taskFields]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await updateWatchList({
        reservationEnabled,
        taskEnabled,
        reservationFields,
        taskFields,
      });
      const data = res?.data || {};
      setSuccess('Configuration saved.');
      setReservationEnabled(Boolean(data.reservationEnabled));
      setTaskEnabled(Boolean(data.taskEnabled));
      setReservationFields(
        Array.isArray(data.reservationFields) ? data.reservationFields : [],
      );
      setTaskFields(Array.isArray(data.taskFields) ? data.taskFields : []);
      setInitial({
        reservationEnabled: Boolean(data.reservationEnabled),
        taskEnabled: Boolean(data.taskEnabled),
        reservationFields: Array.isArray(data.reservationFields)
          ? data.reservationFields
          : [],
        taskFields: Array.isArray(data.taskFields) ? data.taskFields : [],
      });
    } catch (e) {
      setError((e && e.message) || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  // common icons
  const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
  const checkedIcon = <CheckBoxIcon fontSize="small" />;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center bg-white" >
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography variant="h6" className="text-gray-700 font-medium">
            Loading configuration…
          </Typography>
        </Stack>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ height: 'calc(100vh - 70px)' }}>
      <div className="p-4">
        {/* Actions */}
        <div className="flex justify-end gap-3 mb-4">
          <Button
            onClick={() => fethData()}
            disabled={saving}
            variant="outlined"
            className="!text-[#757575] !border-[#E0E0E0] !bg-white hover:!bg-gray-50 !px-8 !py-2.5 !text-sm !font-semibold !rounded-lg disabled:!bg-gray-100 disabled:!text-gray-400 disabled:!border-gray-200 !transition-all"
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="!text-white !bg-[#E6B022] hover:!bg-[#B8881A] disabled:!bg-gray-300 !px-8 !py-2.5 !text-sm !font-semibold !rounded-lg !shadow-md hover:!shadow-lg disabled:!shadow-none !transition-all"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <CircularProgress size={16} className="!text-white" />{' '}
                Saving…
              </span>
            ) : isDirty ? (
              'Save Changes'
            ) : (
              'All Changes Saved'
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Reservations */}
          <Card className="shadow-lg rounded-xl border-0 bg-white">
            <CardHeader
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl"
              title={
                <span className="text-white font-semibold text-lg">
                  Reservations
                </span>
              }
              subheader={
                <span className="text-blue-100 text-sm">
                  Configure watched fields for Reservation updates
                </span>
              }
            />
            <Divider />
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={reservationEnabled}
                      onChange={(e) =>
                        setReservationEnabled(e.target.checked)
                      }
                      color="primary"
                    />
                  }
                  label={
                    <span className="font-medium text-gray-700">
                      Enable Reservation Sockets
                    </span>
                  }
                />
                <div className="flex items-center gap-3">
                  <Box className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                    {reservationFields.length} field{reservationFields.length !== 1 ? 's' : ''}
                  </Box>
                  <Tooltip title="Select all suggestions">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setReservationFields(
                          selectAll(reservationFields, reservationSuggestions),
                        )
                      }
                      className="hover:bg-blue-50"
                    >
                      <SelectAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear all">
                    <IconButton
                      size="small"
                      onClick={() => setReservationFields([])}
                      className="hover:bg-red-50"
                    >
                      <ClearAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              <Autocomplete
                multiple
                freeSolo
                disableCloseOnSelect
                options={reservationSuggestions}
                value={reservationFields}
                isOptionEqualToValue={(opt, val) => opt === val}
                onChange={(_e, val) => setReservationFields(uniqueNormalized(val))}
                renderOption={(props, option, { selected }) => (
                  <li {...props} className="flex items-center hover:bg-blue-50">
                    <Checkbox
                      icon={icon}
                      checkedIcon={checkedIcon}
                      style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    <span className="text-sm">{option}</span>
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={`${option}-${index}`}
                      {...getTagProps({ index })}
                      label={option}
                      size="small"
                      className="!bg-blue-600 !text-white font-medium"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Reservation fields"
                    placeholder="Enter field names..."
                    size="small"
                    fullWidth
                  />
                )}
                ListboxProps={{ style: { maxHeight: 280 } }}
                filterSelectedOptions
                selectOnFocus
                clearOnBlur={false}
                handleHomeEndKeys
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.stopPropagation();
                }}
              />
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="shadow-lg rounded-xl border-0 bg-white">
            <CardHeader
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-xl"
              title={
                <span className="text-white font-semibold text-lg">Tasks</span>
              }
              subheader={
                <span className="text-purple-100 text-sm">
                  Configure watched fields for Task updates
                </span>
              }
            />
            <Divider />
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={taskEnabled}
                      onChange={(e) => setTaskEnabled(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <span className="font-medium text-gray-700">
                      Enable Task Sockets
                    </span>
                  }
                />
                <div className="flex items-center gap-3">
                  <Box className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">
                    {taskFields.length} field{taskFields.length !== 1 ? 's' : ''}
                  </Box>
                  <Tooltip title="Select all suggestions">
                    <IconButton
                      size="small"
                      onClick={() =>
                        setTaskFields(selectAll(taskFields, taskSuggestions))
                      }
                      className="hover:bg-purple-50"
                    >
                      <SelectAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear all">
                    <IconButton
                      size="small"
                      onClick={() => setTaskFields([])}
                      className="hover:bg-red-50"
                    >
                      <ClearAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              <Autocomplete
                multiple
                freeSolo
                disableCloseOnSelect
                options={taskSuggestions}
                value={taskFields}
                isOptionEqualToValue={(opt, val) => opt === val}
                onChange={(_e, val) => setTaskFields(uniqueNormalized(val))}
                renderOption={(props, option, { selected }) => (
                  <li {...props} className="flex items-center hover:bg-purple-50">
                    <Checkbox
                      icon={icon}
                      checkedIcon={checkedIcon}
                      style={{ marginRight: 8 }}
                      checked={selected}
                    />
                    <span className="text-sm">{option}</span>
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={`${option}-${index}`}
                      {...getTagProps({ index })}
                      label={option}
                      size="small"
                      className="!bg-purple-600 !text-white font-medium"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Task fields"
                    placeholder="Enter field names..."
                    size="small"
                    fullWidth
                  />
                )}
                ListboxProps={{ style: { maxHeight: 280 } }}
                filterSelectedOptions
                selectOnFocus
                clearOnBlur={false}
                handleHomeEndKeys
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.stopPropagation();
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toasts */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </div>
  );
}

// === Helpers ===
function shallowArrayEq(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function uniqueNormalized(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const v = String(raw || '').trim();
    if (!v) continue;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function selectAll(current, suggestions) {
  // merge, de-dupe, keep order: existing first, then the rest
  const set = new Set(current);
  const merged = [...current];
  for (const s of suggestions) if (!set.has(s)) merged.push(s);
  return merged;
}
