import { Button, FormControl, MenuItem, Select, Stack, Typography } from '@mui/material';
import { TEAM_T } from './teamHubTokens';

type TeamHubPaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  itemLabel?: string;
};

export function TeamHubPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
  itemLabel = 'éléments',
}: TeamHubPaginationProps) {
  if (total <= 0) return null;

  const from = page * limit + 1;
  const to = Math.min((page + 1) * limit, total);
  const canPrev = page > 0;
  const canNext = (page + 1) * limit < total;

  return (
    <Stack
      direction="row"
      sx={{
        mt: 1.5,
        pt: 1.5,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        borderTop: `1px solid ${TEAM_T.border}`,
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: TEAM_T.text3 }}>
        {from}–{to} sur {total} {itemLabel}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {onLimitChange ? (
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(0);
              }}
              sx={{ fontSize: 12.5 }}
            >
              {limitOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {n} / page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
        <Button
          size="small"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          sx={{ textTransform: 'none', color: TEAM_T.text2 }}
        >
          ← Précédent
        </Button>
        <Button
          size="small"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          sx={{ textTransform: 'none', color: TEAM_T.text2 }}
        >
          Suivant →
        </Button>
      </Stack>
    </Stack>
  );
}

export default TeamHubPagination;
