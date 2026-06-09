import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { OtaAdvancedSearch, OtaChannelFilter, OtaFilterCounts } from './otaThreadFilters';

interface OtaInboxFiltersProps {
  channelFilter: OtaChannelFilter;
  counts: OtaFilterCounts;
  onChannelFilterChange: (f: OtaChannelFilter) => void;
  unrepliedOnly: boolean;
  onUnrepliedOnlyChange: (on: boolean) => void;
  advanced: OtaAdvancedSearch;
  onAdvancedChange: (s: OtaAdvancedSearch) => void;
  onAdvancedSubmit: () => void;
  onAdvancedReset: () => void;
  serverSearchActive?: boolean;
  loading?: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  searchResultCount?: number | null;
  onToutReset?: () => void;
  unrepliedSearchActive?: boolean;
}

const CHANNEL_TABS: Array<{ id: OtaChannelFilter; label: string; emoji?: string }> = [
  { id: 'ota', label: 'OTAs', emoji: '🌐' },
  { id: 'ab', label: 'Airbnb', emoji: '🏠' },
  { id: 'bk', label: 'Booking' },
  { id: 'direct', label: 'Direct', emoji: '◎' },
];

export default function OtaInboxFilters({
  channelFilter,
  counts,
  onChannelFilterChange,
  unrepliedOnly,
  onUnrepliedOnlyChange,
  advanced,
  onAdvancedChange,
  onAdvancedSubmit,
  onAdvancedReset,
  serverSearchActive,
  loading,
  expanded,
  onToggleExpanded,
  searchResultCount,
  onToutReset,
  unrepliedSearchActive,
}: OtaInboxFiltersProps) {
  const toutActive = channelFilter === 'all' && !unrepliedOnly && !serverSearchActive && !unrepliedSearchActive;

  return (
    <Box sx={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
      {/* Ligne 1 — Tout | Non répondu | Filtre avancé */}
      <Box sx={{ px: '10px', pt: '8px', pb: '6px' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
          <FilterChip
            label="Tout"
            count={counts.all}
            active={toutActive}
            compact
            onClick={() => {
              if (onToutReset) onToutReset();
              else {
                onChannelFilterChange('all');
                onUnrepliedOnlyChange(false);
              }
            }}
          />
          <FilterChip
            label="Non rép."
            count={counts.unreplied}
            active={unrepliedOnly || !!unrepliedSearchActive}
            urgent={counts.unreplied > 0}
            compact
            onClick={() => onUnrepliedOnlyChange(!unrepliedOnly)}
          />
          <Box
            component="button"
            type="button"
            onClick={onToggleExpanded}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 0.25,
              px: '4px',
              py: '6px',
              border: `1px solid ${expanded || serverSearchActive ? T.primary : T.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 10,
              fontWeight: expanded || serverSearchActive ? 700 : 600,
              color: expanded || serverSearchActive ? T.primaryDeep : T.text2,
              bgcolor: expanded || serverSearchActive ? T.primaryTint : T.bg1,
              transition: 'all 0.15s',
              minWidth: 0,
              '&:hover': { bgcolor: T.primaryTint },
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>Avancé {expanded ? '▲' : '▼'}</span>
            {serverSearchActive && !expanded && searchResultCount != null && (
              <CountPill value={searchResultCount} active compact />
            )}
          </Box>
        </Box>
      </Box>

      {/* Panneau avancé (overlay compact, ne pousse pas toute la liste) */}
      {expanded && (
        <Box sx={{ px: '10px', pb: '6px' }}>
          <Box
            sx={{
              p: '8px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              bgcolor: T.bg1,
              maxHeight: 200,
              overflowY: 'scroll',
              overscrollBehavior: 'contain',
            }}
            className="ota-inbox-advanced-scroll"
          >
            <AdvancedForm
              advanced={advanced}
              onAdvancedChange={onAdvancedChange}
              onAdvancedSubmit={onAdvancedSubmit}
              onAdvancedReset={onAdvancedReset}
              loading={loading}
            />
          </Box>
        </Box>
      )}

      {/* Ligne 2 — Canaux */}
      <Box sx={{ px: '10px', pb: '8px' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
          }}
        >
          {CHANNEL_TABS.map((tab) => (
            <FilterChip
              key={tab.id}
              label={tab.label}
              emoji={tab.emoji}
              count={counts[tab.id]}
              active={channelFilter === tab.id && !unrepliedOnly}
              compact
              onClick={() => {
                onUnrepliedOnlyChange(false);
                onChannelFilterChange(channelFilter === tab.id ? 'all' : tab.id);
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function FilterChip({
  label,
  count,
  active,
  urgent,
  compact,
  emoji,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  urgent?: boolean;
  compact?: boolean;
  emoji?: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'center' : 'space-between',
        flexDirection: compact ? 'column' : 'row',
        gap: compact ? 0.25 : 0.5,
        px: compact ? '4px' : '10px',
        py: compact ? '6px' : '7px',
        border: `1px solid ${active ? T.primary : T.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: compact ? 10 : 11,
        fontWeight: active ? 700 : 600,
        color: active ? T.primaryDeep : urgent ? T.error : T.text2,
        bgcolor: active ? T.primaryTint : T.bg1,
        transition: 'all 0.15s',
        minWidth: 0,
        '&:hover': { bgcolor: active ? T.primaryTint : T.bg3 },
      }}
    >
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </span>
      {count != null && (
        <CountPill value={count} active={active} urgent={urgent && !active} compact={compact} />
      )}
    </Box>
  );
}

function CountPill({
  value,
  active,
  urgent,
  compact,
}: {
  value: number;
  active?: boolean;
  urgent?: boolean;
  compact?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: compact ? 8 : 9,
        fontWeight: 700,
        minWidth: compact ? 14 : 18,
        textAlign: 'center',
        px: 0.5,
        py: '1px',
        borderRadius: 999,
        bgcolor: active ? T.primary : urgent ? T.errorTint : T.bg3,
        color: active ? '#fff' : urgent ? T.error : T.text4,
        lineHeight: 1.2,
      }}
    >
      {value}
    </Box>
  );
}

function AdvancedForm({
  advanced,
  onAdvancedChange,
  onAdvancedSubmit,
  onAdvancedReset,
  loading,
}: {
  advanced: OtaAdvancedSearch;
  onAdvancedChange: (s: OtaAdvancedSearch) => void;
  onAdvancedSubmit: () => void;
  onAdvancedReset: () => void;
  loading?: boolean;
}) {
  return (
    <Stack gap={1}>
      <Field
        label="Réservation"
        placeholder="SJ-XXXX"
        value={advanced.reservationNumber || ''}
        onChange={(v) => onAdvancedChange({ ...advanced, reservationNumber: v || undefined })}
      />
      <Field
        label="Logement"
        placeholder="Nom du listing"
        value={advanced.listingName || ''}
        onChange={(v) => onAdvancedChange({ ...advanced, listingName: v || undefined })}
      />
      <Field
        label="Voyageur"
        placeholder="Nom ou prénom"
        value={advanced.guestName || ''}
        onChange={(v) => onAdvancedChange({ ...advanced, guestName: v || undefined })}
      />
      <Field
        label="Téléphone"
        placeholder="+212…"
        value={advanced.guestPhone || ''}
        onChange={(v) => onAdvancedChange({ ...advanced, guestPhone: v || undefined })}
      />
      <Field
        label="Dans les messages"
        placeholder="Mot-clé"
        value={advanced.messageText || ''}
        onChange={(v) => onAdvancedChange({ ...advanced, messageText: v || undefined })}
      />
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
          onAdvancedChange({ ...advanced, stayPeriod: v as OtaAdvancedSearch['stayPeriod'] })
        }
      />
      <Stack direction="row" gap={1}>
        <Field
          label="Arrivée dès"
          type="date"
          value={advanced.arrivalFrom || ''}
          onChange={(v) => onAdvancedChange({ ...advanced, arrivalFrom: v || undefined })}
        />
        <Field
          label="Jusqu'au"
          type="date"
          value={advanced.arrivalTo || ''}
          onChange={(v) => onAdvancedChange({ ...advanced, arrivalTo: v || undefined })}
        />
      </Stack>
      <SelectField
        label="Statut fil"
        value={advanced.messageStatus || ''}
        options={[
          { value: '', label: 'Tous' },
          { value: 'received', label: 'Non répondu' },
          { value: 'responded', label: 'Répondu' },
          { value: 'ignored', label: 'Ignoré' },
        ]}
        onChange={(v) =>
          onAdvancedChange({
            ...advanced,
            messageStatus: (v || undefined) as OtaAdvancedSearch['messageStatus'],
          })
        }
      />
      <Stack direction="row" gap={0.75} sx={{ pt: 0.5 }}>
        <Box
          component="button"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onAdvancedSubmit();
          }}
          disabled={loading}
          sx={{
            flex: 1,
            border: 0,
            borderRadius: '8px',
            py: '9px',
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
          onClick={onAdvancedReset}
          sx={{
            px: '12px',
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            py: '9px',
            cursor: 'pointer',
            bgcolor: T.bg2,
            color: T.text3,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Effacer
        </Box>
      </Stack>
    </Stack>
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
    <Box>
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
