import React from 'react';
import { Paper, Box, Typography, FormControlLabel, Checkbox } from '@mui/material';

export const booleanMapFromGroups = (groups, t) => {
    const cats = NOTIFICATION_CATEGORIES(t);
    const allCodes = Object.values(cats).flatMap(c => c.options.map(o => o.value));

    const map = Object.fromEntries(allCodes.map(code => [code, false]));
    Object.values(groups || {}).forEach(arr =>
        (arr || []).forEach(code => { map[code] = true; })
    );
    return map;
};

// { code: boolean } -> groups
export const groupsFromBooleanMap = (boolMap, t) => {
    const cats = NOTIFICATION_CATEGORIES(t);
    const grouped = {};
    Object.entries(cats).forEach(([key, cfg]) => {
        grouped[key] = cfg.options
        .filter(o => Boolean(boolMap?.[o.value]))
        .map(o => o.value);
    });
    return grouped;
};

// Clés et libellés alignés sur le backend (srv-task getNotificationTypes).
export const NOTIFICATION_CATEGORIES = (t) => ({
  reservation: {
    label: t('Reservation'),
    options: [
      { label: 'Nouvelle réservation', value: 'reservation_new' },
      { label: 'Réservation annulée', value: 'reservation_cancelled' },
      { label: 'Réservation modifiée', value: 'reservation_modified' },
    ],
  },
  airbnb: {
    label: t('Airbnb Request & Lead'),
    options: [
      { label: 'Nouvelle demande Airbnb', value: 'airbnb_new_request' },
      { label: 'Nouveau lead Airbnb', value: 'lead_new' },
    ],
  },
  message_review: {
    label: t('Message & Review'),
    options: [
      { label: 'Message reçu', value: 'message_received' },
      { label: 'Message envoyé automatiquement', value: 'message_automated_sent' },
      { label: 'Nouvel avis', value: 'review_new' },
    ],
  },
  task: {
    label: t('Task'),
    options: [
      { label: 'Tâche créée par le client', value: 'task_createdByCustomer' },
    ],
  },
});

export default function NotificationsSection({ value, onChange, t = (x) => x }) {
  const cats = NOTIFICATION_CATEGORIES(t);

  const toggle = (catKey, optValue, checked) => {
    const current = value?.[catKey] || [];
    const next = checked ? [...new Set([...current, optValue])] : current.filter(v => v !== optValue);
    onChange({ ...value, [catKey]: next });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t('Notification :')}</Typography>

      {Object.entries(cats).map(([key, cfg]) => (
        <Box key={key} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{cfg.label}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {cfg.options.map(opt => (
              <FormControlLabel
                key={opt.value}
                control={
                  <Checkbox
                    checked={(value?.[key] || []).includes(opt.value)}
                    onChange={(_, c) => toggle(key, opt.value, c)}
                    size="small"
                    sx={{ p: 0.5 }}
                  />
                }
                label={<span style={{ fontSize: 13 }}>{opt.label}</span>}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
