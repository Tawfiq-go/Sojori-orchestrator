import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  type PricingBookingWindowRule,
  type PricingEventRule,
  type PricingMonthRule,
  type PricingOccupancyRule,
  type PricingProfile,
  type PricingStayRule,
  type PricingWeekdayRule,
} from '../../data/catalogueMock';
import { Panel, btnGhostSx, btnPrimarySx, tokens as t } from '../dashboard/DashboardV2.components';

type RulesTab = 'month' | 'weekday' | 'events' | 'occupancy' | 'longstay' | 'lastminute';

interface PricingRulesEditorProps {
  profile: PricingProfile;
  onChange: (profile: PricingProfile) => void;
  onSave: () => void;
  onClose: () => void;
  initialTab?: RulesTab;
}

const tabs: Array<{ key: RulesTab; label: string }> = [
  { key: 'month', label: 'Month Wise' },
  { key: 'weekday', label: 'Weekday' },
  { key: 'events', label: 'Events' },
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'longstay', label: 'Long Stay' },
  { key: 'lastminute', label: 'Last Minute' },
];

const cardSx = {
  p: 2,
  borderRadius: '10px',
  border: `1px solid ${t.border}`,
  bgcolor: t.bg0,
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      label={label}
      size="small"
      type="number"
      fullWidth
      value={value}
      onChange={(event) => onChange(Number(event.target.value || 0))}
    />
  );
}

function MonthRulesPanel({
  items,
  onChange,
}: {
  items: PricingMonthRule[];
  onChange: (items: PricingMonthRule[]) => void;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {items.map((item, index) => (
        <Box key={item.key} sx={cardSx}>
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.label}</Typography>
              <Switch
                size="small"
                checked={item.enabled}
                onChange={(event) =>
                  onChange(
                    items.map((rule, ruleIndex) =>
                      ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                    ),
                  )
                }
              />
            </Stack>
            <NumberField
              label="Modificateur %"
              value={item.value}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, value } : rule)),
                )
              }
            />
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function WeekdayRulesPanel({
  items,
  onChange,
}: {
  items: PricingWeekdayRule[];
  onChange: (items: PricingWeekdayRule[]) => void;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
      {items.map((item, index) => (
        <Box key={item.key} sx={cardSx}>
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.label}</Typography>
              <Switch
                size="small"
                checked={item.enabled}
                onChange={(event) =>
                  onChange(
                    items.map((rule, ruleIndex) =>
                      ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                    ),
                  )
                }
              />
            </Stack>
            <NumberField
              label="Modificateur %"
              value={item.value}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, value } : rule)),
                )
              }
            />
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function EventRulesPanel({
  items,
  onChange,
}: {
  items: PricingEventRule[];
  onChange: (items: PricingEventRule[]) => void;
}) {
  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Box key={item.id} sx={cardSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 1.5 }}>
            <TextField
              label="Nom"
              size="small"
              value={item.name}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, name: event.target.value } : rule)),
                )
              }
            />
            <TextField
              label="Début"
              size="small"
              type="date"
              value={item.startDate}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, startDate: event.target.value } : rule)),
                )
              }
            />
            <TextField
              label="Fin"
              size="small"
              type="date"
              value={item.endDate}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, endDate: event.target.value } : rule)),
                )
              }
            />
            <TextField
              label="Type"
              size="small"
              select
              value={item.mode}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, mode: event.target.value as PricingEventRule['mode'] } : rule,
                  ),
                )
              }
            >
              <MenuItem value="increase">Increase</MenuItem>
              <MenuItem value="decrease">Decrease</MenuItem>
            </TextField>
            <NumberField
              label="%"
              value={item.modifierPct}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, modifierPct: value } : rule)),
                )
              }
            />
            <Stack sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Switch
                size="small"
                checked={item.enabled}
                onChange={(event) =>
                  onChange(
                    items.map((rule, ruleIndex) =>
                      ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                    ),
                  )
                }
              />
              <Button color="error" onClick={() => onChange(items.filter((rule) => rule.id !== item.id))}>
                Suppr.
              </Button>
            </Stack>
          </Box>
        </Box>
      ))}
      <Button
        sx={btnGhostSx}
        onClick={() =>
          onChange([
            ...items,
            {
              id: `event-${Date.now()}`,
              name: 'Nouvel événement',
              startDate: '2026-06-01',
              endDate: '2026-06-03',
              mode: 'increase',
              modifierPct: 20,
              minStay: 2,
              enabled: true,
            },
          ])
        }
      >
        + Ajouter événement
      </Button>
    </Stack>
  );
}

function OccupancyRulesPanel({
  items,
  onChange,
}: {
  items: PricingOccupancyRule[];
  onChange: (items: PricingOccupancyRule[]) => void;
}) {
  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Box key={item.id} sx={cardSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 1.5 }}>
            <NumberField
              label="Min occupancy"
              value={item.minOccupancy}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, minOccupancy: value } : rule)),
                )
              }
            />
            <NumberField
              label="Max occupancy"
              value={item.maxOccupancy}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, maxOccupancy: value } : rule)),
                )
              }
            />
            <TextField
              label="Type"
              size="small"
              select
              value={item.mode}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, mode: event.target.value as PricingOccupancyRule['mode'] } : rule,
                  ),
                )
              }
            >
              <MenuItem value="increase">Increase</MenuItem>
              <MenuItem value="decrease">Decrease</MenuItem>
            </TextField>
            <NumberField
              label="%"
              value={item.modifierPct}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, modifierPct: value } : rule)),
                )
              }
            />
            <Switch
              size="small"
              checked={item.enabled}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                  ),
                )
              }
            />
            <Button color="error" onClick={() => onChange(items.filter((rule) => rule.id !== item.id))}>
              Suppr.
            </Button>
          </Box>
        </Box>
      ))}
      <Button
        sx={btnGhostSx}
        onClick={() =>
          onChange([
            ...items,
            {
              id: `occupancy-${Date.now()}`,
              minOccupancy: 40,
              maxOccupancy: 60,
              mode: 'increase',
              modifierPct: 8,
              enabled: true,
            },
          ])
        }
      >
        + Ajouter règle occupation
      </Button>
    </Stack>
  );
}

function StayRulesPanel({
  items,
  onChange,
  label,
}: {
  items: PricingStayRule[];
  onChange: (items: PricingStayRule[]) => void;
  label: string;
}) {
  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Box key={item.id} sx={cardSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 1.5 }}>
            <NumberField
              label="Min"
              value={item.minNights}
              onChange={(value) =>
                onChange(items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, minNights: value } : rule)))
              }
            />
            <NumberField
              label="Max"
              value={item.maxNights}
              onChange={(value) =>
                onChange(items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, maxNights: value } : rule)))
              }
            />
            <TextField
              label="Type"
              size="small"
              select
              value={item.mode}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, mode: event.target.value as PricingStayRule['mode'] } : rule,
                  ),
                )
              }
            >
              <MenuItem value="increase">Increase</MenuItem>
              <MenuItem value="decrease">Decrease</MenuItem>
            </TextField>
            <NumberField
              label="%"
              value={item.modifierPct}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, modifierPct: value } : rule)),
                )
              }
            />
            <Switch
              size="small"
              checked={item.enabled}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                  ),
                )
              }
            />
            <Button color="error" onClick={() => onChange(items.filter((rule) => rule.id !== item.id))}>
              Suppr.
            </Button>
          </Box>
        </Box>
      ))}
      <Button
        sx={btnGhostSx}
        onClick={() =>
          onChange([
            ...items,
            {
              id: `${label}-${Date.now()}`,
              minNights: label === 'long' ? 7 : 0,
              maxNights: label === 'long' ? 14 : 5,
              mode: 'decrease',
              modifierPct: 10,
              enabled: true,
            },
          ])
        }
      >
        + Ajouter règle
      </Button>
    </Stack>
  );
}

function BookingWindowRulesPanel({
  items,
  onChange,
}: {
  items: PricingBookingWindowRule[];
  onChange: (items: PricingBookingWindowRule[]) => void;
}) {
  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Box key={item.id} sx={cardSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 1.5 }}>
            <NumberField
              label="Min jours avant"
              value={item.minDaysBefore}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, minDaysBefore: value } : rule)),
                )
              }
            />
            <NumberField
              label="Max jours avant"
              value={item.maxDaysBefore}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, maxDaysBefore: value } : rule)),
                )
              }
            />
            <TextField
              label="Type"
              size="small"
              select
              value={item.mode}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, mode: event.target.value as PricingBookingWindowRule['mode'] } : rule,
                  ),
                )
              }
            >
              <MenuItem value="increase">Increase</MenuItem>
              <MenuItem value="decrease">Decrease</MenuItem>
            </TextField>
            <NumberField
              label="%"
              value={item.modifierPct}
              onChange={(value) =>
                onChange(
                  items.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, modifierPct: value } : rule)),
                )
              }
            />
            <Switch
              size="small"
              checked={item.enabled}
              onChange={(event) =>
                onChange(
                  items.map((rule, ruleIndex) =>
                    ruleIndex === index ? { ...rule, enabled: event.target.checked } : rule,
                  ),
                )
              }
            />
            <Button color="error" onClick={() => onChange(items.filter((rule) => rule.id !== item.id))}>
              Suppr.
            </Button>
          </Box>
        </Box>
      ))}
      <Button
        sx={btnGhostSx}
        onClick={() =>
          onChange([
            ...items,
            {
              id: `window-${Date.now()}`,
              minDaysBefore: 0,
              maxDaysBefore: 7,
              mode: 'decrease',
              modifierPct: 12,
              enabled: true,
            },
          ])
        }
      >
        + Ajouter règle booking window
      </Button>
    </Stack>
  );
}

export function PricingRulesEditor({
  profile,
  onChange,
  onSave,
  onClose,
  initialTab = 'month',
}: PricingRulesEditorProps) {
  const [activeTab, setActiveTab] = useState<RulesTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeCount = useMemo(() => {
    return [
      ...profile.monthRules.filter((item) => item.enabled),
      ...profile.weekdayRules.filter((item) => item.enabled),
      ...profile.events.filter((item) => item.enabled),
      ...profile.occupancyRules.filter((item) => item.enabled),
      ...profile.longStayRules.filter((item) => item.enabled),
      ...profile.lastMinuteRules.filter((item) => item.enabled),
    ].length;
  }, [profile]);

  return (
    <>
      <DialogTitle>Pricing Rules Editor</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: t.text2, mb: 2 }}>
          6 familles de règles configurables avec sauvegarde mock. Les pourcentages positifs
          augmentent le prix, les négatifs le réduisent.
        </Typography>

        <Panel sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  ...btnGhostSx,
                  ...(activeTab === tab.key ? { bgcolor: t.primaryTint, borderColor: t.primary } : {}),
                }}
              >
                {tab.label}
              </Button>
            ))}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                {activeCount} règles actives
              </Typography>
            </Box>
          </Stack>
        </Panel>

        {activeTab === 'month' && (
          <MonthRulesPanel
            items={profile.monthRules}
            onChange={(items) => onChange({ ...profile, monthRules: items })}
          />
        )}
        {activeTab === 'weekday' && (
          <WeekdayRulesPanel
            items={profile.weekdayRules}
            onChange={(items) => onChange({ ...profile, weekdayRules: items })}
          />
        )}
        {activeTab === 'events' && (
          <EventRulesPanel
            items={profile.events}
            onChange={(items) => onChange({ ...profile, events: items })}
          />
        )}
        {activeTab === 'occupancy' && (
          <OccupancyRulesPanel
            items={profile.occupancyRules}
            onChange={(items) => onChange({ ...profile, occupancyRules: items })}
          />
        )}
        {activeTab === 'longstay' && (
          <StayRulesPanel
            label="long"
            items={profile.longStayRules}
            onChange={(items) => onChange({ ...profile, longStayRules: items })}
          />
        )}
        {activeTab === 'lastminute' && (
          <BookingWindowRulesPanel
            items={profile.lastMinuteRules}
            onChange={(items) => onChange({ ...profile, lastMinuteRules: items })}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button sx={btnGhostSx} onClick={onClose}>
          Fermer
        </Button>
        <Button sx={btnPrimarySx} onClick={onSave}>
          Sauvegarder
        </Button>
      </DialogActions>
    </>
  );
}
