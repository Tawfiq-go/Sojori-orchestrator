import { useMemo, type ReactNode } from 'react';
import { Box, Button, Stack } from '@mui/material';

export type MonthOption = { key: string; label: string };

export type MonthPickerOptions = {
  current: MonthOption;
  future: MonthOption[];
  past: MonthOption[];
};

/** Options mois calendaires : courant + 12 futurs + 12 passés (même logique dashboard). */
export function buildMonthPickerOptions(now = new Date()): MonthPickerOptions {
  const mk = (offset: number): MonthOption => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
  };
  return {
    current: mk(0),
    future: Array.from({ length: 12 }, (_, i) => mk(i + 1)),
    past: Array.from({ length: 12 }, (_, i) => mk(-(i + 1))),
  };
}

export function monthLabelMap(options: MonthPickerOptions): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of [options.current, ...options.future, ...options.past]) {
    map.set(m.key, m.label);
  }
  return map;
}

/** Pas ±1 mois depuis la clé affichée ('' = mois courant). */
export function stepMonthKey(
  selectedMonth: string,
  delta: number,
  options: MonthPickerOptions,
  labelByKey: Map<string, string>,
): string | null {
  const base = selectedMonth || options.current.key;
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (!labelByKey.has(key)) return null;
  return key === options.current.key ? '' : key;
}

/** Plage calendaire YYYY-MM → 1er / dernier jour (local). */
export function calendarMonthRange(monthKey: string): { startDate: string; endDate: string } | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [y, m] = monthKey.split('-').map(Number);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    startDate: iso(new Date(y, m - 1, 1)),
    endDate: iso(new Date(y, m, 0)),
  };
}

export function MonthPickerChip({
  options,
  value,
  onChange,
  onStep,
}: {
  options: MonthPickerOptions;
  value: string;
  onChange: (key: string) => void;
  onStep: (delta: number) => void;
}): ReactNode {
  const stepSx = {
    border: '1.5px solid rgba(20,17,10,0.14)',
    bgcolor: '#fff',
    borderRadius: '99px',
    minWidth: 0,
    width: 30,
    height: 30,
    p: 0,
    fontSize: 14,
    fontWeight: 800,
    color: 'text.secondary',
    '&:hover': { borderColor: '#F4CF5E', bgcolor: 'rgba(244,207,94,0.14)', color: '#c79b22' },
  } as const;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Button sx={stepSx} onClick={() => onStep(-1)} aria-label="Mois précédent">
        ‹
      </Button>
      <Box
        component="select"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        aria-label="Choisir un mois"
        sx={{
          border: '1.5px solid',
          borderColor: value ? '#F4CF5E' : 'rgba(20,17,10,0.14)',
          bgcolor: value ? 'rgba(244,207,94,0.14)' : '#fff',
          color: value ? '#c79b22' : 'inherit',
          borderRadius: '99px',
          px: 1.75,
          py: 0.75,
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          cursor: 'pointer',
          appearance: 'none',
          maxWidth: 190,
        }}
      >
        <option value="">📅 {options.current.label} (en cours)</option>
        <optgroup label="📈 À venir — déjà réservé">
          {options.future.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="🕓 Mois passés">
          {options.past.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </optgroup>
      </Box>
      <Button sx={stepSx} onClick={() => onStep(1)} aria-label="Mois suivant">
        ›
      </Button>
    </Stack>
  );
}

/** Hook-friendly memo bundle for pages that need the picker. */
export function useMonthPickerState() {
  const options = useMemo(() => buildMonthPickerOptions(), []);
  const labelByKey = useMemo(() => monthLabelMap(options), [options]);
  return { options, labelByKey };
}
