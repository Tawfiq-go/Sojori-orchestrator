import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { WaAdvancedSearch, WaStayPeriod, WaReplyStatus } from './waThreadFilters';

type Props = {
  advanced: WaAdvancedSearch;
  onChange: (next: WaAdvancedSearch) => void;
  onSubmit: () => void;
  onReset: () => void;
  loading?: boolean;
  resultCount?: number | null;
};

export default function WaAdvancedSearchPanel({
  advanced,
  onChange,
  onSubmit,
  onReset,
  loading,
  resultCount,
}: Props) {
  return (
    <Box
      sx={{
        borderRadius: '8px',
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 300,
        overflow: 'hidden',
        mb: 0.5,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          p: '8px',
        }}
      >
        <Stack gap={1}>
          <Field
            label="Dans les messages"
            placeholder="Mot-clé dans le corps des messages"
            value={advanced.messageText || ''}
            onChange={(v) => onChange({ ...advanced, messageText: v || undefined })}
          />
          <Stack direction="row" gap={1}>
            <Field
              label="Voyageur"
              placeholder="Nom"
              value={advanced.guestName || ''}
              onChange={(v) => onChange({ ...advanced, guestName: v || undefined })}
            />
            <Field
              label="Téléphone"
              placeholder="+212…"
              value={advanced.guestPhone || ''}
              onChange={(v) => onChange({ ...advanced, guestPhone: v || undefined })}
            />
          </Stack>
          <Stack direction="row" gap={1}>
            <Field
              label="Réservation"
              placeholder="SJ-…"
              value={advanced.reservationNumber || ''}
              onChange={(v) => onChange({ ...advanced, reservationNumber: v || undefined })}
            />
            <Field
              label="Listing"
              placeholder="Nom du bien"
              value={advanced.listingName || ''}
              onChange={(v) => onChange({ ...advanced, listingName: v || undefined })}
            />
          </Stack>
          <SelectField
            label="Période séjour"
            value={advanced.stayPeriod || 'all'}
            options={[
              { value: 'all', label: 'Toutes les dates' },
              { value: 'future', label: 'À venir' },
              { value: 'current', label: 'En cours' },
              { value: 'past', label: 'Passées' },
            ]}
            onChange={(v) =>
              onChange({ ...advanced, stayPeriod: v as WaStayPeriod })
            }
          />
          <Stack direction="row" gap={1}>
            <Field
              label="Arrivée dès"
              type="date"
              value={advanced.arrivalFrom || ''}
              onChange={(v) => onChange({ ...advanced, arrivalFrom: v || undefined })}
            />
            <Field
              label="Jusqu'au"
              type="date"
              value={advanced.arrivalTo || ''}
              onChange={(v) => onChange({ ...advanced, arrivalTo: v || undefined })}
            />
          </Stack>
          <SelectField
            label="Statut fil"
            value={advanced.replyStatus || ''}
            options={[
              { value: '', label: 'Tous' },
              { value: 'unreplied', label: 'Non répondu' },
              { value: 'replied', label: 'Répondu' },
            ]}
            onChange={(v) =>
              onChange({ ...advanced, replyStatus: (v || undefined) as WaReplyStatus })
            }
          />
        </Stack>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          p: '8px',
          borderTop: `1px solid ${T.border}`,
          bgcolor: T.bg2,
        }}
      >
        {resultCount != null && (
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 650,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              mr: 'auto',
            }}
          >
            {resultCount} résultat{resultCount > 1 ? 's' : ''}
          </Typography>
        )}
        <Box
          component="button"
          type="button"
          onClick={onSubmit}
          disabled={loading}
          sx={{
            flex: resultCount != null ? undefined : 1,
            border: 0,
            borderRadius: '8px',
            px: '14px',
            py: '8px',
            cursor: loading ? 'wait' : 'pointer',
            bgcolor: T.primary,
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? 'Recherche…' : 'Rechercher'}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={onReset}
          sx={{
            px: '12px',
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            py: '8px',
            cursor: 'pointer',
            bgcolor: T.bg1,
            color: T.text3,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Effacer
        </Box>
      </Box>
    </Box>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: T.text4, mb: '3px' }}>{label}</Typography>
      <Box
        component="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${T.border}`,
          borderRadius: '7px',
          px: '10px',
          py: '7px',
          font: 'inherit',
          fontSize: 12,
          bgcolor: T.bg2,
          color: T.text,
          outline: 0,
          '&:focus': { borderColor: T.primary, boxShadow: `0 0 0 2px ${T.primaryTint}` },
          '&::placeholder': { color: T.text4 },
        }}
      />
    </Box>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: T.text4, mb: '3px' }}>{label}</Typography>
      <Box
        component="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: '100%',
          border: `1px solid ${T.border}`,
          borderRadius: '7px',
          px: '10px',
          py: '7px',
          font: 'inherit',
          fontSize: 12,
          bgcolor: T.bg2,
          color: T.text,
          outline: 0,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Box>
    </Box>
  );
}
